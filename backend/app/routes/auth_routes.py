from flask import Blueprint, request, jsonify, make_response
from werkzeug.security import generate_password_hash, check_password_hash
import traceback, psycopg2, re, secrets, os
from ..config import db, Config
from ..services import create_access_token
from flask_mail import Message
from app import mail 
from ..services import Bitacora

auth_routes = Blueprint('auth_routes', __name__)

def validar_password(password):
    """Reglas de complejidad para contraseñas."""
    if len(password) < 8: return False, "Mínimo 8 caracteres."
    if not any(char.isupper() for char in password): return False, "Falta una mayúscula."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password): return False, "Falta un símbolo especial."
    return True, ""


# RUTAS DE AUTENTICACIÓN
@auth_routes.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json() or {}
        user_input = data.get('user_input')
        password = data.get('password')

        if not user_input or not password:
            return jsonify({'success': False, 'message': 'Ingrese su usuario y contraseña.'}), 400

        call_sql = f"CALL {Config.SCHEMA}.p_login_usuario(%s, NULL, NULL, NULL, NULL, NULL, NULL, NULL)"
        result = db.execute_query(call_sql, (user_input.strip(),), fetchone=True)

        if not result:
            Bitacora.registrar('LOGIN', 'LOGIN_FAILED', f'Usuario inexistente: {user_input}')
            return jsonify({'success': False, 'message': 'Usuario no encontrado.'}), 404

        u_id, p_id, u_name, u_hash, p_name, p_mail, r_id = result
        es_valida = check_password_hash(u_hash, password)

        db.execute_query(
            f"CALL {Config.SCHEMA}.p_registrar_intentos_login(%s, %s)",
            (u_id, es_valida),
            commit=True
        )

        if not es_valida:
            Bitacora.registrar('LOGIN', 'LOGIN_FAILED', f'Password errónea para: {u_name}', id_usuario=u_id)
            return jsonify({'success': False, 'message': 'Contraseña incorrecta.'}), 401

        # Crear sesión en DB
        sql_sesion = f"""
            INSERT INTO {Config.SCHEMA}.t_sesiones 
            (id_usuario, estado, ip_direccion) 
            VALUES (%s, 'ACTIVA', %s) 
            RETURNING id_sesion
        """
        res_sesion = db.execute_query(sql_sesion, (u_id, Bitacora._obtener_ip()), fetchone=True, commit=True)
        id_sesion_actual = res_sesion[0]

        Bitacora.registrar(
            'LOGIN',
            'LOGIN_SUCCESS',
            f'Sesión iniciada por {p_name}',
            id_usuario=u_id,
            id_sesion=id_sesion_actual
        )

        token = create_access_token(u_id, u_name, p_id, r_id, p_name)
        return jsonify({
            'success': True,
            'message': 'Bienvenido a Clínica Alba',
            'token': token,
            'user': {
                'id_usuario': u_id,
                'nombre': p_name,
                'id_persona': p_id,
                'rol': r_id,
                'id_sesion': id_sesion_actual
            }
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error interno: {str(e)}'}), 500


@auth_routes.route('/api/logout', methods=['POST'])
def logout():
    try:
        # silent=True evita el error 400/500 si el body viene vacío
        data = request.get_json(silent=True) or {}
        id_sesion = data.get('id_sesion')
        id_usuario = data.get('id_usuario')

        if id_sesion:
            sql = f"UPDATE {Config.SCHEMA}.t_sesiones SET estado = 'FINALIZADA', fecha_fin = NOW() WHERE id_sesion = %s"
            db.execute_query(sql, (id_sesion,), commit=True)
            Bitacora.registrar('LOGOUT', 'LOGOUT', 'Sesión cerrada por el usuario', id_usuario=id_usuario, id_sesion=id_sesion)

        response = make_response(jsonify({'success': True, 'message': 'Sesión cerrada'}))
        response.set_cookie('access_token', '', expires=0, httponly=True)
        return response
    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


# =========================================================
# RECUPERACIÓN DE CONTRASEÑA
# =========================================================

@auth_routes.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        token_plano = secrets.token_urlsafe(32)
        token_hash = generate_password_hash(token_plano)

        sql = f"CALL {Config.SCHEMA}.p_solicitar_recuperacion(%s, %s, %s, NULL, NULL)"
        result = db.execute_query(sql, (email, token_hash, Bitacora._obtener_ip()), fetchone=True, commit=True)
        
        if result and result[0]:
            u_id, u_name = result
            Bitacora.registrar('SECURIDAD', 'SOLICITUD_RECUPERACION', f'Solicitud enviada a: {email}', id_usuario=u_id)
            
            link = f"{Config.FRONTEND_URL}/reset-password?token={token_plano}&id={u_id}"
            msg = Message(subject="Recuperación - Clínica Alba", sender=Config.MAIL_DEFAULT_SENDER, recipients=[email])
            msg.body = f"Hola {u_name}, usa este enlace para restablecer tu cuenta: {link}"
            mail.send(msg)

        return jsonify({'success': True, 'message': 'Instrucciones enviadas al correo.'}), 200
    except Exception as e:
        traceback.print_exc()
        error_msg = str(e).split('CONTEXT:')[0] if 'CONTEXT:' in str(e) else str(e)
        return jsonify({'success': False, 'message': error_msg}), 500


@auth_routes.route('/api/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        u_id, token_plano, new_password = data.get('id'), data.get('token'), data.get('password')

        es_valida, msg_error = validar_password(new_password)
        if not es_valida: return jsonify({'success': False, 'message': msg_error}), 400

        sql_check = f"SELECT id_token, token_hash FROM {Config.SCHEMA}.t_token_recuperacion WHERE id_usuario = %s AND usado = FALSE"
        tokens = db.execute_query(sql_check, (u_id,), fetchall=True)
        
        token_id = next((t_id for t_id, t_hash in tokens if check_password_hash(t_hash, token_plano)), None)
        
        if not token_id: 
            Bitacora.registrar('SECURIDAD', 'CAMBIO_CONTRASEÑA_FALLIDO', 'Token inválido o expirado', id_usuario=u_id)
            return jsonify({'success': False, 'message': 'Enlace no válido o expirado.'}), 401

        new_hash = generate_password_hash(new_password)
        db.execute_query(f"CALL {Config.SCHEMA}.p_finalizar_recuperacion(%s, %s, %s)", (u_id, token_id, new_hash), commit=True)
        
        Bitacora.registrar('SECURIDAD', 'CAMBIO_CONTRASEÑA_EXITOSO', 'Contraseña restablecida con éxito', id_usuario=u_id)
        return jsonify({'success': True, 'message': 'Contraseña actualizada. Ya puede iniciar sesión.'}), 200
    except Exception as e: 
        return jsonify({'success': False, 'message': str(e)}), 500


# =========================================================
# REGISTRO Y VALIDACIÓN
# =========================================================

@auth_routes.route('/api/verify-ci/<int:ci>', methods=['GET'])
def verify_ci(ci):
    try:
        sql = f"SELECT nombre, tipo_persona FROM {Config.SCHEMA}.t_persona WHERE ci = %s"
        result = db.execute_query(sql, (ci,), fetchone=True)
        
        if not result:
            return jsonify({'success': True, 'exists': False}), 200
            
        nombre, tipo = result
        nombre_m = " ".join([p[0] + "*" * (len(p)-1) for p in nombre.split()])

        return jsonify({'success': True, 'exists': True, 'data': {'masked_name': nombre_m}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_routes.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json() or {}
        user_name = data.get('user')
        password = data.get('password')

        es_valida, msg_error = validar_password(password)
        if not es_valida: return jsonify({'success': False, 'message': msg_error}), 400

        pass_hash = generate_password_hash(password)
        
        sql = f"CALL {Config.SCHEMA}.p_registrar_usuario(%s, %s, %s, %s, %s, %s, %s, %s)"
        params = (user_name, data.get('ci'), data.get('name'), data.get('mail'), 
                  data.get('number'), data.get('birth'), data.get('dir'), pass_hash)
        db.execute_query(sql, params, commit=True)

        Bitacora.registrar('AUTH', 'REGISTER', f'Nuevo usuario creado: {user_name}')
        return jsonify({'success': True, 'message': '¡Registro exitoso!'}), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# =========================================================
# ESTADÍSTICAS Y SEGURIDAD DE PERFIL
# =========================================================

@auth_routes.route('/api/stats', methods=['GET'])
def get_stats():
    try:
        p = db.execute_query(f"SELECT COUNT(*) FROM {Config.SCHEMA}.t_persona WHERE tipo_persona = 'CLIENTE'", fetchone=True)
        e = db.execute_query(f"SELECT COUNT(*) FROM {Config.SCHEMA}.t_rol", fetchone=True)
        return jsonify({'success': True, 'stats': {'pacientes': p[0], 'especialidades': e[0]}})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@auth_routes.route('/api/usuarios/<int:id_usuario>/password', methods=['PUT'])
def cambiar_password(id_usuario):
    try:
        data = request.get_json()
        
        query = f'SELECT "contraseña" FROM {Config.SCHEMA}.t_usuario WHERE id_usuario = %s'
        res = db.execute_query(query, (id_usuario,), fetchone=True)
        
        if not res or not check_password_hash(res[0], data.get('password_actual')):
            Bitacora.registrar('SECURIDAD', 'CAMBIO_CONTRASEÑA_FALLIDO', 'Clave actual errónea', id_usuario=id_usuario)
            return jsonify({'success': False, 'message': 'Contraseña actual incorrecta'}), 401

        nuevo_hash = generate_password_hash(data.get('nueva_password'))
        db.execute_query(f'UPDATE {Config.SCHEMA}.t_usuario SET "contraseña" = %s WHERE id_usuario = %s', 
                         (nuevo_hash, id_usuario), commit=True)

        Bitacora.registrar('SECURIDAD', 'CAMBIO_CONTRASEÑA_EXITOSO', 'Cambio manual de contraseña', id_usuario=id_usuario)
        return jsonify({'success': True, 'message': 'Contraseña actualizada.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
# backend/app/routes/auth_routes.py

@auth_routes.route('/api/validate-token', methods=['POST'])
def validate_token():
    try:
        data = request.get_json()
        u_id = data.get('id')
        token_plano = data.get('token')

        if not u_id or not token_plano:
            return jsonify({'success': False, 'message': 'Parámetros incompletos.'}), 400

        # Buscamos tokens no usados para este usuario
        # También verificamos que no hayan pasado más de 2 horas (o el tiempo que definas)
        sql = f"""
            SELECT id_token, token_hash, fecha_expiracion 
            FROM {Config.SCHEMA}.t_token_recuperacion 
            WHERE id_usuario = %s AND usado = FALSE
        """
        tokens = db.execute_query(sql, (u_id,), fetchall=True)

        # Buscamos el token correcto comparando el hash
        token_valido = False
        for t_id, t_hash, t_exp in (tokens or []):
            if check_password_hash(t_hash, token_plano):
                # Opcional: Verificar fecha de expiración manualmente si no lo hace el SQL
                from datetime import datetime
                if t_exp > datetime.now():
                    token_valido = True
                    break

        if token_valido:
            return jsonify({'success': True, 'message': 'Token válido.'}), 200
        else:
            return jsonify({'success': False, 'message': 'El enlace ha expirado o es inválido.'}), 401

    except Exception as e:
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500
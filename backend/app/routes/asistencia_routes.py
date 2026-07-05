import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify
from ..config import db, Config
from ..classes.security import Security, admin_required
from ..services.bitacora import Bitacora

asistencia_routes = Blueprint('asistencia_routes', __name__)

# Diccionario global en memoria para guardar los tokens QR generados
# Estructura: { token_str: { "id_creador_qr": int, "expires_at": datetime } }
tokens_asistencia = {}

@asistencia_routes.route('/api/asistencia/generar-token', methods=['GET'])
@admin_required
def generar_token():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
    
    # Generar token único aleatorio
    token = secrets.token_hex(16)
    
    # Guardar en memoria con vigencia de 30 segundos
    expires_at = datetime.now() + timedelta(seconds=30)
    tokens_asistencia[token] = {
        "id_creador_qr": user["id_usuario"],
        "expires_at": expires_at
    }
    
    return jsonify({
        "success": True,
        "token": token,
        "expires_at": expires_at.isoformat()
    }), 200

@asistencia_routes.route('/api/asistencia/marcar', methods=['POST'])
def registrar_asistencia():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
    
    id_personal = user["id_persona"]
    id_usuario = user["id_usuario"]
    
    # Si no es un empleado válido (por ejemplo, es un paciente/cliente con rol 5 o 6)
    if user["rol"] not in (1, 2, 3, 4):
        return jsonify({"success": False, "message": "No autorizado para registrar asistencia"}), 403
        
    data = request.get_json() or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"success": False, "message": "Falta el token de asistencia"}), 400
        
    # Verificar token en memoria
    token_info = tokens_asistencia.get(token)
    if not token_info:
        return jsonify({"success": False, "message": "Código QR inválido o ya utilizado"}), 400
        
    if datetime.now() > token_info["expires_at"]:
        # Limpiar token expirado
        tokens_asistencia.pop(token, None)
        return jsonify({"success": False, "message": "El código QR ha expirado. Por favor, escanee de nuevo."}), 400
        
    # Consumir el token (Single-use)
    tokens_asistencia.pop(token)
    
    id_creador_qr = token_info["id_creador_qr"]
    
    # Determinar automáticamente si es ENTRADA o SALIDA basándonos en la última marca de hoy
    try:
        # Buscar última marca de hoy del empleado
        query_ultima = f"""
            SELECT tipo 
            FROM {Config.SCHEMA}.t_asistencia 
            WHERE id_personal = %s AND DATE(fecha_registro) = CURRENT_DATE
            ORDER BY fecha_registro DESC 
            LIMIT 1
        """
        res_ultima = db.execute_query(query_ultima, (id_personal,), fetchone=True)
        
        tipo = "ENTRADA"
        if res_ultima:
            tipo_anterior = res_ultima[0]
            tipo = "SALIDA" if tipo_anterior == "ENTRADA" else "ENTRADA"
            
        # Registrar asistencia en DB
        sql_insert = f"""
            INSERT INTO {Config.SCHEMA}.t_asistencia 
            (id_personal, id_creador_qr, tipo) 
            VALUES (%s, %s, %s)
            RETURNING id_asistencia, fecha_registro
        """
        res_insert = db.execute_query(sql_insert, (id_personal, id_creador_qr, tipo), fetchone=True, commit=True)
        
        # Registrar en bitácora
        Bitacora.registrar(
            "ADMINISTRACION", 
            f"ASISTENCIA_{tipo}", 
            f"Registro de {tipo} exitoso para el empleado ID {id_personal}",
            id_usuario=id_usuario
        )
        
        return jsonify({
            "success": True,
            "message": f"¡Marca registrada con éxito! Has marcado tu {tipo}.",
            "data": {
                "id_asistencia": res_insert[0],
                "tipo": tipo,
                "fecha_registro": res_insert[1].isoformat()
            }
        }), 201
        
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al registrar marca: {str(e)}"}), 500

@asistencia_routes.route('/api/asistencia/historial-personal', methods=['GET'])
def historial_personal():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
        
    id_personal = user["id_persona"]
    
    try:
        query = f"""
            SELECT id_asistencia, tipo, fecha_registro
            FROM {Config.SCHEMA}.t_asistencia
            WHERE id_personal = %s
            ORDER BY fecha_registro DESC
        """
        rows = db.execute_query(query, (id_personal,), fetchall=True) or []
        
        data = [{
            "id_asistencia": r[0],
            "tipo": r[1],
            "fecha_registro": r[2].strftime("%d/%m/%Y %H:%M:%S") if r[2] else None
        } for r in rows]
        
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@asistencia_routes.route('/api/asistencia/historial-global', methods=['GET'])
@admin_required
def historial_global():
    try:
        query = f"""
            SELECT 
                a.id_asistencia, 
                a.id_personal, 
                pe.nombre AS nombre_empleado,
                a.id_creador_qr,
                pc.nombre AS nombre_creador,
                a.tipo, 
                a.fecha_registro
            FROM {Config.SCHEMA}.t_asistencia a
            INNER JOIN {Config.SCHEMA}.t_persona pe ON a.id_personal = pe.id_persona
            LEFT JOIN {Config.SCHEMA}.t_usuario uc ON a.id_creador_qr = uc.id_usuario
            LEFT JOIN {Config.SCHEMA}.t_persona pc ON uc.id_persona = pc.id_persona
            ORDER BY a.fecha_registro DESC
        """
        rows = db.execute_query(query, fetchall=True) or []
        
        data = [{
            "id_asistencia": r[0],
            "id_personal": r[1],
            "nombre_empleado": r[2],
            "id_creador_qr": r[3],
            "nombre_creador": r[4] or "SISTEMA",
            "tipo": r[5],
            "fecha_registro": r[6].strftime("%d/%m/%Y %H:%M:%S") if r[6] else None
        } for r in rows]
        
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

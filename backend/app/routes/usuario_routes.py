from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import json
from ..config import db, Config
from ..classes.security import admin_required, Security,permission_required
usuario_routes = Blueprint('usuario_routes', __name__)
from ..services.bitacora import Bitacora

# LISTAR USUARIOS
# =========================================================

@usuario_routes.route('/api/usuarios', methods=['GET'])
@admin_required
@permission_required("visualizar_usuarios")
def listar_usuarios():
    try:
        query = """
            SELECT 
                u.id_usuario,
                u.nombre_usuario,
                u.correo,
                r.tipo_rol
            FROM clinica.t_usuario u
            INNER JOIN clinica.t_rol r ON u.id_rol = r.id_rol
            WHERE u.estado = true
            ORDER BY u.id_usuario ASC
        """

        rows = db.execute_query(query, fetchall=True)

        data = [{
            "id_usuario": r[0],
            "display": f"{r[1]} ({r[2]})", 
            "usuario": r[1],
            "correo": r[2],
            "rol": r[3]
        } for r in (rows or [])]

        return jsonify({"success": True, "data": data}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
# =========================================================
# CREAR USUARIO (ADMIN)
# =========================================================

@usuario_routes.route('/api/usuarios', methods=['POST'])
@admin_required
@permission_required("crear_usuario")
def crear_usuario():
    try:
        data = request.get_json() or {}

        user_name = data.get('user')
        ci = data.get('ci')
        name = data.get('name')
        mail = data.get('mail')
        number = data.get('number')
        birth = data.get('birth')
        dir = data.get('dir')
        password = data.get('password')
        id_rol = data.get('id_rol')

        if not all([user_name, ci, name, mail, password, id_rol]):
            return jsonify({"success": False, "message": "Datos incompletos"}), 400

        pass_hash = generate_password_hash(password)

        sql = f"""
            CALL {Config.SCHEMA}.p_crear_usuario_admin(
                %s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """

        params = (
            user_name, ci, name, mail,
            number, birth, dir,
            pass_hash, id_rol
        )

        db.execute_query(sql, params, commit=True)

        Bitacora.registrar("USUARIOS", "CREATE", f"Usuario creado: {user_name}")

        return jsonify({"success": True, "message": "Usuario creado"}), 201

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# ACTUALIZAR USUARIO
# =========================================================

@usuario_routes.route('/api/usuarios/<int:id_usuario>', methods=['PUT'])
@admin_required
@permission_required("modificar_usuario")
def actualizar_usuario(id_usuario):
    try:
        data = request.get_json() or {}

        campos = []
        valores = []

        if data.get('user'):
            campos.append("nombre_usuario = %s")
            valores.append(data['user'])

        if data.get('correo'):
            campos.append("correo = %s")
            valores.append(data['correo'])

        if not campos:
            return jsonify({"success": False, "message": "Nada para actualizar"}), 400

        query = f"""
            UPDATE clinica.t_usuario
            SET {', '.join(campos)}
            WHERE id_usuario = %s
        """

        valores.append(id_usuario)

        db.execute_query(query, tuple(valores), commit=True)

        Bitacora.registrar("USUARIOS", "UPDATE", f"Usuario actualizado {id_usuario}")

        return jsonify({"success": True, "message": "Usuario actualizado"}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# SOFT DELETE
# =========================================================
@usuario_routes.route('/api/roles', methods=['GET'])
@admin_required
@permission_required("modificar_usuario")
def listar_roles():
    try:
        query = """
            SELECT id_rol, tipo_rol
            FROM clinica.t_rol
            ORDER BY id_rol
        """

        rows = db.execute_query(query, fetchall=True)

        data = [{
            "id_rol": r[0],
            "rol": r[1]
        } for r in (rows or [])]

        return jsonify({"success": True, "data": data}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
@usuario_routes.route('/api/usuarios/<int:id_usuario>', methods=['DELETE'])
@admin_required
@permission_required("eliminar_usuario")
def eliminar_usuario(id_usuario):
    try:
        query = """
            UPDATE clinica.t_usuario
            SET estado = false
            WHERE id_usuario = %s
        """

        db.execute_query(query, (id_usuario,), commit=True)

        Bitacora.registrar("USUARIOS", "SOFT_DELETE", f"Usuario desactivado {id_usuario}")

        return jsonify({
            "success": True,
            "message": "Usuario desactivado correctamente"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    

@usuario_routes.route('/api/usuarios/asignar-rol', methods=['POST'])
@admin_required
@permission_required("asignar_roles")
def asignar_rol():
    try:
        data = request.get_json() or {}

        id_usuario = data.get('id_usuario')
        id_rol = data.get('id_rol')

        if not id_usuario or not id_rol:
            return jsonify({"success": False, "message": "Datos incompletos"}), 400

        # =========================
        # 1. CAMBIAR ROL
        # =========================
        db.execute_query("""
            UPDATE clinica.t_usuario
            SET id_rol = %s
            WHERE id_usuario = %s
        """, (id_rol, id_usuario), commit=True)

        # =========================
        # 2. LIMPIAR TODOS LOS PERMISOS DEL USUARIO
        # (RESET TOTAL)
        # =========================
        db.execute_query("""
            DELETE FROM clinica.t_usuario_permiso
            WHERE id_usuario = %s
        """, (id_usuario,), commit=True)

        # =========================
        # 3. INSERTAR PERMISOS DEL NUEVO ROL
        # =========================
        permisos = db.execute_query("""
            SELECT id_permiso
            FROM clinica.t_rol_permiso
            WHERE id_rol = %s
        """, (id_rol,), fetchall=True)

        for p in (permisos or []):
            db.execute_query("""
                INSERT INTO clinica.t_usuario_permiso (id_usuario, id_permiso, habilitado)
                VALUES (%s, %s, true)
            """, (id_usuario, p[0]), commit=True)

        return jsonify({
            "success": True,
            "message": "Rol actualizado y permisos reconstruidos"
        }), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
@usuario_routes.route('/api/usuarios/<int:id_usuario>/permisos', methods=['GET'])
@admin_required
@permission_required("modificar_usuario")
def permisos_usuario(id_usuario):

    try:
        query = """
            SELECT 
                p.id_permiso,
                p.nombre,
                m.nombre_modulo,
                COALESCE(up.habilitado, false) as habilitado
            FROM clinica.t_permisos p
            INNER JOIN clinica.t_modulo m 
                ON m.id_modulo = p.id_modulo

            LEFT JOIN clinica.t_usuario_permiso up
                ON up.id_permiso = p.id_permiso
               AND up.id_usuario = %s

            ORDER BY m.nombre_modulo, p.id_permiso
        """

        rows = db.execute_query(query, (id_usuario,), fetchall=True)

        data = [{
            "id_permiso": r[0],
            "nombre": r[1],
            "modulo": r[2],
            "habilitado": r[3]
        } for r in (rows or [])]

        return jsonify({"success": True, "data": data}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500    


@usuario_routes.route('/api/usuarios/permisos', methods=['POST'])
@admin_required
@permission_required("modificar_permisos")
def activar_permiso_usuario():

    try:

        data = request.get_json() or {}

        id_usuario = data.get('id_usuario')
        id_permiso = data.get('id_permiso')

        if not id_usuario or not id_permiso:

            return jsonify({
                "success": False,
                "message": "Datos incompletos"
            }), 400

        db.execute_query("""

            DELETE FROM clinica.t_usuario_permiso
            WHERE id_usuario = %s
            AND id_permiso = %s;

            INSERT INTO clinica.t_usuario_permiso (
                id_usuario,
                id_permiso,
                habilitado
            )
            VALUES (%s, %s, true)

        """, (
            id_usuario,
            id_permiso,
            id_usuario,
            id_permiso
        ), commit=True)

        return jsonify({
            "success": True
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@usuario_routes.route('/api/usuarios/permisos', methods=['DELETE'])
@admin_required
@permission_required("modificar_permisos")
def quitar_permiso_usuario():
    try:
        data = request.get_json() or {}

        id_usuario = data.get('id_usuario')
        id_permiso = data.get('id_permiso')

        db.execute_query("""
            UPDATE clinica.t_usuario_permiso
            SET habilitado = false
            WHERE id_usuario = %s AND id_permiso = %s
        """, (id_usuario, id_permiso), commit=True)

        return jsonify({"success": True}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500    

# =========================================================
# CONSULTA DE BITÁCORA (AUDITORÍA)
# =========================================================

@usuario_routes.route('/api/bitacora', methods=['GET'])
@admin_required
def consultar_bitacora():
    try:
        filtros = {
            'nombre': request.args.get('nombre'),
            'modulo': request.args.get('modulo'),
            'fecha_inicio': request.args.get('fecha_inicio'),
            'fecha_fin': request.args.get('fecha_fin')
        }
        
        data = Bitacora.listar(filtros)
        
        return jsonify({"success": True, "data": data}), 200

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
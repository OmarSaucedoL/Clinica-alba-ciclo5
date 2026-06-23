from flask import Blueprint, request, jsonify
from ..config import db
from ..classes.security import admin_required, permission_required
from ..services.bitacora import Bitacora

personal_routes = Blueprint('personal_routes', __name__)

# =========================================================
# LISTAR PERSONAL
# =========================================================

@personal_routes.route('/api/personal', methods=['GET'])
@admin_required
@permission_required("visualizar_personal")
def listar_personal():
    try:

        query = """
           SELECT
        p.id_personal,
        pe.nombre,
        pe.ci,
        pe.telefono,
        pe.fecha_nacimiento,
        pe.direccion,
        pe.descripcion,
        p.especialidad,
        p.id_contrato,
        p.id_cargo,
        c.tipo_cargo,
        p.estado
    FROM clinica.t_personal p
    INNER JOIN clinica.t_persona pe
        ON pe.id_persona = p.id_personal
    INNER JOIN clinica.t_cargo c
        ON c.id_cargo = p.id_cargo
    ORDER BY pe.nombre
        """

        rows = db.execute_query(query, fetchall=True)

        data = [{
    "id_personal": r[0],
    "nombre": r[1],
    "ci": r[2],
    "telefono": r[3],
    "fecha_nacimiento": r[4],
    "direccion": r[5],
    "descripcion": r[6],
    "especialidad": r[7],
    "id_contrato": r[8],
    "id_cargo": r[9],
    "cargo": r[10],
    "estado": r[11]
} for r in (rows or [])]

        return jsonify({
            "success": True,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================================
# CREAR PERSONAL
# =========================================================

@personal_routes.route('/api/personal', methods=['POST'])
@admin_required
@permission_required("crear_personal")
def crear_personal():

    try:

        data = request.get_json() or {}

        nombre = data.get("nombre")
        telefono = data.get("telefono")
        fecha_nacimiento = data.get("fecha_nacimiento")
        direccion = data.get("direccion")
        ci = data.get("ci")
        descripcion = data.get("descripcion")

        especialidad = data.get("especialidad")
        id_contrato = data.get("id_contrato")
        id_cargo = data.get("id_cargo")

        if not all([
            nombre,
            fecha_nacimiento,
            ci,
            id_contrato,
            id_cargo
        ]):
            return jsonify({
                "success": False,
                "message": "Datos incompletos"
            }), 400

        sql = f"""
            CALL clinica.p_crear_personal(
                %s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """

        params = (
            nombre,
            telefono,
            fecha_nacimiento,
            direccion,
            ci,
            descripcion,
            especialidad,
            id_contrato,
            id_cargo
        )

        db.execute_query(
            sql,
            params,
            commit=True
        )

        Bitacora.registrar(
            "PERSONAL",
            "CREATE",
            f"Personal creado: {nombre}"
        )

        return jsonify({
            "success": True,
            "message": "Personal registrado correctamente"
        }), 201

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

# =========================================================
# ACTUALIZAR PERSONAL
# =========================================================

@personal_routes.route('/api/personal/<int:id_personal>', methods=['PUT'])
@admin_required
@permission_required("modificar_personal")
def modificar_personal(id_personal):

    try:

        data = request.get_json() or {}

        sql = f"""
            CALL clinica.p_actualizar_personal(
                %s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s
            )
        """

        params = (
            id_personal,
            data.get("nombre"),
            data.get("telefono"),
            data.get("fecha_nacimiento"),
            data.get("direccion"),
            data.get("ci"),
            data.get("descripcion"),
            data.get("especialidad"),
            data.get("id_contrato"),
            data.get("estado"),
            data.get("id_cargo")
        )

        db.execute_query(
            sql,
            params,
            commit=True
        )

        Bitacora.registrar(
            "PERSONAL",
            "UPDATE",
            f"Personal actualizado {id_personal}"
        )

        return jsonify({
            "success": True,
            "message": "Personal actualizado"
        }), 200

    except Exception as e:

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
    
# =========================================================
# DESACTIVAR PERSONAL
# =========================================================

@personal_routes.route('/api/personal/<int:id_personal>', methods=['DELETE'])
@admin_required
@permission_required("dar_baja_personal")
def eliminar_personal(id_personal):

    try:

        db.execute_query("""
            UPDATE clinica.t_personal
            SET estado = 'INACTIVO'
            WHERE id_personal = %s
        """, (id_personal,), commit=True)

        Bitacora.registrar(
            "PERSONAL",
            "DELETE",
            f"Personal desactivado {id_personal}"
        )

        return jsonify({
            "success": True,
            "message": "Personal desactivado correctamente"
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================================
# LISTAR CARGOS
# =========================================================

@personal_routes.route('/api/cargos', methods=['GET'])
@admin_required
@permission_required("visualizar_personal")
def listar_cargos():

    try:

        rows = db.execute_query("""
            SELECT
                id_cargo,
                tipo_cargo
            FROM clinica.t_cargo
            ORDER BY tipo_cargo
        """, fetchall=True)

        data = [{
            "id_cargo": r[0],
            "cargo": r[1]
        } for r in (rows or [])]

        return jsonify({
            "success": True,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================================================
# LISTAR CONTRATOS
# =========================================================

@personal_routes.route('/api/contratos', methods=['GET'])
@admin_required
@permission_required("visualizar_personal")
def listar_contratos():

    try:

        rows = db.execute_query("""
            SELECT
                id_contrato,
                tipo_contrato,
                fecha_contrato,
                fecha_fin_contrato,
                estado_contrato
            FROM clinica.t_contrato
            ORDER BY id_contrato
        """, fetchall=True)

        data = [{
            "id_contrato": r[0],
            "tipo_contrato": r[1],
            "fecha_contrato": r[2],
            "fecha_fin_contrato": r[3],
            "estado": r[4]
        } for r in (rows or [])]

        return jsonify({
            "success": True,
            "data": data
        }), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
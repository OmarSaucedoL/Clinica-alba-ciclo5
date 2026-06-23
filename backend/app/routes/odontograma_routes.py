from flask import Blueprint, request, jsonify
import psycopg2
import traceback
from ..config import db, Config
from ..classes.security import admin_required, permission_required
from ..services.bitacora import Bitacora

odontograma_routes = Blueprint('odontograma_routes', __name__)


# =========================
# REGISTRAR ODONTOGRAMA
# =========================
@odontograma_routes.route('/api/pacientes/<int:id_paciente>/odontograma', methods=['POST'])
#@permission_required("crear_odontograma")
def registrar_odontograma(id_paciente):

    try:
        data = request.get_json() or {}

        id_servicio = data.get("id_servicio")
        descripcion = data.get("descripcion")
        codigo_diente = data.get("codigo_diente")

        if not id_servicio or not codigo_diente:
            return jsonify({
                "success": False,
                "message": "Faltan datos obligatorios"
            }), 400

        sql_call = """
            CALL clinica.p_registrar_odontograma(
                %s,
                %s,
                %s,
                %s
            )
        """

        db.execute_query(
            sql_call,
            (id_paciente, id_servicio, descripcion, codigo_diente),
            commit=True
        )

        Bitacora.registrar(
            "ODONTOGRAMA",
            "REGISTRAR",
            f"Registro odontograma paciente {id_paciente}"
        )

        return jsonify({
            "success": True,
            "message": "Registro agregado correctamente"
        }), 201

    except psycopg2.Error as e:
        return jsonify({
            "success": False,
            "message": e.pgerror or str(e)
        }), 500

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================
# CONSULTAR ODONTOGRAMA
# =========================
@odontograma_routes.route('/api/pacientes/<int:id_paciente>/odontograma', methods=['GET'])
#@permission_required("visualizar_odontograma")
def consultar_odontograma(id_paciente):

    try:

        query = """
            SELECT
                a.id_odontograma,
                a.id_paciente,
                a.id_cita,
                a.fecha,
                a.tipo_evento,
                a.descripcion,
                a.codigo_diente,
                b.nombre AS nombre_diente,
                c.nombre AS nombre_paciente,
                c.ci,
                CASE
                    WHEN a.id_cita IS NULL THEN TRUE
                    ELSE FALSE
                END AS editable
            FROM clinica.t_historial_dental a
            INNER JOIN clinica.t_diente b
                ON a.codigo_diente = b.codigo
            INNER JOIN clinica.t_persona c
                ON a.id_paciente = c.id_persona
            WHERE a.id_paciente = %s
            ORDER BY a.codigo_diente, a.fecha DESC
        """

        result = db.execute_query(
            query,
            (id_paciente,),
            fetchall=True
        )

        data = []

        if result:
            for row in result:
                data.append({
                    "id_odontograma": row[0],
                    "id_paciente": row[1],
                    "id_cita": row[2],
                    "fecha": str(row[3]) if row[3] else None,
                    "tipo_evento": row[4],
                    "descripcion": row[5],
                    "codigo_diente": row[6],
                    "nombre_diente": row[7],
                    "nombre_paciente": row[8],
                    "ci": row[9],
                    "editable": row[10]
                })

        return jsonify({
            "success": True,
            "data": data
        }), 200

    except psycopg2.Error as e:
        return jsonify({
            "success": False,
            "message": e.pgerror or str(e)
        }), 500

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================
# MODIFICAR ODONTOGRAMA
# =========================
@odontograma_routes.route('/api/odontograma/<int:id_odontograma>', methods=['PUT'])
#@permission_required("modificar_odontograma")
def modificar_odontograma(id_odontograma):

    try:
        data = request.get_json() or {}

        query = """
            UPDATE clinica.t_historial_dental
            SET
                descripcion = %s,
                codigo_diente = %s
            WHERE id_odontograma = %s
              AND id_cita IS NULL
        """

        db.execute_query(
            query,
            (
                data.get("descripcion"),
                data.get("codigo_diente"),
                id_odontograma
            ),
            commit=True
        )

        Bitacora.registrar(
            "ODONTOGRAMA",
            "MODIFICAR",
            f"Registro {id_odontograma} modificado"
        )

        return jsonify({
            "success": True,
            "message": "Registro actualizado"
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500


# =========================
# ELIMINAR ODONTOGRAMA
# =========================
@odontograma_routes.route('/api/odontograma/<int:id_odontograma>', methods=['DELETE'])
#@permission_required("eliminar_odontograma")
def eliminar_odontograma(id_odontograma):

    try:

        query = """
            DELETE FROM clinica.t_historial_dental
            WHERE id_odontograma = %s
              AND id_cita IS NULL
        """

        db.execute_query(
            query,
            (id_odontograma,),
            commit=True
        )

        Bitacora.registrar(
            "ODONTOGRAMA",
            "ELIMINAR",
            f"Registro {id_odontograma} eliminado"
        )

        return jsonify({
            "success": True,
            "message": "Registro eliminado"
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500
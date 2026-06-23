from flask import Blueprint, request, jsonify
from ..config import db, Config
from ..classes.security import admin_required, permission_required
from ..services.bitacora import Bitacora

consultorios_routes = Blueprint('consultorios_routes', __name__)

def _get_log_context():
    """Helper local para obtener id_usuario e id_sesion y evitar boilerplate."""
    data = request.get_json(silent=True) or {}
    id_u = data.get('id_usuario') or request.args.get('id_usuario')
    id_s = data.get('id_sesion') or request.args.get('id_sesion')
    
    if not id_u:
        from ..classes.security import Security
        user = Security.decode_token()
        if user:
            id_u = user.get("id_usuario")
            
    if id_u and not id_s:
        try:
            query = f"SELECT id_sesion FROM {Config.SCHEMA}.t_sesiones WHERE id_usuario = %s AND estado = 'ACTIVA' ORDER BY fecha_inicio DESC LIMIT 1"
            res = db.execute_query(query, (id_u,), fetchone=True)
            if res:
                id_s = res[0]
        except Exception:
            pass
            
    return id_u, id_s



@consultorios_routes.route('/api/consultorios', methods=['GET'])
def get_consultorios():
    try:
        query = f"SELECT id_sala, nombre, tipo_sala, estado_sala FROM {Config.SCHEMA}.t_sala ORDER BY id_sala ASC"
        results = db.execute_query(query, fetchall=True)

        salas = [{
            "id_sala": row[0],
            "nombre": row[1],
            "tipo_sala": row[2],
            "estado_sala": row[3]
        } for row in (results or [])]

        return jsonify({'success': True, 'data': salas}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@consultorios_routes.route('/api/consultorios/<int:id_sala>', methods=['GET'])
def get_consultorio(id_sala):
    try:
        query = f"SELECT id_sala, nombre, tipo_sala, estado_sala FROM {Config.SCHEMA}.t_sala WHERE id_sala = %s"
        row = db.execute_query(query, (id_sala,), fetchone=True)
        
        if not row:
            return jsonify({'success': False, 'message': 'Consultorio no encontrado'}), 404
            
        sala = {
            "id_sala": row[0],
            "nombre": row[1],
            "tipo_sala": row[2],
            "estado_sala": row[3]
        }
        return jsonify({'success': True, 'data': sala}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@consultorios_routes.route('/api/consultorios', methods=['POST'])
def create_consultorio():
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre')
        tipo_sala = data.get('tipo_sala', 'GENERAL')
        estado_sala = data.get('estado_sala', 'ACTIVA')

        if not nombre:
            return jsonify({'success': False, 'message': 'El nombre es requerido'}), 400

        query = f"INSERT INTO {Config.SCHEMA}.t_sala (nombre, tipo_sala, estado_sala) VALUES (%s, %s, %s)"
        db.execute_query(query, (str(nombre), str(tipo_sala), str(estado_sala)), commit=True)
        
        id_u, id_s = _get_log_context()
        Bitacora.registrar("CONSULTORIOS", "CREATE", f"Consultorio creado: {nombre}", id_u, id_s)
        return jsonify({'success': True, 'message': 'Consultorio creado exitosamente'}), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@consultorios_routes.route('/api/consultorios/<int:id_sala>', methods=['PUT'])
def update_consultorio(id_sala):
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre')
        tipo_sala = data.get('tipo_sala')
        estado_sala = data.get('estado_sala')

        if not nombre:
            return jsonify({'success': False, 'message': 'El nombre es requerido'}), 400

        query = f"UPDATE {Config.SCHEMA}.t_sala SET nombre = %s, tipo_sala = %s, estado_sala = %s WHERE id_sala = %s"
        db.execute_query(query, (str(nombre), str(tipo_sala), str(estado_sala), int(id_sala)), commit=True)
        
        id_u, id_s = _get_log_context()
        Bitacora.registrar("CONSULTORIOS", "UPDATE", f"Consultorio actualizado: {id_sala}", id_u, id_s)
        return jsonify({'success': True, 'message': 'Consultorio actualizado exitosamente'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@consultorios_routes.route('/api/consultorios/<int:id_sala>', methods=['DELETE'])
def delete_consultorio(id_sala):
    try:
        query_check = f"SELECT nombre FROM {Config.SCHEMA}.t_sala WHERE id_sala = %s"
        row = db.execute_query(query_check, (int(id_sala),), fetchone=True)
        if not row:
            return jsonify({'success': False, 'message': 'Consultorio no encontrado'}), 404

        query = f"DELETE FROM {Config.SCHEMA}.t_sala WHERE id_sala = %s"
        db.execute_query(query, (int(id_sala),), commit=True)
        
        id_u, id_s = _get_log_context()
        Bitacora.registrar("CONSULTORIOS", "DELETE", f"Consultorio eliminado: {row[0]}", id_u, id_s)
        return jsonify({'success': True, 'message': 'Consultorio eliminado exitosamente'}), 200
    except Exception as e:
        err_msg = str(e)
        if "foreign key" in err_msg.lower() or "llave foránea" in err_msg.lower():
            return jsonify({'success': False, 'message': 'No se puede eliminar el consultorio porque tiene citas o registros asociados.'}), 409
        return jsonify({'success': False, 'message': err_msg}), 500

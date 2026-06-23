from flask import Blueprint, request, jsonify
from ..config import db, Config
from ..classes.security import permission_required
from ..services.bitacora import Bitacora

servicios_routes = Blueprint('servicios_routes', __name__)

def _get_log_context():
    """Helper local para obtener id_usuario e id_sesion y evitar boilerplate en las rutas."""
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

@servicios_routes.route('/api/servicios', methods=['GET'])
def get_servicios_master():
    try:
        query = f"SELECT id_servicio, nombre, precio_sugerido, detalle FROM {Config.SCHEMA}.t_servicio ORDER BY nombre"
        results = db.execute_query(query, fetchall=True)
        servicios = [{
            "id": row[0],
            "nombre": row[1],
            "precio": float(row[2]) if row[2] is not None else 0.0,
            "detalle": row[3]
        } for row in (results or [])]
        return jsonify({'success': True, 'data': servicios}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@servicios_routes.route('/api/servicios', methods=['POST'])
@permission_required("crear_servicio")
def create_servicio():
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre')
        precio_sugerido = data.get('precio_sugerido') or data.get('precio_consumidor')
        detalle = data.get('detalle', '')

        if not nombre:
            return jsonify({'success': False, 'message': 'El nombre del servicio es requerido.'}), 400
        if precio_sugerido is None or precio_sugerido == '':
            return jsonify({'success': False, 'message': 'El precio es requerido.'}), 400

        try:
            precio_val = float(precio_sugerido)
        except ValueError:
            return jsonify({'success': False, 'message': 'El precio debe ser un número válido.'}), 400

        query = f"""
            INSERT INTO {Config.SCHEMA}.t_servicio (id_servicio, nombre, precio_sugerido, detalle)
            VALUES ((SELECT COALESCE(MAX(id_servicio), 0) + 1 FROM {Config.SCHEMA}.t_servicio), %s, %s, %s)
            RETURNING id_servicio
        """
        result = db.execute_query(query, (str(nombre), precio_val, str(detalle)), fetchone=True, commit=True)

        id_u, id_s = _get_log_context()
        Bitacora.registrar('SERVICIOS', 'CREAR_SERVICIO', f'Servicio creado: {nombre} (Precio: {precio_val})', id_u, id_s)
        
        return jsonify({
            'success': True,
            'message': 'Servicio creado exitosamente.',
            'data': {'id_servicio': result[0], 'nombre': nombre, 'precio': precio_val, 'detalle': detalle}
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@servicios_routes.route('/api/servicios/<int:id_servicio>', methods=['PUT'])
@permission_required("editar_servicio")
def update_servicio(id_servicio):
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre')
        precio_sugerido = data.get('precio_sugerido') or data.get('precio_consumidor')
        detalle = data.get('detalle', '')

        if not nombre:
            return jsonify({'success': False, 'message': 'El nombre del servicio es requerido.'}), 400
        if precio_sugerido is None or precio_sugerido == '':
            return jsonify({'success': False, 'message': 'El precio es requerido.'}), 400

        try:
            precio_val = float(precio_sugerido)
        except ValueError:
            return jsonify({'success': False, 'message': 'El precio debe ser un número válido.'}), 400

        query = f"""
            UPDATE {Config.SCHEMA}.t_servicio
            SET nombre = %s, precio_sugerido = %s, detalle = %s
            WHERE id_servicio = %s
            RETURNING id_servicio
        """
        result = db.execute_query(query, (str(nombre), precio_val, str(detalle), int(id_servicio)), fetchone=True, commit=True)

        if not result:
            return jsonify({'success': False, 'message': 'Servicio no encontrado.'}), 404

        id_u, id_s = _get_log_context()
        Bitacora.registrar('SERVICIOS', 'EDITAR_SERVICIO', f'Servicio ID {id_servicio} actualizado: {nombre} (Precio: {precio_val})', id_u, id_s)
        
        return jsonify({'success': True, 'message': 'Servicio actualizado exitosamente.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@servicios_routes.route('/api/servicios/<int:id_servicio>', methods=['DELETE'])
@permission_required("eliminar_servicios")
def delete_servicio(id_servicio):
    try:
        query_check = f"SELECT nombre FROM {Config.SCHEMA}.t_servicio WHERE id_servicio = %s"
        row = db.execute_query(query_check, (int(id_servicio),), fetchone=True)
        if not row:
            return jsonify({'success': False, 'message': 'Servicio no encontrado.'}), 404

        query = f"DELETE FROM {Config.SCHEMA}.t_servicio WHERE id_servicio = %s"
        db.execute_query(query, (int(id_servicio),), commit=True)

        id_u, id_s = _get_log_context()
        Bitacora.registrar('SERVICIOS', 'ELIMINAR_SERVICIO', f'Servicio eliminado: {row[0]} (ID: {id_servicio})', id_u, id_s)
        
        return jsonify({'success': True, 'message': 'Servicio eliminado exitosamente.'}), 200
    except Exception as e:
        err_msg = str(e)
        if "foreign key" in err_msg.lower() or "llave foránea" in err_msg.lower():
            return jsonify({
                'success': False,
                'message': 'No se puede eliminar el servicio porque está asociado a citas existentes.'
            }), 409
        return jsonify({'success': False, 'message': err_msg}), 500

from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash
import json
from ..config import db, Config
from ..classes.security import admin_required, Security,permission_required
from ..services.bitacora import Bitacora

procedimientos_routes_routes = Blueprint('procedimientos_routes_routes', __name__)

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


@procedimientos_routes_routes.route('/api/procedimientos', methods=['GET'])
def get_tratamientos():
    """Obtiene todos los procedimientos"""
    try:
        query = f"SELECT * FROM {Config.SCHEMA}.fn_obtener_todos_los_procedimientos()"
        results = db.execute_query(query, fetchall=True)
        
        if results:
            procedimientos = [{
                "id": row[0],
                "descripcion": row[1],
                "precio": float(row[2]) if row[2] is not None else 0.0
            } for row in results]

            
            return jsonify({
                'success': True,
                'data': procedimientos
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'No se encontraron procedimientos'
            }), 404
        
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener los procedimientos: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/<int:id>', methods=['GET'])
def get_procedimiento(id):
    """Obtiene un procedimiento por ID"""
    try:
        query = f"SELECT id_procedimiento, descripcion, precio FROM {Config.SCHEMA}.t_procedimiento WHERE id_procedimiento = %s"
        result = db.execute_query(query, (id,), fetchone=True)
        
        if result:
            return jsonify({
                'success': True, 
                'data': {'id': result[0], 'descripcion': result[1], 'precio': float(result[2]) if result[2] is not None else 0.0}
            }), 200
        else:
            return jsonify({'success': False, 'message': 'Procedimiento no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos', methods=['POST'])
@permission_required("crear_procedimientos")
def create_procedimiento():
    """Crea un nuevo procedimiento"""
    data = request.get_json() or {}
    descripcion = data.get('descripcion')
    precio = data.get('precio')
    
    if not descripcion:
        return jsonify({'success': False, 'message': 'Falta el campo requerido: descripcion'}), 400
        
    try:
        if precio is not None and precio != '':
            try:
                precio_val = float(precio)
            except ValueError:
                return jsonify({'success': False, 'message': 'El precio debe ser un número válido.'}), 400
        else:
            precio_val = 0.0

        query = f"INSERT INTO {Config.SCHEMA}.t_procedimiento (descripcion, precio) VALUES (%s, %s) RETURNING id_procedimiento"
        result = db.execute_query(query, (descripcion, precio_val), fetchone=True, commit=True)
        
        id_u, id_s = _get_log_context()
        descripcion_log = f"Nuevo procedimiento: {descripcion} (Precio: {precio_val})"
        Bitacora.registrar('PROCEDIMIENTOS', 'CREAR_PROCEDIMIENTO', descripcion_log, id_u, id_s)
        return jsonify({
            'success': True, 
            'message': 'Procedimiento creado exitosamente', 
            'data': {'id_procedimiento': result[0], 'descripcion': descripcion, 'precio': precio_val}
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al crear procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/<int:id>', methods=['PUT'])
@permission_required("modificar_procedimientos")
def update_procedimiento(id):
    """Actualiza un procedimiento existente"""
    data = request.get_json() or {}
    descripcion = data.get('descripcion')
    precio = data.get('precio')
    
    if not descripcion:
        return jsonify({'success': False, 'message': 'Falta el campo requerido: descripcion'}), 400
        
    try:
        if precio is not None and precio != '':
            try:
                precio_val = float(precio)
            except ValueError:
                return jsonify({'success': False, 'message': 'El precio debe ser un número válido.'}), 400
        else:
            precio_val = 0.0

        query = f"UPDATE {Config.SCHEMA}.t_procedimiento SET descripcion = %s, precio = %s WHERE id_procedimiento = %s RETURNING id_procedimiento"
        result = db.execute_query(query, (descripcion, precio_val, id), fetchone=True, commit=True)
        
        if result:
            id_u, id_s = _get_log_context()
            descripcion_log = f"Procedimiento ID: {id} actualizado. Nueva descripción: {descripcion} | Nuevo precio: {precio_val}"
            Bitacora.registrar('PROCEDIMIENTOS', 'MODIFICAR_PROCEDIMIENTO', descripcion_log, id_u, id_s)

            return jsonify({'success': True, 'message': 'Procedimiento actualizado exitosamente'}), 200
        else:
            return jsonify({'success': False, 'message': 'Procedimiento no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al actualizar procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/<int:id>', methods=['DELETE'])
@permission_required("eliminar_procedimientos")
def delete_procedimiento(id):
    """Elimina un procedimiento existente"""
    data = request.get_json() or {}
    try:
        query = f"DELETE FROM {Config.SCHEMA}.t_procedimiento WHERE id_procedimiento = %s RETURNING id_procedimiento, descripcion"
        result = db.execute_query(query, (id,), fetchone=True, commit=True)
        
        if result:
            id_u, id_s = _get_log_context()
            descripcion_log = f"Procedimiento eliminado: {result[1]} (ID: {id})"
            Bitacora.registrar('PROCEDIMIENTOS', 'ELIMINAR_PROCEDIMIENTO', descripcion_log, id_u, id_s)

            return jsonify({'success': True, 'message': 'Procedimiento eliminado exitosamente'}), 200
        else:
            return jsonify({'success': False, 'message': 'Procedimiento no encontrado'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al eliminar procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/asignar-todos', methods=['POST'])
@permission_required("asignar_procedimientos")
def asignar_procedimientos_todos():
    """Asigna un procedimiento a todos los odontólogos"""
    data = request.get_json() or {}
    id_procedimiento = data.get('id_procedimiento')
    
    if not id_procedimiento:
        return jsonify({'success': False, 'message': 'Falta el campo requerido: id_procedimiento'}), 400
        
    try:
        query = f"CALL {Config.SCHEMA}.asignar_procedimiento_todos(%s)"
        db.execute_query(query, (id_procedimiento,), commit=True)
        
        id_u, id_s = _get_log_context()
        descripcion_log = f"Procedimiento {id_procedimiento} asignado a todos los odontólogos"
        Bitacora.registrar('PROCEDIMIENTOS', 'ASIGNAR_PROCEDIMIENTOS', descripcion_log, id_u, id_s)

        return jsonify({'success': True, 'message': 'Procedimiento asignado a todos los odontólogos exitosamente'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al asignar procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/quitar-todos', methods=['POST'])
@permission_required("asignar_procedimientos")
def quitar_procedimientos_todos():
    
    data = request.get_json() or {}
    id_procedimiento = data.get('id_procedimiento')
    
    if not id_procedimiento:
        return jsonify({'success': False, 'message': 'Falta el campo requerido: id_procedimiento'}), 400
        
    try:
        query = f"CALL {Config.SCHEMA}.quitar_procedimiento_todos(%s)"
        db.execute_query(query, (id_procedimiento,), commit=True)
        
        id_u, id_s = _get_log_context()
        descripcion_log = f"Procedimiento {id_procedimiento} quitado a todos los odontólogos"
        Bitacora.registrar('PROCEDIMIENTOS', 'ASIGNAR_PROCEDIMIENTOS', descripcion_log, id_u, id_s)

        return jsonify({'success': True, 'message': 'Procedimiento quitado a todos los odontólogos exitosamente'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al quitar procedimiento: {e}'}), 500

@procedimientos_routes_routes.route('/api/procedimientos/<int:id_procedimiento>/odontologos', methods=['POST'])
@permission_required("asignar_procedimientos")
def asignar_odontologos_procedimiento(id_procedimiento):
    try:
        data = request.get_json() or {}
        odontologos_ids = data.get('odontologos_ids', [])
        
        query = f"CALL {Config.SCHEMA}.p_asignar_odontologos_procedimiento(%s, %s)"
        db.execute_query(query, (id_procedimiento, odontologos_ids), commit=True)               
        id_u, id_s = _get_log_context()
        descripcion_log = f"Asignación de odontólogos al procedimiento ID {id_procedimiento} actualizada: {odontologos_ids}"
        Bitacora.registrar('PROCEDIMIENTOS', 'ASIGNAR_PROCEDIMIENTOS', descripcion_log, id_u, id_s)
        
        return jsonify({'success': True, 'message': 'Asignación de odontólogos actualizada exitosamente.'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al asignar odontólogos: {e}'}), 500



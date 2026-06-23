from flask import Blueprint, request, jsonify, Response
from ..services.citas_service import build_citas_query  
from datetime import timedelta, datetime
from ..config import db, Config
import json, traceback
import csv
from io import StringIO
from ..classes.security import permission_required
from ..services.bitacora import Bitacora
citas_routes = Blueprint('citas_routes', __name__)

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




@citas_routes.route('/api/citas', methods=['POST'])
@permission_required("crear_cita")
def create_cita():
    data = request.get_json() or {} 
    # 1. Validación de campos obligatorios para el negocio
    required_fields = ['fecha_agendamiento', 'id_paciente', 'id_odontologo', 'id_sala', 'cita_obs']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': f'Falta el campo requerido: {field}'
            }), 400 # Código 400: Bad Request
    
    # 2. Extracción de datos de la cita
    fecha_agendamiento = data.get('fecha_agendamiento')
    id_paciente = data.get('id_paciente')
    id_odontologo = data.get('id_odontologo')
    id_sala = data.get('id_sala')
    cita_obs = data.get('cita_obs')   
    id_procedimiento = data.get('id_procedimiento') or None
    if id_procedimiento in ('null', 'undefined'):
        id_procedimiento = None

    # 3. Datos para bitácora (enviados desde el Front)
    # Si no vienen (None), se resolverán automáticamente
    id_u, id_s = _get_log_context()

    try:

        # Ejecución del Procedure en Supabase
        query = f"CALL {Config.SCHEMA}.p_crear_cita(%s, %s, %s, %s, %s, %s)"
        params = (id_odontologo, id_paciente, fecha_agendamiento, id_sala, cita_obs, id_procedimiento)
        db.execute_query(query, params, commit=True)
    
        descripcion_log = f"Nueva cita: Paciente {id_paciente} | Doc {id_odontologo} | Sala {id_sala}"
        
        Bitacora.registrar('CITAS', 'CREAR_CITA', descripcion_log, id_u, id_s)
        
        return jsonify({
            'success': True,
            'message': 'Cita creada exitosamente'
        }), 201 # Código 201: Created
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Error al registrar la cita: {str(e)}'
        }), 500
    
       
@citas_routes.route('/api/citas', methods=['GET'])
@permission_required("visualizar_citas")
def get_citas():
    filters = request.args.to_dict()
    page = int(filters.get('page', 1))
    limit = int(filters.get('limit', 10))
    offset = (page - 1) * limit

    try:
        # Mapeo del filtro de estado: puede llegar como ID int o string del nombre
        estado_raw = filters.get('estado')
        id_estado = None
        if estado_raw:
            # Si ya es un número, úsalo directamente
            if estado_raw.isdigit():
                id_estado = int(estado_raw)
            else:
                # Si viene como string, convertir al ID correspondiente
                estado_map = {
                    'PROGRAMADA': 1, 'Programada': 1,
                    'CANCELADA': 2, 'Cancelada': 2,
                    'REPROGRAMADA': 3, 'Reprogramada': 3,
                    'COMPLETADA': 4, 'Completada': 4,
                    'FINALIZADA': 4,  # compatibilidad con nombre anterior
                    'NO_ASISTIO': 5, 'No Asistió': 5,
                }
                id_estado = estado_map.get(estado_raw)

      
        query = f"""
            SELECT * 
            FROM {Config.SCHEMA}.f_obtener_citas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        params = (
            filters.get('id_personal'),
            filters.get('id_paciente'),
            filters.get('fecha_agen_desde'),
            filters.get('fecha_agen_hasta'),
            filters.get('fecha_reg_desde'),
            filters.get('fecha_reg_hasta'),
            filters.get('fecha_fin_desde'),
            filters.get('fecha_fin_hasta'),
            filters.get('id_sala'),
            id_estado,
            limit,
            offset,
            filters.get('id_procedimiento')
        )
        results = db.execute_query(query, params, fetchall=True)

        citas_list = []
        if results:
            for row in results:
                citas_list.append({
                    "id_cita":            row[0],
                    "id_personal":        row[1],
                    "id_paciente":        row[2],
                    "fecha_registro":     row[3].strftime("%d/%m/%y %H:%M") if row[3] else None,
                    "fecha_agendamiento": row[4].strftime("%d/%m/%y %H:%M") if row[4] else None,
                    "fecha_finalizacion": row[5].strftime("%d/%m/%y %H:%M") if row[5] else None,
                    "id_estado_cita":     row[6],
                    "nombre_estado":      row[7],
                    "id_sala":            row[8],
                    "cita_obs":           row[9],
                    "id_procedimiento":   row[10]
                })

        response = {
            "data": citas_list,
            "page": page,
            "limit": limit
        }

        return jsonify(response), 200
    except Exception as e:
        return jsonify({'message': f'Error al obtener las citas: {e}'}), 500
    
        



@citas_routes.route('/api/citas/<int:id>', methods=['PUT'])
@permission_required("modificar_cita")
def update_cita(id):
    data = request.get_json()

    required_fields = ['id_personal', 'id_paciente', 'fecha_agendamiento', 'id_sala', 'cita_obs']

    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'message': 'Debe Ingresar Todos los Campos Requeridos'
            }), 400

    id_personal = data.get('id_personal')
    id_paciente = data.get('id_paciente')
    fecha_agendamiento = data.get('fecha_agendamiento')
    id_sala = data.get('id_sala')
    cita_obs = data.get('cita_obs')
    id_procedimiento = data.get('id_procedimiento') or None
    if id_procedimiento in ('null', 'undefined'):
        id_procedimiento = None

    # Datos para bitácora
    id_u, id_s = _get_log_context()
    fecha_finalizacion = data.get('fecha_finalizacion')

   
    id_estado_cita = data.get('id_estado_cita') or data.get('estado_cita')

    if isinstance(id_estado_cita, str):
        estado_map = {
            'PROGRAMADA': 1, 'Programada': 1,
            'CANCELADA': 2, 'Cancelada': 2,
            'REPROGRAMADA': 3, 'Reprogramada': 3,
            'COMPLETADA': 4, 'Completada': 4, 'FINALIZADA': 4,
            'NO_ASISTIO': 5, 'No Asistió': 5,
        }
        id_estado_cita = estado_map.get(id_estado_cita, id_estado_cita)

    try:
        query = f"CALL {Config.SCHEMA}.p_actualizar_cita(%s, %s, %s, %s, %s, %s, %s, %s, %s)"
        params = (id, id_personal, id_paciente, fecha_agendamiento, id_sala, cita_obs, id_estado_cita, fecha_finalizacion, id_procedimiento)

        db.execute_query(query, params, commit=True)

        # REGISTRO EN BITÁCORA
        Bitacora.registrar('CITAS', 'MODIFICAR_CITA', f'Cita ID: {id} actualizada. Nueva fecha: {fecha_agendamiento}', id_u, id_s)

        return jsonify({
            'success': True,
            'message': 'Cita actualizada exitosamente'
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'ERROR : {e}'
        }), 500
    
        


@citas_routes.route('/api/citas/<int:id>', methods=['GET'])
@permission_required("modificar_cita")
def get_cita(id):
    try:
        
        query = f"SELECT * FROM {Config.SCHEMA}.f_obtener_detalle_cita(%s)"
        result = db.execute_query(query, (id,), fetchone=True)

        if not result:
            return jsonify({'success': False, 'message': 'Cita no encontrada'}), 404

        cita = {
            "id_cita":            result[0],
            "nombre_personal":    result[1],
            "nombre_paciente":    result[2],
            "fecha_registro":     result[3].strftime("%d/%m/%y %H:%M") if result[3] else None,
            "fecha_agendamiento": result[4].strftime("%d/%m/%y %H:%M") if result[4] else None,
            "fecha_finalizacion": result[5].strftime("%d/%m/%y %H:%M") if result[5] else None,
            "id_estado_cita":     result[6],
            "nombre_estado":      result[7],
            "nombre_sala":        result[8],
            "cita_obs":           result[9],
            "id_procedimiento":   result[10],
            "nombre_procedimiento": result[11]
        }

        return jsonify({'success': True, 'data': cita}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener la cita: {e}'}), 500
    
        

@citas_routes.route('/api/citas/odontologos-por-procedimiento/<int:id_procedimiento>', methods=['GET'])

def get_odontologos_por_procedimiento(id_procedimiento):
    try:
        
        query = f"SELECT * FROM {Config.SCHEMA}.fn_obtener_odontologos_por_procedimiento(%s)"
        results = db.execute_query(query, (id_procedimiento,), fetchall=True)

        odontologos = [{
            "id_personal": row[0],
            "nombre": row[1]
        } for row in (results or [])]

        return jsonify({'success': True, 'data': odontologos}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {e}'}), 500
    
        

@citas_routes.route('/api/citas/reporte_paciente', methods=['GET'])
@permission_required("generar_reporte_citas")
def get_reporte_paciente():
    try:
        id_paciente = request.args.get('id_paciente')
        if not id_paciente:
            return jsonify({'success': False, 'message': 'Falta id_paciente'}), 400

        fecha_agen_desde = request.args.get('fecha_agen_desde')
        fecha_agen_hasta = request.args.get('fecha_agen_hasta')
        limit = int(request.args.get('limit', 1000))

        
        params = (
            None, id_paciente, fecha_agen_desde, fecha_agen_hasta, 
            None, None, None, None, None, None, limit, 0
        )

     
        query_lista = f"SELECT * FROM {Config.SCHEMA}.f_obtener_citas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        results_lista = db.execute_query(query_lista, params, fetchall=True)

        citas_list = []
        if results_lista:
            for row in results_lista:
                citas_list.append({
                    "id_cita": row[0],
                    "id_personal": row[1],
                    "id_paciente": row[2],
                    "fecha_registro": row[3].strftime("%d/%m/%Y %H:%M") if row[3] else None,
                    "fecha_agendamiento": row[4].strftime("%d/%m/%Y %H:%M") if row[4] else None,
                    "fecha_finalizacion": row[5].strftime("%d/%m/%Y %H:%M") if row[5] else None,
                    "id_estado_cita": row[6],
                    "nombre_estado": row[7],
                    "id_sala": row[8],
                    "cita_obs": row[9]
                })

        query_stats = f"""
            SELECT nombre_estado, count(*) 
            FROM {Config.SCHEMA}.f_obtener_citas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            GROUP BY nombre_estado
        """
        results_stats = db.execute_query(query_stats, params, fetchall=True)
        
        stats_dict = {}
        total = 0
        if results_stats:
            for row in results_stats:
                stats_dict[row[0]] = int(row[1])
                total += int(row[1])

        response = {
            'success': True,
            'data': citas_list,
            'stats': stats_dict,
            'total': total
        }

        return jsonify(response), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error al generar reporte: {e}'}), 500

@citas_routes.route('/api/citas/reporte_odontologo', methods=['GET'])
@permission_required("generar_reporte_citas")
def get_reporte_odontologo():
    try:
        id_odontologo = request.args.get('id_odontologo')
        fecha_agen_desde = request.args.get('fecha_agen_desde')
        fecha_agen_hasta = request.args.get('fecha_agen_hasta')
        limit = request.args.get('limit', 100, type=int)
        offset = request.args.get('offset', 0, type=int)

        if not id_odontologo:
            return jsonify({'success': False, 'message': 'El parámetro id_odontologo es requerido'}), 400

        params = (
            id_odontologo, None, fecha_agen_desde, fecha_agen_hasta, 
            None, None, None, None, None, None, limit, 0
        )
     
        query_lista = f"SELECT * FROM {Config.SCHEMA}.f_obtener_citas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)"
        results_lista = db.execute_query(query_lista, params, fetchall=True)

        citas_list = []
        if results_lista:
            for row in results_lista:
                citas_list.append({
                    "id_cita": row[0],
                    "id_personal": row[1],
                    "id_paciente": row[2],
                    "fecha_registro": row[3].strftime("%d/%m/%Y %H:%M") if row[3] else None,
                    "fecha_agendamiento": row[4].strftime("%d/%m/%Y %H:%M") if row[4] else None,
                    "fecha_finalizacion": row[5].strftime("%d/%m/%Y %H:%M") if row[5] else None,
                    "id_estado_cita": row[6],
                    "nombre_estado": row[7],
                    "id_sala": row[8],
                    "cita_obs": row[9]
                })

        query_stats = f"""
            SELECT nombre_estado, count(*) 
            FROM {Config.SCHEMA}.f_obtener_citas(%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            GROUP BY nombre_estado
        """
        results_stats = db.execute_query(query_stats, params, fetchall=True)
        
        stats_dict = {}
        total = 0
        if results_stats:
            for row in results_stats:
                stats_dict[row[0]] = int(row[1])
                total += int(row[1])

        response = {
            'success': True,
            'data': citas_list,
            'stats': stats_dict,
            'total': total
        }

        return jsonify(response), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error al generar reporte de odontólogo: {e}'}), 500

@citas_routes.route('/api/citas/reporte_citas_global_paciente', methods=['GET'])
@permission_required("generar_reporte_citas")
def get_reporte_citas_global_paciente():
    try:
        fecha_desde = request.args.get('fecha_desde') or None
        fecha_hasta = request.args.get('fecha_hasta') or None
        
        query = f"SELECT * FROM {Config.SCHEMA}.f_reporte_resumen_pacientes(%s, %s)"
        results = db.execute_query(query, (fecha_desde, fecha_hasta), fetchall=True)
        
        report_list = []
        if results:
            for row in results:
                report_list.append({
                    "id_paciente": row[0],
                    "total_citas": int(row[1]) if row[1] is not None else 0,
                    "programadas": int(row[2]) if row[2] is not None else 0,
                    "canceladas": int(row[3]) if row[3] is not None else 0,
                    "reprogramadas": int(row[4]) if row[4] is not None else 0,
                    "completadas": int(row[5]) if row[5] is not None else 0,
                    "no_asistio": int(row[6]) if row[6] is not None else 0
                })
                
        return jsonify({
            'success': True,
            'data': report_list
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error al generar reporte global de pacientes: {e}'}), 500

@citas_routes.route('/api/citas/reporte_citas_global_odontologos', methods=['GET'])
@permission_required("generar_reporte_citas")
def get_reporte_citas_global_odontologos():
    try:
        fecha_desde = request.args.get('fecha_desde') or None
        fecha_hasta = request.args.get('fecha_hasta') or None
        
        query = f"SELECT * FROM {Config.SCHEMA}.f_reporte_resumen_odontologos(%s, %s)"
        results = db.execute_query(query, (fecha_desde, fecha_hasta), fetchall=True)
        
        report_list = []
        if results:
            for row in results:
                report_list.append({
                    "id_personal": row[0],
                    "total_citas": int(row[1]) if row[1] is not None else 0,
                    "programadas": int(row[2]) if row[2] is not None else 0,
                    "canceladas": int(row[3]) if row[3] is not None else 0,
                    "reprogramadas": int(row[4]) if row[4] is not None else 0,
                    "completadas": int(row[5]) if row[5] is not None else 0,
                    "no_asistio": int(row[6]) if row[6] is not None else 0
                })
                
        return jsonify({
            'success': True,
            'data': report_list
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': f'Error al generar reporte global de odontólogos: {e}'}), 500

@citas_routes.route('/api/citas/disponibilidad', methods=['GET'])
def get_disponibilidad():
    try:
        id_personal = request.args.get('id_personal')
        id_sala = request.args.get('id_sala')
        fecha_str = request.args.get('fecha')
        
        if id_personal in ('null', '', 'undefined'): id_personal = None
        if id_sala in ('null', '', 'undefined'): id_sala = None

        if not fecha_str or (not id_personal and not id_sala):
            return jsonify({'success': False, 'message': 'Faltan parámetros (fecha y al menos id_personal o id_sala)'}), 400

  
        query = f"SELECT * FROM {Config.SCHEMA}.fn_obtener_slots_libres(%s, %s, %s, 30)"
        results = db.execute_query(query, (id_personal, id_sala, fecha_str), fetchall=True)
        
        lista_resultados = results if results is not None else []
        data = [{'inicio': str(r[0])[:5], 'fin': str(r[1])[:5]} for r in lista_resultados]
        
        return jsonify({'success': True, 'data': data}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@citas_routes.route('/api/citas/ocupadas', methods=['GET'])
def get_ocupadas():
    try:
        id_personal = request.args.get('id_personal')
        id_sala = request.args.get('id_sala')
        fecha_str = request.args.get('fecha')
        
        if id_personal in ('null', '', 'undefined'): id_personal = None
        if id_sala in ('null', '', 'undefined'): id_sala = None

        if not fecha_str or (not id_personal and not id_sala):
            return jsonify({'success': False, 'message': 'Faltan parámetros (fecha y al menos id_personal o id_sala)'}), 400

        fecha_inicio = f"{fecha_str} 00:00:00"
        fecha_fin = f"{fecha_str} 23:59:59"

        query = f"SELECT * FROM {Config.SCHEMA}.fn_obtener_citas_ocupadas(%s, %s, %s, %s)"
        results = db.execute_query(query, (id_personal, id_sala, fecha_inicio, fecha_fin), fetchall=True)
        
        lista_resultados = results if results is not None else []
        # devuelve las horas en formato HH:mm
        data = [{'inicio': str(r[0])[11:16], 'fin': str(r[1])[11:16]} for r in lista_resultados]
        
        return jsonify({'success': True, 'data': data}), 200

    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
    
        

@citas_routes.route('/api/odontologos', methods=['GET'])
def get_odontologos():
    try:
        sql = f"""
            SELECT pers.id_personal, per.nombre
            FROM {Config.SCHEMA}.t_personal pers
            JOIN {Config.SCHEMA}.t_persona per ON pers.id_personal = per.id_persona
            WHERE pers.id_cargo = 2
            ORDER BY per.nombre ASC
        """
        doctores = db.execute_query(sql, fetchall=True)

        lista = [{"id": d[0], "nombre": d[1]} for d in (doctores or [])]
        return jsonify(lista), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@citas_routes.route('/api/salas', methods=['GET'])
def get_salas():
    try:
        query = f"SELECT id_sala, nombre, tipo_sala, estado_sala FROM {Config.SCHEMA}.t_sala"
        results = db.execute_query(query, fetchall=True)

        salas = [{
            "id_sala": row[0],
            "nombre": row[1],
            "tipo_sala": row[2],
            "estado_sala": row[3]
        } for row in (results or [])]

        return jsonify({'success': True, 'data': salas}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': f'Error al obtener salas: {e}'}), 500





@citas_routes.route('/api/citas/<int:id_cita>/servicios', methods=['GET'])
@permission_required("visualizar_citas")
def get_cita_servicios(id_cita):
    try:
        query = f"""
            SELECT cs.id_cita_servicio, cs.id_servicio, s.nombre, cs.precio, cs.fecha_creacion
            FROM {Config.SCHEMA}.t_cita_servicio cs
            JOIN {Config.SCHEMA}.t_servicio s ON cs.id_servicio = s.id_servicio
            WHERE cs.id_cita = %s
            ORDER BY cs.fecha_creacion DESC
        """
        results = db.execute_query(query, (id_cita,), fetchall=True)
        servicios = [{
            "id_cita_servicio": row[0],
            "id_servicio": row[1],
            "nombre": row[2],
            "precio": float(row[3]) if row[3] is not None else 0.0,
            "fecha_creacion": row[4].strftime("%d/%m/%y %H:%M") if row[4] else None
        } for row in (results or [])]
        return jsonify({'success': True, 'data': servicios}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@citas_routes.route('/api/citas/<int:id_cita>/servicios', methods=['POST'])
@permission_required("modificar_cita")
def add_cita_servicio(id_cita):
    data = request.get_json() or {}
    id_servicio = data.get('id_servicio')
    precio = data.get('precio')
    id_u, id_s = _get_log_context()
    
    if not id_servicio:
        return jsonify({'success': False, 'message': 'Falta el campo requerido: id_servicio'}), 400
        
    try:
        if precio is None or precio == "":
            query_precio = f"SELECT precio_consumidor FROM {Config.SCHEMA}.t_servicio WHERE id_servicio = %s"
            res_precio = db.execute_query(query_precio, (id_servicio,), fetchone=True)
            if not res_precio:
                return jsonify({'success': False, 'message': 'Servicio no encontrado'}), 404
            precio = res_precio[0] or 0.0

        query = f"""
            INSERT INTO {Config.SCHEMA}.t_cita_servicio (id_cita, id_servicio, precio)
            VALUES (%s, %s, %s)
            RETURNING id_cita_servicio
        """
        result = db.execute_query(query, (id_cita, id_servicio, precio), fetchone=True, commit=True)
        
        # Log en bitácora
        Bitacora.registrar('CITAS', 'MODIFICAR_CITA', f'Servicio ID: {id_servicio} agregado a Cita ID: {id_cita}. Precio: {precio}', id_u, id_s)
        
        return jsonify({
            'success': True, 
            'message': 'Servicio agregado a la cita exitosamente',
            'data': {'id_cita_servicio': result[0], 'precio': float(precio)}
        }), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@citas_routes.route('/api/citas/servicios/<int:id_cita_servicio>', methods=['DELETE'])
@permission_required("modificar_cita")
def delete_cita_servicio(id_cita_servicio):
    id_u, id_s = _get_log_context()
    try:
        query_info = f"SELECT id_cita, id_servicio FROM {Config.SCHEMA}.t_cita_servicio WHERE id_cita_servicio = %s"
        info = db.execute_query(query_info, (id_cita_servicio,), fetchone=True)
        if not info:
            return jsonify({'success': False, 'message': 'Asociación de servicio no encontrada'}), 404
            
        query = f"DELETE FROM {Config.SCHEMA}.t_cita_servicio WHERE id_cita_servicio = %s"
        db.execute_query(query, (id_cita_servicio,), commit=True)
        
        # Log en bitácora
        Bitacora.registrar('CITAS', 'MODIFICAR_CITA', f'Servicio ID: {info[1]} removido de Cita ID: {info[0]}', id_u, id_s)
        
        return jsonify({'success': True, 'message': 'Servicio removido de la cita exitosamente'}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

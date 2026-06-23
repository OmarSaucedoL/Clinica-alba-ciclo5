import json
from flask import request
from ..config import db, Config

class Bitacora:
    @staticmethod
    def _obtener_ip():
        """Captura la IP real del cliente."""
        if request.headers.getlist("X-Forwarded-For"):
            return request.headers.getlist("X-Forwarded-For")[0].split(',')[0]
        return request.remote_addr

    @staticmethod
    def registrar(modulo, accion, descripcion, id_usuario=None, id_sesion=None):
        """Registra un evento de auditoría en la base de datos."""
        try:
            meta = json.dumps({"ip": Bitacora._obtener_ip()})
            sql = f"""
                INSERT INTO {Config.SCHEMA}.t_bitacora 
                (modulo, accion, descripcion, id_usuario, id_sesion, metadata)
                VALUES (%s, %s, %s, %s, %s, %s)
            """
            params = (modulo, accion, descripcion, id_usuario, id_sesion, meta)
            db.execute_query(sql, params, commit=True)
        except Exception as e:
            print(f"--- ERROR CRÍTICO BITÁCORA --- {e}")

    @staticmethod
    def listar(filtros=None):
        """Consulta el historial formateando la fecha a Día/Mes/Año."""
        filtros = filtros or {}
        query = f"""
            SELECT b.id_bitacora, p.nombre, b.modulo, b.accion, 
                   b.descripcion, b.fecha_registro, b.metadata, b.id_sesion, u.nombre_usuario
            FROM {Config.SCHEMA}.t_bitacora b
            LEFT JOIN {Config.SCHEMA}.t_usuario u ON b.id_usuario = u.id_usuario
            LEFT JOIN {Config.SCHEMA}.t_persona p ON u.id_persona = p.id_persona
            WHERE 1=1
        """
        params = []
        if filtros.get('nombre'):
            query += " AND (p.nombre ILIKE %s OR u.nombre_usuario ILIKE %s)"
            t = f"%{filtros['nombre']}%"; params.extend([t, t])
        
        if filtros.get('modulo'):
            query += " AND b.modulo = %s"; params.append(filtros['modulo'])

        query += " ORDER BY b.fecha_registro DESC LIMIT 200"
        res = db.execute_query(query, tuple(params), fetchall=True)
        
        return [{
            'id': r[0],
            'usuario': r[1] or r[8] or 'SISTEMA',
            'modulo': r[2],
            'accion': r[3],
            'descripcion': r[4],
            # Formato configurado: Día/Mes/Año Hora:Minuto:Segundo
            'fecha': r[5].strftime('%d/%m/%Y %H:%M:%S') if r[5] else None,
            'metadata': r[6],
            'id_sesion': r[7]
        } for r in (res or [])]
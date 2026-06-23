from functools import wraps
from flask import request, jsonify

from app.services.aux_functs import decode_access_token

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        #BUSCA EL TOKEN EN LA CABECERA DEL JSON QUE MANDA EL FRONTEND
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):

                #SEPARAMOS EL TOKEN DE LA PALABRA 'BEARER'
                token = auth_header.split(" ")[1]

        #SI NO SE ENVIO NADA SE DEVUELVE JSON CON SUCCESS FALSE
        if not token:
            return jsonify({'success': False, 'message': 'Falta el token de acceso. Acceso denegado.'}), 401

        #USAMOS FUNCION PARA DECODIFICAR TOKEN
        resultado = decode_access_token(token)

        #SI LA CLAVE 'SUCCESS' DEL JSON QUE DEVUELVE LA DCODIFICACION DEL TOKEN ES FALSO ERROR
        if not resultado['success']:
            return jsonify({'success': False, 'message': resultado['message']}), 401

        #ASIGNAMOS VALORES DEL TOKEN A EL USUARIO
        current_user = resultado['payload']

        #DEVOLVEMOS EL USUARIO A LA RUTA QUE ESTA USANDOLO
        return f(current_user, *args, **kwargs)

    return decorated
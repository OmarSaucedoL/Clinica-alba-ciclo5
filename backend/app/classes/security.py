import jwt
from functools import wraps
from flask import request, jsonify
from ..config import Config, db


class Security:

    @staticmethod
    def decode_token():
        auth_header = request.headers.get("Authorization")
        if not auth_header:
            print("DEBUG: Falta cabecera Authorization")
            return None

        try:
            token = auth_header.split(" ")[1]
            data = jwt.decode(
                token,
                Config.TOKEN_SECRET_KEY,
                algorithms=["HS256"]
            )

            user_id = data.get("user_id")
            if not user_id:
                print("DEBUG: Token sin user_id")
                return None

            return {
                "id_usuario": user_id,
                "rol": data.get("role"),
                "id_persona": data.get("id_persona")
            }

        except jwt.ExpiredSignatureError:
            print("DEBUG: Token expirado")
            return None
        except jwt.InvalidTokenError as e:
            print(f"DEBUG: Token inválido: {e}")
            return None
        except Exception as e:
            print(f"DEBUG: Error en decode_token: {e}")
            return None


    @staticmethod
    def get_user_from_token():
        return Security.decode_token()


    @staticmethod
    def get_user_id():

        user = Security.decode_token()

        return user["id_usuario"] if user else None


# =========================================================
# OBTENER PERMISOS
# =========================================================

def obtener_permisos_usuario(id_usuario):
    query = f"""
        SELECT p.nombre
        FROM {Config.SCHEMA}.t_usuario_permiso up
        INNER JOIN {Config.SCHEMA}.t_permisos p ON p.id_permiso = up.id_permiso
        WHERE up.id_usuario = %s AND up.habilitado = TRUE
    """
    result = db.execute_query(query, (id_usuario,), fetchall=True)
    return [row[0] for row in result] if result else []


# =========================================================
# OBTENER ROL REAL
# =========================================================

def obtener_rol_usuario(id_usuario):

    query = """

        SELECT id_rol
        FROM clinica.t_usuario
        WHERE id_usuario = %s

    """

    result = db.execute_query(
        query,
        (id_usuario,),
        fetchone=True
    )

    return result[0] if result else None


# =========================================================
# ADMIN REQUIRED
# =========================================================

def admin_required(f):

    @wraps(f)
    def wrapper(*args, **kwargs):

        user = Security.decode_token()

        if not user:

            return jsonify({
                "success": False,
                "message": "No autenticado"
            }), 401

        rol_usuario = obtener_rol_usuario(
            user["id_usuario"]
        )

        if rol_usuario != 1:

            return jsonify({
                "success": False,
                "message": "No autorizado"
            }), 403

        return f(*args, **kwargs)

    return wrapper


# =========================================================
# PERMISSION REQUIRED
# =========================================================

def permission_required(*permisos_requeridos):

    def decorator(f):

        @wraps(f)
        def wrapper(*args, **kwargs):

            user = Security.decode_token()

            if not user:

                return jsonify({
                    "success": False,
                    "message": "No autenticado"
                }), 401

            permisos_usuario = obtener_permisos_usuario(
                user["id_usuario"]
            )

            tiene_permiso = any(
                permiso in permisos_usuario
                for permiso in permisos_requeridos
            )

            if not tiene_permiso:

                return jsonify({
                    "success": False,
                    "message": "No tiene permisos para realizar esta accion"
                }), 403

            return f(*args, **kwargs)

        return wrapper

    return decorator
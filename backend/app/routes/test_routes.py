from flask import Blueprint, jsonify
from ..config import db, Config
import logging

# Blueprint
test_routes = Blueprint('test_routes', __name__)

# Configurar logs de errores
LOG_FILE = 'flask_errors.log'
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.ERROR,
    format='%(asctime)s %(levelname)s: %(message)s'
)

@test_routes.route('/api/test/tables', methods=['GET'])
def list_tables():
    """
    Test route para listar todas las tablas del esquema clinica y verificar la BD.
    """
    try:
        # 1. Intentar establecer conexión
        
        # 2. Consultar el nombre de la base de datos actual (Diagnóstico)
        db_name_query = "SELECT current_database();"
        db_name_result = db.execute_query(db_name_query, fetchone=True)
        current_db_name = db_name_result[0] if db_name_result else "Desconocida"

        # 3. Consultar las tablas del esquema configurado
        query = """
            SELECT schemaname, tablename
            FROM pg_catalog.pg_tables
            WHERE schemaname = %s
            ORDER BY tablename;
        """
        
        # Ejecutamos pasando el esquema como parámetro (debe ser 'clinica')
        result = db.execute_query(query, (Config.SCHEMA,), fetchall=True)

        if not result:
            return jsonify({
                'success': True,
                'database_actual': current_db_name,
                'schema_usado': Config.SCHEMA,
                'message': f'No se encontraron tablas. Verifica si el esquema "{Config.SCHEMA}" existe en la BD "{current_db_name}".',
                'tables': []
            })

        tables = [{'schema': row[0], 'table_name': row[1]} for row in result]

        # 4. Respuesta exitosa con toda la info
        return jsonify({
            'success': True,
            'database_actual': current_db_name,
            'schema': Config.SCHEMA,
            'total_tablas': len(tables),
            'tables': tables
        })

    except Exception as e:
        logging.error(f"Error en /api/test/tables: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Error al consultar la DB: {str(e)}'
        })
    finally:
        # Cerramos conexión para liberar recursos en Railway
        db.close_connection()
from flask import Blueprint, request, jsonify, Response
import csv
from io import StringIO
from ..config import db, Config
from ..classes.security import admin_required, permission_required
from ..services.bitacora import Bitacora

inventario_routes = Blueprint('inventario_routes', __name__)


def ejecutar_query_reporte_filtrado(tipo, expirable, estado, f_inicio, f_fin, params_extra):
    id_material = params_extra.get('id_material', '')
    id_proveedor = params_extra.get('id_proveedor', '')
    top = params_extra.get('top', '')
    dias_vencimiento = params_extra.get('dias', '')
    stock_min = params_extra.get('stock_min', '')
    stock_max = params_extra.get('stock_max', '')
    solo_stock = params_extra.get('solo_stock', 'false').lower() == 'true'
    fecha_limite = params_extra.get('fecha', '')

    # Formateo cronológico preventivo para el Reporte Estático o rangos
    fecha_procesada_fin = f_fin
    if tipo == 'estatico' and fecha_limite:
        fecha_procesada_fin = str(fecha_limite).replace("T", " ")
        if len(fecha_procesada_fin) == 16:
            fecha_procesada_fin += ":00"

    # Encabezados dinámicos que se acoplan reactivamente en la interfaz
    headers_map = {
        'general': ["ID", "Descripción", "Precio (Bs.)", "Expirable", "Stock Actual", "Lotes Activos"],
        'mermas': ["ID", "Material", "Precio Catálogo", "Expirable", "Unidades Mermadas", "Nro. Incidentes"],
        'ingresos': ["ID", "Material", "Precio Catálogo", "Expirable", "Total Ingresado", "Nro. Entradas"],
        'vencimientos': ["Código Lote", "Descripción Material", "Precio Base", "Expirable", "Stock en Riesgo", "Conteo"],
        'estatico': ["ID", "Material Clínico", "Precio Catálogo (Bs.)", "Expirable", "Stock a la Fecha", "Movimientos"]
    }
    headers = headers_map.get(tipo, ["ID", "Descripción", "Precio", "Expirable", "Métrica", "Conteo"])

    # Invocación directa a la función procedimental maestra de PostgreSQL
    query = f"""
        SELECT 
            id_insumo, nombre_insumo, precio_catalogo, es_expirable, 
            cantidad_unidades, conteo_lotes_o_incidentes, fecha_referencial, 
            origen_extra, costo_valorizado 
        FROM {Config.SCHEMA}.f_kardex_analitico_universal(
            %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
        )
    """
    
    # Casteos sanitizados para evitar excepciones de tipo en el motor relacional
    params = (
        str(tipo),
        str(expirable),
        str(estado),
        str(f_inicio),
        str(fecha_procesada_fin),
        str(id_material),
        str(id_proveedor),
        str(dias_vencimiento),
        str(stock_min),
        str(stock_max),
        bool(solo_stock),
        int(top) if top else None
    )
    
    rows = db.execute_query(query, params, fetchall=True) or []
    return rows, headers


# =========================================================
# 1. CONSULTAR CATÁLOGO DE MATERIALES (GET)
# =========================================================
@inventario_routes.route('/api/materiales', methods=['GET'])
@admin_required
@permission_required("visualizar_materiales")
def consultar_materiales():
    try:
        query = f"SELECT id_material, nombre_material, precio, expirable, precio_venta FROM {Config.SCHEMA}.t_materiales ORDER BY id_material DESC"
        rows = db.execute_query(query, fetchall=True)
        data = [{"id_material": r[0], "nombre_material": r[1], "precio": float(r[2]), "expirable": r[3], "precio_venta":float(r[4])} for r in (rows or [])]
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 2. REGISTRAR UN NUEVO MATERIAL (POST)
# =========================================================
@inventario_routes.route('/api/materiales', methods=['POST'])
@admin_required
@permission_required("crear_material")
def registrar_material():
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre_material')
        precio = data.get('precio')
        expirable = data.get('expirable', False)
        precio_venta=data.get('precio_venta')

        if not nombre or precio is None:
            return jsonify({"success": False, "message": "Datos incompletos"}), 400

        query = f"INSERT INTO {Config.SCHEMA}.t_materiales (nombre_material, precio, expirable,precio_venta) VALUES (%s, %s, %s,%s)"
        db.execute_query(query, (str(nombre), float(precio), bool(expirable), float(precio_venta)), commit=True)
        Bitacora.registrar("INVENTARIO", "CREATE", f"Material creado: {nombre}")
        return jsonify({"success": True, "message": "Material registrado con éxito"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 3. MODIFICAR UN MATERIAL EXISTENTE (PUT)
# =========================================================
@inventario_routes.route('/api/materiales/<int:id_material>', methods=['PUT'])
@admin_required
@permission_required("modificar_material")
def modificar_material(id_material):
    try:
        data = request.get_json() or {}
        nombre = data.get('nombre_material')
        precio = data.get('precio')
        expirable = data.get('expirable')

        if not nombre or precio is None or expirable is None:
            return jsonify({"success": False, "message": "Datos incompletos"}), 400
        
        query = f"UPDATE {Config.SCHEMA}.t_materiales SET nombre_material = %s, precio = %s, expirable = %s WHERE id_material = %s"
        db.execute_query(query, (str(nombre), float(precio), bool(expirable), int(id_material)), commit=True)
        Bitacora.registrar("INVENTARIO", "UPDATE", f"Material actualizado: {id_material}, {nombre}")
        return jsonify({"success": True, "message": "Material actualizado con éxito"}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 4. ELIMINAR UN MATERIAL (DELETE)
# =========================================================
@inventario_routes.route('/api/materiales/<int:id_material>', methods=['DELETE'])
@admin_required
@permission_required("eliminar_material")
def eliminar_material(id_material):
    try:
        result = db.execute_query(f"SELECT nombre_material FROM {Config.SCHEMA}.t_materiales WHERE id_material = %s", (int(id_material),), fetchone=True)
        if not result:
            return jsonify({"success": False, "message": "Material no encontrado"}), 404        
        
        db.execute_query(f"DELETE FROM {Config.SCHEMA}.t_materiales WHERE id_material = %s", (int(id_material),), commit=True)        
        Bitacora.registrar("INVENTARIO", "DELETE", f"Material eliminado: {id_material}, {result[0]}")
        return jsonify({"success": True, "message": "Material eliminado correctamente"}), 200
    except Exception as e:
        err_msg = str(e)
        if "foreign key" in err_msg.lower() or "llave foránea" in err_msg.lower():
            return jsonify({"success": False, "message": "No se puede eliminar el material porque tiene lotes o movimientos asociados en el almacén."}), 409
        return jsonify({"success": False, "message": err_msg}), 500


# =========================================================
# 5. LISTAR PROVEEDORES (GET)
# =========================================================
@inventario_routes.route('/api/proveedores', methods=['GET'])
@admin_required
def listar_proveedores():
    try:
        query = f"SELECT id_proveedor, nombre_proveedor FROM {Config.SCHEMA}.t_proveedor ORDER BY nombre_proveedor ASC"
        rows = db.execute_query(query, fetchall=True)
        data = [{"id_proveedor": r[0], "nombre_proveedor": r[1]} for r in (rows or [])]
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 6. REGISTRAR ENTRADA DE MATERIAL (POST)
# =========================================================
@inventario_routes.route('/api/inventario/entrada', methods=['POST'])
@admin_required
@permission_required("registrar_entrada")
def registrar_entrada_inventario():
    try:
        data = request.get_json() or {}
        nombre_material = data.get('nombre_material')
        id_material = data.get('id_material')
        cantidad = data.get('cantidad')
        fecha_caducidad = data.get('fecha_caducidad')   
        fecha_fabricacion = data.get('fecha_fabricacion') 
        id_proveedor = data.get('id_proveedor')         

        if not id_material or not cantidad:
            return jsonify({"success": False, "message": "Material y cantidad son obligatorios"}), 400
        if int(cantidad) <= 0:
            return jsonify({"success": False, "message": "La cantidad debe ser mayor a cero"}), 400

        sql = f"CALL {Config.SCHEMA}.p_registrar_entrada_almacen(%s, %s, %s, %s, %s)"
        params = (int(id_material), int(cantidad), fecha_caducidad or None, fecha_fabricacion or None, int(id_proveedor) if id_proveedor else None)
        db.execute_query(sql, params, commit=True)

        Bitacora.registrar("INVENTARIO", "ENTRADA", f"Abastecimiento ID {id_material}. Cantidad: {cantidad}. Nombre: {nombre_material}")
        return jsonify({"success": True, "message": "Entrada registrada correctamente"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 7. REGISTRAR PROVEEDOR EXPRESS (POST)
# =========================================================
@inventario_routes.route('/api/proveedores', methods=['POST'])
@admin_required
def registrar_proveedor_express():
    try:
        data = request.get_json() or {}
        nombre_proveedor = data.get('nombre_proveedor')
        telefono = data.get('telefono') 

        if not nombre_proveedor:
            return jsonify({"success": False, "message": "El nombre del proveedor es obligatorio"}), 400
        if len(nombre_proveedor) > 50:
            return jsonify({"success": False, "message": "El nombre no puede exceder los 50 caracteres."}), 400
        
        query = f"INSERT INTO {Config.SCHEMA}.t_proveedor (nombre_proveedor, telefono) VALUES (%s, %s)"
        db.execute_query(query, (str(nombre_proveedor).upper(), str(telefono) if telefono else None), commit=True)

        Bitacora.registrar("INVENTARIO", "CREATE", f"Proveedor registrado en caliente: {nombre_proveedor}")
        return jsonify({"success": True, "message": "Proveedor registrado correctamente"}), 201
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 8. OBTENER LOTES DE UN MATERIAL (GET ADAPTADO AL PIPELINE MAESTRO)
# =========================================================
@inventario_routes.route('/api/inventario/lotes/<int:id_material>', methods=['GET'])
@admin_required
def obtener_lotes_material(id_material):
    try:
        # Consulta SQL directa para evitar dependencias de funciones externas inexistentes
        query = f"""
            SELECT 
                almacen.id_lote, almacen.cantidad_disponible, almacen.fecha_caducidad, 
                almacen.fecha_fabricacion, prov.nombre_proveedor, almacen.cantidad_inicial 
            FROM {Config.SCHEMA}.t_materiales_almacen almacen
            LEFT JOIN {Config.SCHEMA}.t_proveedor prov ON almacen.id_proveedor = prov.id_proveedor
            WHERE almacen.id_material = %s
            ORDER BY almacen.id_lote DESC
        """
        rows = db.execute_query(query, (int(id_material),), fetchall=True) or []

        data = [{
            "id_lote": r[0], 
            "cantidad_disponible": int(r[1]),
            "fecha_caducidad": str(r[2]) if r[2] else None,
            "fecha_fabricacion": str(r[3]) if r[3] else None,
            "nombre_proveedor": r[4] or "INGRESO DIRECTO",
            "cantidad_inicial": int(r[5])
        } for r in rows]

        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 9. REGISTRAR SALIDA / BAJA DE STOCK (POST)
# =========================================================
@inventario_routes.route('/api/inventario/salida', methods=['POST'])
@admin_required
@permission_required("registrar_salida") 
def registrar_salida_inventario():
    try:
        data = request.get_json() or {}
        id_lote = data.get('id_lote')
        cantidad = data.get('cantidad')
        motivo = data.get('motivo', 'RETIRO') 

        if not id_lote or not cantidad:
            return jsonify({"success": False, "message": "El número de lote y la cantidad son obligatorios"}), 400
        if int(cantidad) <= 0:
            return jsonify({"success": False, "message": "La cantidad a retirar debe ser mayor a cero"}), 400

        sql = f"CALL {Config.SCHEMA}.p_registrar_salida_almacen(%s, %s)"
        db.execute_query(sql, (int(id_lote), int(cantidad)), commit=True)

        Bitacora.registrar("INVENTARIO", "SALIDA", f"Baja de stock. Lote #{id_lote}. Cantidad: {cantidad}. Motivo: {motivo.upper()}")
        return jsonify({"success": True, "message": "Salida procesada con éxito. Stock descontado y Kardex actualizado mediante SP."}), 201
    except Exception as e:
        error_msg = str(e).split("CONTEXT:")[0] if "CONTEXT:" in str(e) else str(e)
        return jsonify({"success": False, "message": error_msg}), 400
    

# =========================================================
# 10. CU28: AJUSTAR INVENTARIO (POST)
# =========================================================
@inventario_routes.route('/api/inventario/ajuste', methods=['POST'])
@admin_required
@permission_required("ajustar_inventario") 
def ajustar_inventario_almacen():
    try:
        data = request.get_json() or {}
        id_lote = data.get('id_lote')
        nuevo_stock = data.get('nuevo_stock')
        motivo = data.get('motivo')

        if id_lote is None or nuevo_stock is None or not motivo:
            return jsonify({"success": False, "message": "El número de lote, el nuevo stock real y la justificación son obligatorios."}), 400

        sql = f"CALL {Config.SCHEMA}.p_ajustar_inventario(%s, %s, %s)"
        db.execute_query(sql, (int(id_lote), int(nuevo_stock), str(motivo)), commit=True)

        Bitacora.registrar("INVENTARIO", "AJUSTE", f"Auditoría física Lote #{id_lote}. Stock adjusted a: {nuevo_stock} u. Motivo: {motivo.upper()}")
        return jsonify({"success": True, "message": "Inventario adjusted con éxito."}), 200
    except Exception as e:
        error_msg = str(e).split("CONTEXT:")[0] if "CONTEXT:" in str(e) else str(e)
        return jsonify({"success": False, "message": error_msg}), 400


# =========================================================
# 11. OBTENER DATOS ANALÍTICOS UNIFICADOS DE PIPELINE (GET JSON)
# =========================================================
@inventario_routes.route('/api/inventario/reportes', methods=['GET'])
@admin_required
@permission_required("visualizar_reportes")
def obtener_datos_reporte():
    try:
        tipo = request.args.get('tipo', 'general')
        expirable = request.args.get('expirable', 'TODOS')
        estado = request.args.get('estado', 'todos')
        f_inicio = request.args.get('fecha_inicio', '')
        f_fin = request.args.get('fecha_fin', '')

        rows, columns = ejecutar_query_reporte_filtrado(tipo, expirable, estado, f_inicio, f_fin, request.args)
        
        data = []
        for r in rows:
            data.append({
                "id": r[0] if tipo != 'vencimientos' else f"LOTE #{r[0]}",
                "descripcion": r[1],
                "precio": float(r[2]),
                "info_extra": r[7] if tipo in ['vencimientos', 'ingresos', 'mermas', 'estatico'] else ("SÍ" if r[3] else "NO"),
                "metrica_core": int(r[4]),
                "conteo_lotes": int(r[5]),
                "fecha_ref": r[6],
                "costo_total": float(r[8])
            })

        return jsonify({"success": True, "columns": columns, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


# =========================================================
# 12. EXPORTAR REPORTE A EXCEL/CSV CON FILTRADO COMPLETO (GET)
# =========================================================
@inventario_routes.route('/api/inventario/reportes/exportar', methods=['GET'])
@admin_required
def exportar_reporte_csv():
    try:
        tipo = request.args.get('tipo', 'general')
        expirable = request.args.get('expirable', 'TODOS')
        estado = request.args.get('estado', 'todos')
        f_inicio = request.args.get('fecha_inicio', '')
        f_fin = request.args.get('fecha_fin', '')
        fecha_corte_param = request.args.get('fecha', '')

        si = StringIO()
        cw = csv.writer(si, delimiter=';') 

        rows, headers = ejecutar_query_reporte_filtrado(tipo, expirable, estado, f_inicio, f_fin, request.args)
        cw.writerow([h.upper() for h in headers])

        for r in rows:
            if tipo == 'general':
                cw.writerow([r[0], r[1], f"{float(r[2]):.2f}", "SÍ" if r[3] else "NO", r[4], r[5]])
            elif tipo == 'mermas':
                cw.writerow([r[0], r[1], f"{float(r[2]):.2f}", "SÍ" if r[3] else "NO", f"-{r[4]}", r[5]])
            elif tipo == 'ingresos':
                cw.writerow([r[0], r[1], f"{float(r[2]):.2f}", "SÍ" if r[3] else "NO", f"+{r[4]}", r[5]])
            elif tipo == 'vencimientos':
                cw.writerow([f"LOTE #{r[0]}", r[1], f"{float(r[2]):.2f}", "SÍ" if r[3] else "NO", r[4], f'="{r[6]}"'])
            elif tipo == 'estatico':
                cw.writerow([r[0], r[1], f"{float(r[2]):.2f}", "SÍ" if r[3] else "NO", r[4], f"Bs. {float(r[8]):.2f}"])

        filename = f"Reporte_{tipo.upper()}_{f_inicio or 'SNAP'}_AL_{f_fin or 'HISTORIAL'}.csv"
        if tipo == 'estatico':
            filename = f"Reporte_ESTATICO_CORTE_{fecha_corte_param.replace(':', '-') if fecha_corte_param else 'AHORA'}.csv"

        output = si.getvalue().encode('latin-1', errors='replace')
        return Response(output, mimetype="text/csv; charset=latin-1", headers={"Content-disposition": f"attachment; filename={filename}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
import io
import csv
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, Response
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from ..config import db, Config
from ..classes.security import Security, admin_required
from ..services.bitacora import Bitacora

asistencia_routes = Blueprint('asistencia_routes', __name__)

# Diccionario global en memoria para guardar los tokens QR generados
# Estructura: { token_str: { "id_creador_qr": int, "expires_at": datetime } }
tokens_asistencia = {}

@asistencia_routes.route('/api/asistencia/generar-token', methods=['GET'])
@admin_required
def generar_token():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
    
    # Generar token único aleatorio
    token = secrets.token_hex(16)
    
    # Guardar en memoria con vigencia de 30 segundos
    expires_at = datetime.now() + timedelta(seconds=30)
    tokens_asistencia[token] = {
        "id_creador_qr": user["id_usuario"],
        "expires_at": expires_at
    }
    
    return jsonify({
        "success": True,
        "token": token,
        "expires_at": expires_at.isoformat()
    }), 200

@asistencia_routes.route('/api/asistencia/marcar', methods=['POST'])
def registrar_asistencia():
    user = Security.decode_token()
    if not user or user["rol"] not in (1, 2, 3, 4):
        return jsonify({"success": False, "message": "No autenticado o no autorizado"}), 401 if not user else 403
        
    token = (request.get_json() or {}).get("token")
    if not token:
        return jsonify({"success": False, "message": "Falta el token de asistencia"}), 400
        
    # Consumir y validar token en un paso para evitar sobrecarga y race conditions
    token_info = tokens_asistencia.pop(token, None)
    if not token_info:
        return jsonify({"success": False, "message": "Código QR inválido o ya utilizado"}), 400
        
    if datetime.now() > token_info["expires_at"]:
        return jsonify({"success": False, "message": "El código QR ha expirado. Por favor, escanee de nuevo."}), 400
        
    try:
        # Determinar automáticamente si es ENTRADA o SALIDA consultando la última marca de hoy
        res = db.execute_query(
            f"SELECT tipo FROM {Config.SCHEMA}.t_asistencia WHERE id_personal = %s AND DATE(fecha_registro) = CURRENT_DATE ORDER BY fecha_registro DESC LIMIT 1",
            (user["id_persona"],), fetchone=True
        )
        tipo = "SALIDA" if res and res[0] == "ENTRADA" else "ENTRADA"
            
        # Registrar asistencia en DB
        res_ins = db.execute_query(
            f"INSERT INTO {Config.SCHEMA}.t_asistencia (id_personal, id_creador_qr, tipo) VALUES (%s, %s, %s) RETURNING id_asistencia, fecha_registro",
            (user["id_persona"], token_info["id_creador_qr"], tipo), fetchone=True, commit=True
        )
        
        # Registrar en bitácora
        Bitacora.registrar("ADMINISTRACION", f"ASISTENCIA_{tipo}", f"Registro de {tipo} para empleado {user['id_persona']}", id_usuario=user["id_usuario"])
        
        return jsonify({
            "success": True,
            "message": f"¡Marca registrada con éxito! Has marcado tu {tipo}.",
            "data": {"id_asistencia": res_ins[0], "tipo": tipo, "fecha_registro": res_ins[1].isoformat()}
        }), 201
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al registrar marca: {str(e)}"}), 500

@asistencia_routes.route('/api/asistencia/historial-personal', methods=['GET'])
def historial_personal():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
        
    id_personal = user["id_persona"]
    
    try:
        query = f"""
            SELECT 
                a.id_asistencia, 
                a.tipo, 
                a.fecha_registro,
                pc.nombre AS nombre_creador
            FROM {Config.SCHEMA}.t_asistencia a
            LEFT JOIN {Config.SCHEMA}.t_usuario uc ON a.id_creador_qr = uc.id_usuario
            LEFT JOIN {Config.SCHEMA}.t_persona pc ON uc.id_persona = pc.id_persona
            WHERE a.id_personal = %s
            ORDER BY a.fecha_registro DESC
        """
        rows = db.execute_query(query, (id_personal,), fetchall=True) or []
        
        data = [{
            "id_asistencia": r[0],
            "tipo": r[1],
            "fecha_registro": r[2].strftime("%d/%m/%Y %H:%M:%S") if r[2] else None,
            "nombre_creador": r[3] or "SISTEMA"
        } for r in rows]
        
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@asistencia_routes.route('/api/asistencia/historial-global', methods=['GET'])
@admin_required
def historial_global():
    try:
        query = f"""
            SELECT 
                a.id_asistencia, 
                a.id_personal, 
                pe.nombre AS nombre_empleado,
                a.id_creador_qr,
                pc.nombre AS nombre_creador,
                a.tipo, 
                a.fecha_registro
            FROM {Config.SCHEMA}.t_asistencia a
            INNER JOIN {Config.SCHEMA}.t_persona pe ON a.id_personal = pe.id_persona
            LEFT JOIN {Config.SCHEMA}.t_usuario uc ON a.id_creador_qr = uc.id_usuario
            LEFT JOIN {Config.SCHEMA}.t_persona pc ON uc.id_persona = pc.id_persona
            ORDER BY a.fecha_registro DESC
        """
        rows = db.execute_query(query, fetchall=True) or []
        
        data = [{
            "id_asistencia": r[0],
            "id_personal": r[1],
            "nombre_empleado": r[2],
            "id_creador_qr": r[3],
            "nombre_creador": r[4] or "SISTEMA",
            "tipo": r[5],
            "fecha_registro": r[6].strftime("%d/%m/%Y %H:%M:%S") if r[6] else None
        } for r in rows]
        
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@asistencia_routes.route('/api/asistencia/reporte-mensual', methods=['GET'])
def reporte_mensual():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
        
    id_personal = request.args.get("id_personal")
    mes = request.args.get("mes") # Formato: YYYY-MM
    
    if not id_personal or not mes:
        return jsonify({"success": False, "message": "Faltan parámetros: id_personal y mes"}), 400
        
    # Validar permisos: Admin puede ver cualquiera, personal solo el suyo propio
    id_personal = int(id_personal)
    if user["rol"] != 1 and user["id_persona"] != id_personal:
        return jsonify({"success": False, "message": "No tiene permisos para ver el historial de otro usuario"}), 403
        
    try:
        data = _obtener_pares_mensual(id_personal, mes)
        return jsonify({
            "success": True,
            "data": data
        }), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

def _obtener_pares_mensual(id_personal, mes):
    query = f"SELECT entrada, salida, duracion FROM {Config.SCHEMA}.f_reporte_asistencia(%s, %s)"
    rows = db.execute_query(query, (id_personal, mes.strip()), fetchall=True) or []
    return [{"entrada": r[0], "salida": r[1], "duracion": r[2]} for r in rows]

def _obtener_info_empleado(id_personal):
    emp_query = f"""
        SELECT pe.nombre, r.tipo_rol
        FROM {Config.SCHEMA}.t_usuario u
        INNER JOIN {Config.SCHEMA}.t_persona pe ON u.id_persona = pe.id_persona
        INNER JOIN {Config.SCHEMA}.t_rol r ON u.id_rol = r.id_rol
        WHERE pe.id_persona = %s
    """
    emp_info = db.execute_query(emp_query, (id_personal,), fetchone=True)
    nombre = emp_info[0] if emp_info else "Empleado Desconocido"
    cargo = emp_info[1] if emp_info else "Empleado"
    return nombre, cargo

def _calcular_totales(pares):
    total_minutes, completed = 0, 0
    for item in pares:
        dur = item.get('duracion') or ""
        if item.get('entrada') and item.get('salida') and "h" in dur:
            completed += 1
            try:
                h, m = map(int, dur.replace("h", "").replace("m", "").split())
                total_minutes += (h * 60) + m
            except Exception: pass
    return completed, f"{total_minutes // 60}h {total_minutes % 60}m"

def _generar_asistencia_pdf(nombre_empleado, cargo, mes, pares):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    story = []
    
    styles = getSampleStyleSheet()
    p_style = lambda name, size, bold=False, color='#2A5C4D', align=0, space=0: ParagraphStyle(
        name, parent=styles['Normal'], fontName='Helvetica-Bold' if bold else 'Helvetica', fontSize=size, leading=size + 3,
        textColor=colors.HexColor(color) if isinstance(color, str) else color, alignment=align, spaceAfter=space
    )
    
    title_style = p_style('T', 18, bold=True, align=1, space=5)
    sub_style = p_style('S', 10, bold=True, color='#148F77', align=1, space=25)
    sec_style = p_style('Sec', 11, bold=True, space=10)
    cell_style = p_style('C', 9, color=colors.black)
    cell_bold = p_style('CB', 9, bold=True, color=colors.black)
    h_cell_style = p_style('HC', 9, bold=True, color=colors.white)
    
    story.append(Paragraph("CLÍNICA ODONTOLÓGICA ALBA", title_style))
    story.append(Paragraph(f"REPORTE MENSUAL DE ASISTENCIA - {mes}", sub_style))
    
    completed_shifts, total_time_str = _calcular_totales(pares)

    def get_table(data, widths, bg_color, is_header=False):
        t = Table(data, colWidths=widths)
        bg_range = ((0, 0), (-1, 0)) if is_header else ((0, 0), (-1, -1))
        t.setStyle(TableStyle([
            ('BACKGROUND', bg_range[0], bg_range[1], colors.HexColor(bg_color)),
            ('ALIGN', (0,0), (-1,-1), 'LEFT'),
            ('PADDING', (0,0), (-1,-1), 8),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor('#E4EFEF')),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#E4EFEF')),
        ]))
        return t

    # Info block
    info_table = get_table([
        [Paragraph("<b>Empleado:</b>", cell_bold), Paragraph(nombre_empleado, cell_style),
         Paragraph("<b>Cargo:</b>", cell_bold), Paragraph(cargo, cell_style)],
        [Paragraph("<b>Período:</b>", cell_bold), Paragraph(mes, cell_style),
         Paragraph("<b>Turnos Completados:</b>", cell_bold), Paragraph(str(completed_shifts), cell_style)]
    ], [100, 160, 110, 130], '#F4F9F9')
    story.append(info_table)
    story.append(Spacer(1, 15))
    
    # Details Section
    story.append(Paragraph("Detalle de Jornada Laboral", sec_style))
    details_data = [[Paragraph(h, h_cell_style) for h in ["Entrada", "Salida", "Duración"]]]
    for item in pares:
        ent, sal, dur = item.get('entrada') or "Falta registrar entrada", item.get('salida') or "Falta registrar salida", item.get('duracion') or "Incompleto"
        details_data.append([
            Paragraph(f"<font color='{'red' if not item.get('entrada') else 'black'}'>{ent}</font>", cell_style),
            Paragraph(f"<font color='{'orange' if not item.get('salida') else 'black'}'>{sal}</font>", cell_style),
            Paragraph(dur, cell_bold if item.get('entrada') and item.get('salida') else cell_style)
        ])
    
    story.append(get_table(details_data, [200, 200, 100], '#2A5C4D', is_header=True))
    story.append(Spacer(1, 15))
    
    # Totals
    stats_table = Table([
        [Paragraph("", cell_style), Paragraph("<b>Total Turnos Completados:</b>", cell_bold), Paragraph(str(completed_shifts), cell_bold)],
        [Paragraph("", cell_style), Paragraph("<b>Tiempo Total Trabajado:</b>", cell_bold), Paragraph(total_time_str, cell_bold)]
    ], colWidths=[250, 170, 80])
    stats_table.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'RIGHT'), ('PADDING', (0,0), (-1,-1), 6)]))
    story.append(stats_table)
    story.append(Spacer(1, 40))
    
    story.append(Paragraph("___________________________", sub_style))
    story.append(Paragraph("Firma del Empleado / Firma Autorizada", p_style('F', 8, color=colors.gray, align=1)))
    
    doc.build(story)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes

def _generar_asistencia_csv(nombre_empleado, cargo, mes, pares):
    completed_shifts, total_time_str = _calcular_totales(pares)
    output = io.StringIO()
    output.write('\ufeff')
    writer = csv.writer(output, delimiter=';')
    
    writer.writerow(["REPORTE DE ASISTENCIA - CLÍNICA ALBA"])
    writer.writerow([])
    writer.writerow(["Empleado", nombre_empleado])
    writer.writerow(["Cargo", cargo])
    writer.writerow(["Período", mes])
    writer.writerow(["Total Turnos Completados", completed_shifts])
    writer.writerow(["Tiempo Total Trabajado", total_time_str])
    writer.writerow([])
    
    writer.writerow(["Entrada", "Salida", "Duración"])
    for item in pares:
        writer.writerow([
            item.get('entrada') or "Falta registrar entrada",
            item.get('salida') or "Falta registrar salida",
            item.get('duracion') or "Incompleto"
        ])
        
    csv_data = output.getvalue()
    output.close()
    return csv_data.encode('utf-8-sig')

@asistencia_routes.route('/api/asistencia/exportar/pdf', methods=['GET'])
def exportar_pdf():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
        
    id_personal = request.args.get("id_personal")
    mes = request.args.get("mes")
    
    if not id_personal or not mes:
        return jsonify({"success": False, "message": "Faltan parámetros"}), 400
        
    id_personal = int(id_personal)
    if user["rol"] != 1 and user["id_persona"] != id_personal:
        return jsonify({"success": False, "message": "No tiene permisos"}), 403
        
    try:
        nombre, cargo = _obtener_info_empleado(id_personal)
        pares = _obtener_pares_mensual(id_personal, mes)
        pdf_bytes = _generar_asistencia_pdf(nombre, cargo, mes, pares)
        
        filename = f"Reporte_Asistencia_{nombre.replace(' ', '_')}_{mes}.pdf"
        return Response(
            pdf_bytes,
            mimetype='application/pdf',
            headers={'Content-Disposition': f'attachment;filename={filename}'}
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@asistencia_routes.route('/api/asistencia/exportar/excel', methods=['GET'])
def exportar_excel():
    user = Security.decode_token()
    if not user:
        return jsonify({"success": False, "message": "No autenticado"}), 401
        
    id_personal = request.args.get("id_personal")
    mes = request.args.get("mes")
    
    if not id_personal or not mes:
        return jsonify({"success": False, "message": "Faltan parámetros"}), 400
        
    id_personal = int(id_personal)
    if user["rol"] != 1 and user["id_persona"] != id_personal:
        return jsonify({"success": False, "message": "No tiene permisos"}), 403
        
    try:
        nombre, cargo = _obtener_info_empleado(id_personal)
        pares = _obtener_pares_mensual(id_personal, mes)
        csv_bytes = _generar_asistencia_csv(nombre, cargo, mes, pares)
        
        filename = f"Reporte_Asistencia_{nombre.replace(' ', '_')}_{mes}.csv"
        return Response(
            csv_bytes,
            mimetype='text/csv',
            headers={'Content-Disposition': f'attachment;filename={filename}'}
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500


@asistencia_routes.route('/api/asistencia/empleados', methods=['GET'])
@admin_required
def listar_empleados_asistencia():
    try:
        query = f"""
            SELECT 
                pe.id_persona, 
                pe.nombre, 
                r.tipo_rol
            FROM {Config.SCHEMA}.t_usuario u
            INNER JOIN {Config.SCHEMA}.t_persona pe ON u.id_persona = pe.id_persona
            INNER JOIN {Config.SCHEMA}.t_rol r ON u.id_rol = r.id_rol
            WHERE u.estado = true AND u.id_rol < 5
            ORDER BY pe.nombre ASC
        """
        rows = db.execute_query(query, fetchall=True) or []
        
        data = [{
            "id_personal": r[0],
            "nombre": r[1],
            "cargo": r[2]
        } for r in rows]
        
        return jsonify({"success": True, "data": data}), 200
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500



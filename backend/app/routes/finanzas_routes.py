from flask import Blueprint, request, jsonify
from ..config import db, Config
from ..utils.email_sender import send_email_brevo
from ..utils.email_templates import generar_html_comprobante
from datetime import datetime
import urllib.request
import json
import base64
import traceback

finanzas_routes = Blueprint('finanzas_routes', __name__)

def get_paypal_access_token():
    url = f"{Config.PAYPAL_BASE_URL}/v1/oauth2/token"
    auth_str = f"{Config.PAYPAL_CLIENT_ID}:{Config.PAYPAL_CLIENT_SECRET}"
    auth_b64 = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
    
    req = urllib.request.Request(
        url,
        data=b"grant_type=client_credentials",
        headers={
            "Authorization": f"Basic {auth_b64}",
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as res:
        data = json.loads(res.read().decode('utf-8'))
        return data["access_token"]


def enviar_comprobante_email(id_cita, monto_bob, metodo_pago, p_fecha, correo_envio):
    try:
        saldo_actual_rec = db.execute_query(
            f"SELECT saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
            (id_cita,),
            fetchone=True
        )
        saldo_actual = float(saldo_actual_rec[0]) if (saldo_actual_rec and saldo_actual_rec[0] is not None) else 0.0

        if not correo_envio:
            email_db = db.execute_query(
                f"""
                SELECT COALESCE(u.correo, '') 
                FROM {Config.SCHEMA}.t_persona p 
                LEFT JOIN {Config.SCHEMA}.t_usuario u ON u.id_persona = p.id_persona 
                WHERE p.id_persona = (SELECT id_paciente FROM {Config.SCHEMA}.t_citas WHERE id_cita = %s)
                """,
                (id_cita,),
                fetchone=True
            )
            correo_envio = email_db[0] if email_db else ""

        if not correo_envio:
            return

        paciente_db = db.execute_query(
            f"SELECT nombre FROM {Config.SCHEMA}.t_persona WHERE id_persona = (SELECT id_paciente FROM {Config.SCHEMA}.t_citas WHERE id_cita = %s)",
            (id_cita,),
            fetchone=True
        )
        nombre_paciente = paciente_db[0] if paciente_db else "Paciente"

        monto_usd = round(monto_bob / Config.PAYPAL_EXCHANGE_RATE, 2)
        html_content = generar_html_comprobante(
            nombre_paciente, 
            id_cita, 
            p_fecha.strftime("%d/%m/%Y %H:%M:%S"), 
            metodo_pago, 
            monto_bob, 
            monto_usd, 
            saldo_actual
        )
        send_email_brevo(correo_envio, "Recibo de Pago - Clínica Alba", html_content, nombre_paciente)
    except Exception as e:
        print("Error en enviar_comprobante_email:", e)


@finanzas_routes.route('/api/finanzas/config', methods=['GET'])
@finanzas_routes.route('/api/pagos/config', methods=['GET'])
def get_finanzas_config():
    return jsonify({
        "success": True,
        "paypal_client_id": Config.PAYPAL_CLIENT_ID,
        "tipo_cambio": Config.PAYPAL_EXCHANGE_RATE
    }), 200


@finanzas_routes.route('/api/finanzas/saldos', methods=['GET'])
@finanzas_routes.route('/api/saldos', methods=['GET'])
def listar_todos_saldos():
    try:
        query = f"""
            SELECT 
                c.id_cita, 
                c.fecha_agendamiento, 
                c.id_paciente, 
                p_pac.nombre AS nombre_paciente,
                c.id_personal, 
                p_od.nombre AS nombre_odontologo,
                s.id_saldo, 
                s.saldo_inicial, 
                s.saldo_actual
            FROM {Config.SCHEMA}.t_citas c
            JOIN {Config.SCHEMA}.t_persona p_pac ON p_pac.id_persona = c.id_paciente
            JOIN {Config.SCHEMA}.t_persona p_od ON p_od.id_persona = c.id_personal
            LEFT JOIN {Config.SCHEMA}.t_saldo s ON s.id_cita = c.id_cita
            ORDER BY c.fecha_agendamiento DESC
        """
        results = db.execute_query(query, fetchall=True) or []
        
        saldos_list = []
        for r in results:
            id_cita = r[0]
            fecha_agendamiento = r[1]
            id_paciente = r[2]
            nombre_paciente = r[3]
            id_personal = r[4]
            nombre_odontologo = r[5]
            id_saldo = r[6]
            saldo_inicial = float(r[7]) if r[7] is not None else 0.0
            saldo_actual = float(r[8]) if r[8] is not None else 0.0
            
            saldos_list.append({
                "id_saldo": id_saldo,
                "id_cita": id_cita,
                "fecha_agendamiento": fecha_agendamiento.strftime("%d/%m/%y %H:%M") if fecha_agendamiento else None,
                "id_paciente": id_paciente,
                "nombre_paciente": nombre_paciente,
                "id_personal": id_personal,
                "nombre_odontologo": nombre_odontologo,
                "saldo_inicial_bob": saldo_inicial,
                "saldo_actual_bob": saldo_actual,
                "saldo_inicial_usd": round(saldo_inicial / Config.PAYPAL_EXCHANGE_RATE, 2),
                "saldo_actual_usd": round(saldo_actual / Config.PAYPAL_EXCHANGE_RATE, 2)
            })
            
        return jsonify({"success": True, "data": saldos_list}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/saldos/<int:id_cita>', methods=['GET'])
@finanzas_routes.route('/api/saldos/<int:id_cita>', methods=['GET'])
def obtener_saldo(id_cita):
    try:
        costo_materiales = db.execute_query(
            f"SELECT {Config.SCHEMA}.fn_calcular_costo_materiales_cita(%s)",
            (id_cita,),
            fetchone=True
        )
        costo_materiales = float(costo_materiales[0]) if (costo_materiales and costo_materiales[0] is not None) else 0.0

        saldo_db = db.execute_query(
            f"SELECT saldo_inicial, saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
            (id_cita,),
            fetchone=True
        )

        descuento = 0.0
        if not saldo_db:
            db.execute_query(
                f"CALL {Config.SCHEMA}.p_generar_saldo_cita(%s, 0)",
                (id_cita,),
                commit=True
            )
            saldo_db = db.execute_query(
                f"SELECT saldo_inicial, saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
                (id_cita,),
                fetchone=True
            )
        else:
            saldo_inicial = float(saldo_db[0]) if saldo_db[0] is not None else 0.0
            descuento = max(0.0, costo_materiales - saldo_inicial)
            db.execute_query(
                f"CALL {Config.SCHEMA}.p_generar_saldo_cita(%s, %s)",
                (id_cita, descuento),
                commit=True
            )
            saldo_db = db.execute_query(
                f"SELECT saldo_inicial, saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
                (id_cita,),
                fetchone=True
            )

        saldo_inicial = float(saldo_db[0]) if (saldo_db and saldo_db[0] is not None) else costo_materiales
        saldo_actual = float(saldo_db[1]) if (saldo_db and saldo_db[1] is not None) else costo_materiales

        facturas_db = db.execute_query(
            f"""
            SELECT id_factura, nombre, metodo_pago, fecha_factura, monto_cancelado 
            FROM {Config.SCHEMA}.t_facturas 
            WHERE id_cita = %s 
            ORDER BY fecha_factura DESC
            """,
            (id_cita,),
            fetchall=True
        ) or []

        historial_pagos = [{
            "id_factura": f[0],
            "nombre_factura": f[1],
            "metodo_pago": f[2],
            "fecha_factura": f[3].strftime("%d/%m/%y %H:%M") if f[3] else None,
            "monto_bob": float(f[4]) if f[4] is not None else 0.0,
            "monto_usd": round((float(f[4]) if f[4] is not None else 0.0) / Config.PAYPAL_EXCHANGE_RATE, 2)
        } for f in facturas_db]

        cita_db = db.execute_query(
            f"""
            SELECT c.fecha_agendamiento, p.nombre as nombre_paciente, p.id_persona
            FROM {Config.SCHEMA}.t_citas c
            JOIN {Config.SCHEMA}.t_persona p ON p.id_persona = c.id_paciente
            WHERE c.id_cita = %s
            """,
            (id_cita,),
            fetchone=True
        )
        
        fecha_agendamiento = cita_db[0].strftime("%d/%m/%y %H:%M") if (cita_db and cita_db[0]) else None
        nombre_paciente = cita_db[1] if cita_db else "Paciente Desconocido"
        id_paciente = cita_db[2] if cita_db else None

        return jsonify({
            "success": True,
            "data": {
                "id_cita": id_cita,
                "id_paciente": id_paciente,
                "nombre_paciente": nombre_paciente,
                "fecha_agendamiento": fecha_agendamiento,
                "costo_materiales_bob": costo_materiales,
                "descuento_bob": descuento,
                "saldo_inicial_bob": saldo_inicial,
                "saldo_actual_bob": saldo_actual,
                "saldo_inicial_usd": round(saldo_inicial / Config.PAYPAL_EXCHANGE_RATE, 2),
                "saldo_actual_usd": round(saldo_actual / Config.PAYPAL_EXCHANGE_RATE, 2),
                "tipo_cambio": Config.PAYPAL_EXCHANGE_RATE,
                "historial_pagos": historial_pagos
            }
        }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/saldos/paciente/<int:id_paciente>', methods=['GET'])
@finanzas_routes.route('/api/saldos/paciente/<int:id_paciente>', methods=['GET'])
def obtener_saldos_paciente(id_paciente):
    try:
        query = f"""
            SELECT 
                s.id_saldo, 
                s.id_cita, 
                s.saldo_inicial, 
                s.saldo_actual, 
                c.fecha_agendamiento,
                c.id_personal,
                p_od.nombre AS nombre_odontologo,
                c.id_paciente,
                p_pac.nombre AS nombre_paciente
            FROM {Config.SCHEMA}.t_saldo s
            JOIN {Config.SCHEMA}.t_citas c ON c.id_cita = s.id_cita
            JOIN {Config.SCHEMA}.t_persona p_pac ON p_pac.id_persona = c.id_paciente
            JOIN {Config.SCHEMA}.t_persona p_od ON p_od.id_persona = c.id_personal
            WHERE c.id_paciente = %s
            ORDER BY c.fecha_agendamiento DESC
        """
        results = db.execute_query(query, (id_paciente,), fetchall=True) or []

        saldos = [{
            "id_saldo": r[0],
            "id_cita": r[1],
            "saldo_inicial_bob": float(r[2]) if r[2] is not None else 0.0,
            "saldo_actual_bob": float(r[3]) if r[3] is not None else 0.0,
            "saldo_inicial_usd": round((float(r[2]) if r[2] is not None else 0.0) / Config.PAYPAL_EXCHANGE_RATE, 2),
            "saldo_actual_usd": round((float(r[3]) if r[3] is not None else 0.0) / Config.PAYPAL_EXCHANGE_RATE, 2),
            "fecha_agendamiento": r[4].strftime("%d/%m/%y %H:%M") if r[4] else None,
            "id_personal": r[5],
            "nombre_odontologo": r[6],
            "id_paciente": r[7],
            "nombre_paciente": r[8]
        } for r in results]

        return jsonify({"success": True, "data": saldos}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/saldos/generar', methods=['POST'])
@finanzas_routes.route('/api/saldos/generar', methods=['POST'])
def generar_saldo():
    try:
        data = request.get_json() or {}
        id_cita = data.get('id_cita')
        descuento = float(data.get('descuento', 0.0))

        if not id_cita:
            return jsonify({"success": False, "message": "ID de cita requerido"}), 400

        db.execute_query(
            f"CALL {Config.SCHEMA}.p_generar_saldo_cita(%s, %s)",
            (id_cita, descuento),
            commit=True
        )
        return jsonify({"success": True, "message": "Saldo generado exitosamente"}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/paypal/crear-orden', methods=['POST'])
@finanzas_routes.route('/api/pagos/paypal/crear-orden', methods=['POST'])
def crear_paypal_orden():
    try:
        data = request.get_json() or {}
        id_cita = data.get('id_cita')
        monto_bob = float(data.get('monto_bob', 0.0))

        if not id_cita or monto_bob <= 0:
            return jsonify({"success": False, "message": "Datos de pago inválidos"}), 400

        saldo_db = db.execute_query(
            f"SELECT saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
            (id_cita,),
            fetchone=True
        )
        if not saldo_db:
            return jsonify({"success": False, "message": "No hay saldo registrado para esta cita"}), 400

        saldo_actual = float(saldo_db[0]) if saldo_db[0] is not None else 0.0
        if monto_bob > (saldo_actual + 0.01):
            return jsonify({"success": False, "message": f"El monto a pagar ({monto_bob} BOB) supera el saldo actual ({saldo_actual} BOB)"}), 400

        monto_usd = max(0.01, round(monto_bob / Config.PAYPAL_EXCHANGE_RATE, 2))

        access_token = get_paypal_access_token()
        url = f"{Config.PAYPAL_BASE_URL}/v2/checkout/orders"
        body = {
            "intent": "CAPTURE",
            "purchase_units": [{"amount": {"currency_code": "USD", "value": f"{monto_usd:.2f}"}, "description": f"Pago Cita ID: {id_cita}"}]
        }
        
        req_data = json.dumps(body).encode('utf-8')
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            res_body = json.loads(res.read().decode('utf-8'))
            return jsonify({
                "success": True,
                "order_id": res_body["id"],
                "monto_usd": monto_usd,
                "monto_bob": monto_bob
            }), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/paypal/capturar-orden', methods=['POST'])
@finanzas_routes.route('/api/pagos/paypal/capturar-orden', methods=['POST'])
def capturar_paypal_orden():
    try:
        data = request.get_json() or {}
        id_cita = data.get('id_cita')
        order_id = data.get('order_id')
        monto_bob = float(data.get('monto_bob', 0.0))
        nombre_factura = data.get('nombre_factura', '').strip()
        correo_envio = data.get('correo_envio', '').strip()

        if not id_cita or not order_id or monto_bob <= 0:
            return jsonify({"success": False, "message": "Datos de captura inválidos"}), 400

        access_token = get_paypal_access_token()
        url = f"{Config.PAYPAL_BASE_URL}/v2/checkout/orders/{order_id}/capture"
        
        req = urllib.request.Request(
            url,
            data=b"",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=10) as res:
            res_body = json.loads(res.read().decode('utf-8'))
            if res_body.get("status") != "COMPLETED":
                return jsonify({"success": False, "message": "El pago no se completó en PayPal"}), 400

        p_fecha = datetime.now()
        db.execute_query(
            f"CALL {Config.SCHEMA}.p_register_factura(%s, %s, %s, %s, %s)",
            (id_cita, nombre_factura or "PAGO PAYPAL", "PAYPAL", p_fecha, monto_bob),
            commit=True
        )

        enviar_comprobante_email(id_cita, monto_bob, "PAYPAL", p_fecha, correo_envio)

        return jsonify({"success": True, "message": "Pago registrado y comprobante enviado."}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500


@finanzas_routes.route('/api/finanzas/registrar-manual', methods=['POST'])
@finanzas_routes.route('/api/pagos/registrar-manual', methods=['POST'])
def registrar_pago_manual():
    try:
        data = request.get_json() or {}
        id_cita = data.get('id_cita')
        monto_bob = float(data.get('monto_bob', 0.0))
        nombre_factura = data.get('nombre_factura', '').strip()
        metodo_pago = data.get('metodo_pago', 'EFECTIVO').strip()
        correo_envio = data.get('correo_envio', '').strip()

        if not id_cita or monto_bob <= 0:
            return jsonify({"success": False, "message": "Datos de pago manual inválidos"}), 400

        saldo_db = db.execute_query(
            f"SELECT saldo_actual FROM {Config.SCHEMA}.t_saldo WHERE id_cita = %s",
            (id_cita,),
            fetchone=True
        )
        if not saldo_db:
            return jsonify({"success": False, "message": "No hay saldo registrado para esta cita"}), 400

        saldo_actual = float(saldo_db[0]) if saldo_db[0] is not None else 0.0
        if monto_bob > (saldo_actual + 0.01):
            return jsonify({"success": False, "message": f"El monto a pagar ({monto_bob} BOB) supera el saldo actual ({saldo_actual} BOB)"}), 400

        p_fecha = datetime.now()
        db.execute_query(
            f"CALL {Config.SCHEMA}.p_register_factura(%s, %s, %s, %s, %s)",
            (id_cita, nombre_factura or metodo_pago, metodo_pago, p_fecha, monto_bob),
            commit=True
        )

        enviar_comprobante_email(id_cita, monto_bob, metodo_pago, p_fecha, correo_envio)

        return jsonify({"success": True, "message": "Pago manual registrado y comprobante enviado."}), 200
    except Exception as e:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

def generar_html_comprobante(nombre_paciente, id_cita, fecha_pago, metodo_pago, monto_bob, monto_usd, saldo_restante_bob):
    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; margin: 0; padding: 20px; background-color: #F4F9F9;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 30px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #E4EFEF;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2A5C4D; margin: 0; font-style: italic; font-weight: 900;">CLÍNICA ODONTOLÓGICA ALBA</h2>
            <p style="color: #148F77; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px;">Comprobante de Pago Recibido</p>
          </div>
          
          <div style="border-bottom: 2px dashed #E4EFEF; padding-bottom: 20px; margin-bottom: 20px;">
            <p style="margin: 5px 0; font-size: 13px; color: #666;"><strong>Paciente:</strong> {nombre_paciente}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;"><strong>Cita ID:</strong> #{id_cita}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;"><strong>Fecha de Pago:</strong> {fecha_pago}</p>
            <p style="margin: 5px 0; font-size: 13px; color: #666;"><strong>Método de Pago:</strong> {metodo_pago}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #2A5C4D; font-size: 16px; margin-bottom: 15px;">Resumen de la Transacción</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #F0F7F7;">
                <td style="padding: 10px 0; font-size: 13px; color: #666;">Monto Cancelado (BOB)</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #2A5C4D;">{monto_bob:.2f} BOB</td>
              </tr>
              <tr style="border-bottom: 1px solid #F0F7F7;">
                <td style="padding: 10px 0; font-size: 13px; color: #666;">Equivalente en Dólares (USD)</td>
                <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #2A5C4D;">${monto_usd:.2f} USD</td>
              </tr>
              <tr>
                <td style="padding: 15px 0 10px 0; font-size: 14px; font-weight: bold; color: #333;">Saldo Pendiente Actual</td>
                <td style="padding: 15px 0 10px 0; text-align: right; font-weight: bold; font-size: 16px; color: #D32F2F;">{saldo_restante_bob:.2f} BOB</td>
              </tr>
            </table>
          </div>
          
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #E4EFEF;">
            <p style="font-size: 11px; color: #999; margin: 0;">Gracias por confiar su salud dental a nosotros.</p>
            <p style="font-size: 10px; color: #aaa; margin: 5px 0 0 0;">Este es un comprobante automatizado emitido por el sistema de Clínica Alba.</p>
          </div>
        </div>
      </body>
    </html>
    """

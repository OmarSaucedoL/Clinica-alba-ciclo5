import React from "react";

// Función utilitaria para convertir números a palabras (Bolivian invoice format)
function numeroALetras(num) {
  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = {
    11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    20: "VEINTE", 21: "VEINTIUN", 22: "VEINTIDOS", 23: "VEINTITRES",
    24: "VEINTICUATRO", 25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE",
    28: "VEINTIOCHO", 29: "VEINTINUEVE"
  };
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];

  const convertirGrupo = (n) => {
    let output = "";
    const c = Math.floor(n / 100);
    const d = Math.floor((n % 100) / 10);
    const u = n % 10;
    
    if (n === 100) return "CIEN";
    if (c > 0) output += centenas[c] + " ";
    
    const resto = n % 100;
    if (resto > 0) {
      if (especiales[resto]) {
        output += especiales[resto] + " ";
      } else {
        if (d > 0) {
          output += decenas[d];
          if (u > 0) output += " Y " + unidades[u];
          output += " ";
        } else if (u > 0) {
          output += unidades[u] + " ";
        }
      }
    }
    return output.trim();
  };

  const entero = Math.floor(num);
  const decimales = Math.round((num - entero) * 100);
  const centavos = `${decimales.toString().padStart(2, "0")}/100 BOLIVIANOS`;

  if (entero === 0) return `CERO CON ${centavos}`;
  
  let texto = "";
  if (entero >= 1000) {
    const miles = Math.floor(entero / 1000);
    const restoMiles = entero % 1000;
    texto += (miles === 1 ? "MIL" : convertirGrupo(miles) + " MIL") + " ";
    if (restoMiles > 0) texto += convertirGrupo(restoMiles) + " ";
  } else {
    texto += convertirGrupo(entero) + " ";
  }
  
  return `${texto.trim()} CON ${centavos}`;
}

export default function Comprobante({ receipt, onClose }) {
  if (!receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  let nombreCliente = receipt.nombre_factura || "Paciente";
  let nitCi = "S/N";
  let telefono = "";
  
  if (nombreCliente.includes(" - NIT: ")) {
    const parts = nombreCliente.split(" - NIT: ");
    nombreCliente = parts[0];
    const rest = parts[1];
    if (rest.includes(" - Tel: ")) {
      const subParts = rest.split(" - Tel: ");
      nitCi = subParts[0];
      telefono = subParts[1];
    } else {
      nitCi = rest;
    }
  }

  const handleWhatsApp = () => {
    let cleanPhone = telefono ? telefono.replace(/\D/g, "") : "";
    if (cleanPhone && cleanPhone.length === 8) {
      cleanPhone = "591" + cleanPhone;
    }
    
    const text = `*CLÍNICA ODONTOLÓGICA ALBA*\n` +
      `¡Hola *${nombreCliente}*! Le hacemos llegar el comprobante formal de su pago:\n\n` +
      `*Nro Comprobante:* REC-${receipt.id_factura || receipt.id_cita}\n` +
      `*Cita ID:* #${receipt.id_cita}\n` +
      `*Monto Cancelado:* ${receipt.monto_bob ? receipt.monto_bob.toFixed(2) : "0.00"} BOB (~$${receipt.monto_usd ? receipt.monto_usd.toFixed(2) : "0.00"} USD)\n` +
      `*Método de Pago:* ${receipt.metodo_pago}\n` +
      (receipt.saldo_restante_bob !== undefined ? `*Saldo Pendiente:* ${receipt.saldo_restante_bob.toFixed(2)} BOB\n` : "") +
      `*Fecha:* ${receipt.fecha_factura || "N/A"}\n\n` +
      `*¡Muchas gracias por su preferencia!*`;
      
    const url = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  const literalMonto = numeroALetras(receipt.monto_bob || 0);

  return (
    <div className="fixed inset-0 bg-[#2A5C4D]/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 overflow-y-auto">
      {/* Estilos CSS dinámicos para forzar que solo se imprima el comprobante */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-receipt, #printable-receipt * {
            visibility: visible !important;
          }
          #printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div 
        id="printable-receipt"
        className="bg-white rounded-[3rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-fade-in-up border border-gray-100 flex flex-col my-8"
      >
        {/* Cabecera Tipo Factura */}
        <div className="p-8 bg-gradient-to-br from-gray-50 to-white border-b border-gray-100 relative">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            
            {/* Lado Izquierdo: Información Clínica */}
            <div className="text-left space-y-2">
              <div className="flex items-center gap-2">
                <div>
                  <h2 className="text-xl font-black text-[#2A5C4D] tracking-tight italic leading-tight">
                    CLÍNICA ALBA
                  </h2>
                  <p className="text-[9px] text-[#148F77] font-black tracking-widest uppercase">Odontología Integral</p>
                </div>
              </div>
              <div className="text-[9px] text-gray-500 font-bold space-y-0.5 leading-relaxed">
                <p>Dirección: Av. San Martín #145, Edif. Sonrisas</p>
                <p>Teléfonos: 3-3456789 • 77123456</p>
                <p>Sucursal Central • Santa Cruz - Bolivia</p>
              </div>
            </div>

            {/* Lado Derecho: Recuadro Factura Oficial */}
            <div className="border-2 border-[#2A5C4D] rounded-2xl p-4 bg-white text-center space-y-1.5 shadow-sm max-w-[280px] mx-auto md:ml-auto">
              <h3 className="text-xs font-black text-[#2A5C4D] uppercase tracking-wider">NIT: 1029384756</h3>
              <div className="h-[1px] bg-gray-100 w-full my-1"></div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">N° FACTURA / RECIBO</p>
              <p className="text-base font-black text-[#148F77] font-mono leading-none">
                REC-{receipt.id_factura || receipt.id_cita}
              </p>
              <div className="h-[1px] bg-gray-100 w-full my-1"></div>
              <p className="text-[8px] font-bold text-gray-400 uppercase leading-none">AUTORIZACIÓN N°</p>
              <p className="text-[10px] font-bold text-gray-700 font-mono leading-none">2904001100342</p>
              <div className="inline-block bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 mt-1">
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">ORIGINAL</p>
              </div>
            </div>

          </div>

          <div className="absolute top-6 right-6 no-print">
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all focus:outline-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo del Recibo */}
        <div className="p-8 space-y-6 flex-1 text-xs">
          
          {/* Ficha de Información del Cliente */}
          <div className="bg-[#F4F9F9] rounded-[2rem] p-6 border border-emerald-50 space-y-3">
            <h4 className="text-[10px] font-black text-[#2A5C4D] uppercase tracking-widest">
              Datos de Facturación
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-gray-600 font-medium">
              <div>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Nombre / Razón Social</span>
                <span className="text-gray-800 font-black text-sm uppercase">{nombreCliente}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">NIT / CI del Cliente</span>
                <span className="text-gray-800 font-black text-sm font-mono">{nitCi}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Fecha de Emisión</span>
                <span className="text-gray-800 font-bold">{receipt.fecha_factura || "N/A"}</span>
              </div>
              {telefono && (
                <div>
                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Teléfono Asociado</span>
                  <span className="text-gray-800 font-bold">{telefono}</span>
                </div>
              )}
              <div>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Cita Médica Nro</span>
                <span className="text-gray-800 font-bold font-mono">#{receipt.id_cita}</span>
              </div>
              <div>
                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Método de Pago</span>
                <span className="text-emerald-600 font-black uppercase font-mono">{receipt.metodo_pago}</span>
              </div>
            </div>
          </div>

          {/* Tabla de Conceptos Detallada */}
          <div className="space-y-2">
            <h4 className="text-[10px] font-black text-[#2A5C4D] uppercase tracking-widest">
              Detalle del Servicio
            </h4>
            <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#2A5C4D] text-white text-[9px] font-black uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">N°</th>
                    <th className="py-3 px-4">Concepto / Descripción</th>
                    <th className="py-3 px-4 w-16 text-center">Cant.</th>
                    <th className="py-3 px-4 w-28 text-right">P. Unitario (BOB)</th>
                    <th className="py-3 px-4 w-28 text-right">Total (BOB)</th>
                  </tr>
                </thead>
                <tbody className="font-medium text-gray-700 divide-y divide-gray-100">
                  <tr>
                    <td className="py-4 px-4 text-center text-gray-400 font-mono">1</td>
                    <td className="py-4 px-4 leading-relaxed">
                      <p className="font-bold text-gray-800">Abono / Cuota Dental Integrada</p>
                      <p className="text-[9px] text-gray-400">Tratamiento e insumos correspondientes a la cita médica #{receipt.id_cita}</p>
                    </td>
                    <td className="py-4 px-4 text-center">1</td>
                    <td className="py-4 px-4 text-right font-mono">{receipt.monto_bob ? receipt.monto_bob.toFixed(2) : "0.00"}</td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-gray-800">
                      {receipt.monto_bob ? receipt.monto_bob.toFixed(2) : "0.00"}
                    </td>
                  </tr>
                  {/* Fila del tipo de cambio equivalente */}
                  <tr className="bg-gray-50/50">
                    <td></td>
                    <td className="py-2.5 px-4 text-gray-400 italic">Equivalente en moneda extranjera (T.C. 9.85)</td>
                    <td className="text-center text-gray-400 font-mono">-</td>
                    <td className="text-right text-gray-400 font-mono italic">${receipt.monto_usd ? receipt.monto_usd.toFixed(2) : "0.00"}</td>
                    <td className="py-2.5 px-4 text-right font-mono text-gray-400 italic">
                      ${receipt.monto_usd ? receipt.monto_usd.toFixed(2) : "0.00"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bloque de Totales y Literal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* Monto Escrito */}
            <div className="space-y-1 bg-gray-50 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center">
              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Importe en Palabras</span>
              <p className="font-black text-gray-800 text-[10px] leading-tight uppercase font-mono">
                Son: {literalMonto}
              </p>
            </div>

            {/* Cuadro Resumen Financiero */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 divide-y divide-gray-200 space-y-2">
              <div className="flex justify-between items-center text-gray-500 font-medium">
                <span>Subtotal Recibo:</span>
                <span className="font-mono font-bold text-gray-700">{receipt.monto_bob ? receipt.monto_bob.toFixed(2) : "0.00"} BOB</span>
              </div>
              <div className="flex justify-between items-center text-gray-500 font-medium pt-2">
                <span>Descuentos Aplicados:</span>
                <span className="font-mono font-bold text-emerald-600">0.00 BOB</span>
              </div>
              <div className="flex justify-between items-center pt-2 font-black text-[#2A5C4D] text-sm">
                <span>TOTAL OFICIAL:</span>
                <span className="font-mono text-lg">{receipt.monto_bob ? receipt.monto_bob.toFixed(2) : "0.00"} BOB</span>
              </div>
              {receipt.saldo_restante_bob !== undefined && (
                <div className="flex justify-between items-center pt-2 font-bold text-red-500 text-xs">
                  <span>Saldo Pendiente Restante:</span>
                  <span className="font-mono text-red-600">{receipt.saldo_restante_bob.toFixed(2)} BOB</span>
                </div>
              )}
            </div>

          </div>

          {/* Pie de Factura Formal y QR */}
          <div className="pt-6 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
            
            {/* Leyenda y Código de Control */}
            <div className="sm:col-span-2 text-left space-y-2">
              <div className="text-[9px] font-mono text-gray-400 font-bold uppercase leading-tight">
                <p>Código de Control: 8A-A2-3F-99-BC</p>
                <p className="mt-1">Fecha Límite de Emisión: 31/12/2026</p>
              </div>
              <p className="text-[8px] text-gray-400 leading-relaxed font-semibold">
                "ESTA FACTURA CONTRIBUYE AL DESARROLLO DEL PAÍS, EL USO ILÍCITO DE ÉSTA SERÁ SANCIONADO DE ACUERDO A LA LEY"
              </p>
            </div>

            {/* QR Code de Control Tributario */}
            <div className="flex justify-center sm:justify-end">
              <svg width="80" height="80" viewBox="0 0 100 100" className="bg-white p-1.5 border-2 border-gray-100 rounded-xl shadow-sm">
                <path d="M 0 0 h 30 v 30 h -30 z M 10 10 h 10 v 10 h -10 z M 70 0 h 30 v 30 h -30 z M 80 10 h 10 v 10 h -10 z M 0 70 h 30 v 30 h -30 z M 10 80 h 10 v 10 h -10 z M 40 40 h 10 v 10 h -10 z M 50 50 h 10 v 10 h -10 z M 60 40 h 10 v 10 h -10 z M 40 60 h 10 v 10 h -10 z" fill="#2A5C4D" />
                <path d="M 40 10 h 10 v 10 h -10 z M 50 20 h 10 v 10 h -10 z M 80 40 h 10 v 10 h -10 z M 80 60 h 10 v 10 h -10 z M 90 80 h 10 v 10 h -10 z" fill="#148F77" />
              </svg>
            </div>

          </div>

          {/* Slogan */}
          <div className="text-center pt-2 text-[#148F77] font-semibold text-[10px] tracking-widest uppercase">
            Clínica Odontológica Alba • Sonrisas que Inspiran
          </div>
        </div>

        {/* Footer no imprimible */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row gap-3 justify-end no-print flex-shrink-0 w-full">
          <button
            onClick={handleWhatsApp}
            className="flex-1 py-3 bg-[#148F77] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#0f6b59] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Enviar por WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md hover:bg-[#1f453a] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            Imprimir Recibo
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-500 hover:text-gray-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

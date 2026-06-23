import React, { useState, useEffect } from "react";
import { exportToExcel, exportToWord } from "../../services/exporter";
import AsistenteVoz from "../../components/UIs/reportes/AsistenteVoz";

export default function ReporteFinanzas({ dataMaster, user, setActiveMenu }) {
  const [activeSubTab, setActiveSubTab] = useState("resumen");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [metodosData, setMetodosData] = useState([]);
  const [mensualData, setMensualData] = useState([]);
  const [odontologosData, setOdontologosData] = useState([]);
  const [procedimientosData, setProcedimientosData] = useState([]);
  const [saldos, setSaldos] = useState({
    total_deudas: 0,
    total_saldo_inicial: 0.0,
    total_saldo_actual: 0.0,
    total_amortizado: 0.0
  });
  const [kpis, setKpis] = useState({
    total_ingresos: 0.0,
    saldo_pendiente: 0.0,
    total_amortizado: 0.0,
    total_transacciones: 0
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  const fetchReporte = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_desde", fechaInicio);
      if (fechaFin) params.append("fecha_hasta", fechaFin);

      const res = await fetch(`${API_URL}/reportes/finanzas?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        }
      });
      const result = await res.json();

      if (result.success) {
        setMetodosData(result.metodos_pago || []);
        setMensualData(result.evolucion_mensual || []);
        setOdontologosData(result.ingresos_odontologos || []);
        setProcedimientosData(result.ingresos_procedimientos || []);
        if (result.saldos) setSaldos(result.saldos);
        if (result.kpis) setKpis(result.kpis);
      } else {
        setErrorMessage(result.message || "Error al obtener el reporte financiero.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error de conexión al obtener el reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReporte();
  }, []);

  const handleExcel = () => {
    exportToExcel("table-finanzas", `Reporte_Financiero_${new Date().toISOString().slice(0,10)}`, "Reporte Consolidado Financiero");
  };

  const handleWord = () => {
    exportToWord("table-finanzas", `Reporte_Financiero_${new Date().toISOString().slice(0,10)}`, "Reporte Consolidado Financiero");
  };

  const totalAmortizadoPorcentaje = saldos.total_saldo_inicial > 0
    ? (saldos.total_amortizado / saldos.total_saldo_inicial) * 100
    : 0;

  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-emerald-50 relative overflow-hidden print:border-none print:shadow-none print-section">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter;
            margin: 12mm 15mm 12mm 15mm;
          }
          .print-section {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: auto !important;
          }
          th, td {
            padding: 8px 6px !important;
            font-size: 11px !important;
            word-break: break-word !important;
          }
          th {
            color: #148F77 !important;
            background-color: rgba(20, 143, 119, 0.05) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      ` }} />

      {/* TITULO Y DESCRIPCION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-[#2A5C4D]">Reporte Financiero</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Caja, ingresos liquidados por métodos de pago y análisis de cuentas pendientes de cobro (saldos).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AsistenteVoz setActiveMenu={setActiveMenu} userRolId={user?.rol} />
          <button
            onClick={fetchReporte}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-[#148F77] text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:bg-[#0f6b59] hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Generar Reporte"}
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8 print:p-0">
        <div className="max-w-7xl mx-auto">
          {/* MEMBRETE IMPRESION */}
          <div className="hidden print:flex flex-col mb-8">
            <div className="flex justify-between items-end border-b-2 border-[#148F77] pb-4 mb-4">
              <div>
                <h1 className="text-[#2A5C4D] font-black text-xl uppercase tracking-wide">
                  CLÍNICA ODONTOLÓGICA ALBA
                </h1>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  Reporte Financiero y Contabilidad de Caja
                </p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <div>Emisión: {new Date().toLocaleDateString("es-BO")}</div>
                <div>Auditor: @{user?.nombre_usuario || "ADMINISTRADOR"}</div>
              </div>
            </div>
          </div>

          {/* FILTROS */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 print:hidden">
            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Desde (Fecha Factura)
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] bg-gray-50"
              />
            </div>

            <div className="w-full sm:w-1/2">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Hasta (Fecha Factura)
              </label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] bg-gray-50"
              />
            </div>
          </div>

          {/* SELECTOR DE SUB-PESTAÑAS */}
          <div className="flex flex-wrap gap-2 mb-8 bg-gray-50 p-2 rounded-2xl print:hidden">
            {[
              { id: "resumen", label: "Tablero General" },
              { id: "metodos", label: "Ingresos por Método" },
              { id: "mensual", label: "Evolución Mensual" },
              { id: "odontologos", label: "Ingresos por Odontólogo" },
              { id: "procedimientos", label: "Ingresos por Tratamiento" },
              { id: "proyecciones", label: "Simulación de Cobranzas" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 ${
                  activeSubTab === tab.id
                    ? "bg-[#148F77] text-white shadow-md scale-[1.02]"
                    : "text-gray-500 hover:text-[#148F77] hover:bg-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-2 pb-6 border-b border-gray-100 print:hidden">
            {(metodosData.length > 0 || mensualData.length > 0) && (
              <div className="flex gap-3">
                <button
                  onClick={handleExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={handleWord}
                  className="bg-blue-800 hover:bg-blue-900 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Exportar Word
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Imprimir / PDF
                </button>
              </div>
            )}
          </div>

          {/* TAB CONTENT VIEWS */}
          <div className="mt-8">
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl print:hidden">
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <>
                {/* 1. TABLERO GENERAL */}
                {activeSubTab === "resumen" && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* KPIS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="bg-[#148F77]/5 p-5 rounded-2xl border border-[#148F77]/10 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1 text-center">Ingresos Liquidados</p>
                        <p className="text-2xl font-black text-[#2A5C4D]">Bs. {kpis.total_ingresos.toFixed(2)}</p>
                      </div>
                      <div className="bg-rose-50/50 p-5 rounded-2xl border border-rose-100 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 text-center">Cuentas por Cobrar</p>
                        <p className="text-2xl font-black text-rose-800">Bs. {kpis.saldo_pendiente.toFixed(2)}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Monto Amortizado</p>
                        <p className="text-2xl font-black text-emerald-800">Bs. {kpis.total_amortizado.toFixed(2)}</p>
                      </div>
                      <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Transacciones</p>
                        <p className="text-3xl font-black text-blue-800">{kpis.total_transacciones}</p>
                      </div>
                    </div>

                    {/* AMORTIZATION PROGRESS */}
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Progreso de Amortización de Saldos</span>
                        <span className="text-xs font-black text-[#148F77]">{totalAmortizadoPorcentaje.toFixed(1)}% Cobrado</span>
                      </div>
                      <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${totalAmortizadoPorcentaje}%` }}
                          className="bg-[#148F77] h-full rounded-full transition-all duration-1000"
                        />
                      </div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase mt-2">
                        De una deuda inicial proyectada de Bs. {saldos.total_saldo_inicial.toFixed(2)}, se han amortizado Bs. {saldos.total_amortizado.toFixed(2)}.
                      </p>
                    </div>
                  </div>
                )}

                {/* 2. INGRESOS POR MÉTODO */}
                {activeSubTab === "metodos" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Ingresos por Método de Pago
                    </h3>
                    {metodosData.length > 0 ? (
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Método</th>
                            <th className="py-3.5 px-4 text-center">Transacciones</th>
                            <th className="py-3.5 px-4 text-right">Recaudado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {metodosData.map((m, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{m.metodo_pago}</td>
                              <td className="py-3.5 px-4 text-center font-bold">{m.transacciones}</td>
                              <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">Bs. {m.total_recaudado.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic">No hay ingresos registrados en el periodo</div>
                    )}
                  </div>
                )}

                {/* 3. EVOLUCIÓN MENSUAL */}
                {activeSubTab === "mensual" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Evolución de Recaudación Mensual
                    </h3>
                    {mensualData.length > 0 ? (
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Periodo</th>
                            <th className="py-3.5 px-4 text-center">Cobros</th>
                            <th className="py-3.5 px-4 text-right">Monto Recaudado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {mensualData.map((m, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-gray-700">{m.mes}/{m.anio}</td>
                              <td className="py-3.5 px-4 text-center font-bold">{m.transacciones}</td>
                              <td className="py-3.5 px-4 text-right font-semibold text-[#148F77]">Bs. {m.total_recaudado.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic">No hay cobros mensuales registrados</div>
                    )}
                  </div>
                )}

                {/* 4. INGRESOS POR ODONTÓLOGO */}
                {activeSubTab === "odontologos" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Recaudación por Odontólogo Tratante (Dinámico)
                    </h3>
                    {odontologosData.length > 0 ? (
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Odontólogo</th>
                            <th className="py-3.5 px-4 text-center">Citas Atendidas</th>
                            <th className="py-3.5 px-4 text-right">Monto Recaudado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {odontologosData.map((o, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{o.nombre_odontologo}</td>
                              <td className="py-3.5 px-4 text-center font-bold">{o.total_citas}</td>
                              <td className="py-3.5 px-4 text-right font-black text-emerald-600">Bs. {o.total_facturado.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic">No hay datos de recaudación por odontólogo</div>
                    )}
                  </div>
                )}

                {/* 5. INGRESOS POR TRATAMIENTO */}
                {activeSubTab === "procedimientos" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Recaudación por Tipo de Tratamiento / Procedimiento (Dinámico)
                    </h3>
                    {procedimientosData.length > 0 ? (
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Procedimiento</th>
                            <th className="py-3.5 px-4 text-center">Tratamientos Realizados</th>
                            <th className="py-3.5 px-4 text-right">Ingresos Facturados</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {procedimientosData.map((p, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-gray-800 uppercase">{p.nombre_procedimiento}</td>
                              <td className="py-3.5 px-4 text-center font-bold">{p.total_citas}</td>
                              <td className="py-3.5 px-4 text-right font-black text-emerald-600">Bs. {p.total_facturado.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic">No hay datos de recaudación por tratamientos</div>
                    )}
                  </div>
                )}

                {/* 6. SIMULACIÓN DE COBRANZAS */}
                {activeSubTab === "proyecciones" && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="bg-gray-50 border border-gray-100 p-6 rounded-3xl">
                      <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider mb-2">
                        Simulador Analítico de Recaudación de Saldos Pendientes
                      </h3>
                      <p className="text-xs text-gray-500 mb-6 font-medium">
                        Visualiza los ingresos proyectados y el flujo de caja total de la clínica al recuperar diferentes porcentajes de la cartera actual de cuentas por cobrar (Bs. {kpis.saldo_pendiente.toFixed(2)}).
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
                        <div className="bg-orange-50 border border-orange-100 p-5 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Escenario Conservador (30%)</p>
                          <p className="text-xs text-gray-400 font-bold mb-2">Recuperando Bs. {(kpis.saldo_pendiente * 0.3).toFixed(2)}</p>
                          <p className="text-xl font-black text-orange-800">Bs. {(kpis.total_ingresos + kpis.saldo_pendiente * 0.3).toFixed(2)}</p>
                          <span className="text-[8px] font-black uppercase text-orange-500 tracking-wider">Caja Total Proyectada</span>
                        </div>

                        <div className="bg-[#148F77]/5 border border-[#148F77]/10 p-5 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1">Escenario Moderado (50%)</p>
                          <p className="text-xs text-gray-400 font-bold mb-2">Recuperando Bs. {(kpis.saldo_pendiente * 0.5).toFixed(2)}</p>
                          <p className="text-xl font-black text-[#2A5C4D]">Bs. {(kpis.total_ingresos + kpis.saldo_pendiente * 0.5).toFixed(2)}</p>
                          <span className="text-[8px] font-black uppercase text-[#148F77] tracking-wider">Caja Total Proyectada</span>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl shadow-sm">
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Escenario Optimista (80%)</p>
                          <p className="text-xs text-gray-400 font-bold mb-2">Recuperando Bs. {(kpis.saldo_pendiente * 0.8).toFixed(2)}</p>
                          <p className="text-xl font-black text-emerald-800">Bs. {(kpis.total_ingresos + kpis.saldo_pendiente * 0.8).toFixed(2)}</p>
                          <span className="text-[8px] font-black uppercase text-emerald-500 tracking-wider">Caja Total Proyectada</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COMBINED EXPORTABLE HTML TABLE (Hidden in screen, visible only for Excel/Word references) */}
          <table id="table-finanzas" className="hidden">
            <thead>
              <tr>
                <th>Tipo Reporte</th>
                <th>Concepto / Periodo</th>
                <th>Transacciones / Citas</th>
                <th>Total Recaudado (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="4" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>INGRESOS POR MÉTODO DE PAGO</td>
              </tr>
              {metodosData.map((m, idx) => (
                <tr key={`m-${idx}`}>
                  <td>Método de Pago</td>
                  <td>{m.metodo_pago}</td>
                  <td>{m.transacciones}</td>
                  <td>{m.total_recaudado}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>EVOLUCIÓN MENSUAL</td>
              </tr>
              {mensualData.map((m, idx) => (
                <tr key={`me-${idx}`}>
                  <td>Mensual</td>
                  <td>{m.mes}/{m.anio}</td>
                  <td>{m.transacciones}</td>
                  <td>{m.total_recaudado}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>INGRESOS POR ODONTÓLOGO</td>
              </tr>
              {odontologosData.map((o, idx) => (
                <tr key={`o-${idx}`}>
                  <td>Odontólogo Treatment</td>
                  <td>{o.nombre_odontologo}</td>
                  <td>{o.total_citas}</td>
                  <td>{o.total_facturado}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>INGRESOS POR TRATAMIENTO</td>
              </tr>
              {procedimientosData.map((p, idx) => (
                <tr key={`pr-${idx}`}>
                  <td>Procedimiento</td>
                  <td>{p.nombre_procedimiento}</td>
                  <td>{p.total_citas}</td>
                  <td>{p.total_facturado}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="4" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>CUENTAS POR COBRAR (SALDOS)</td>
              </tr>
              <tr>
                <td>Saldos Iniciales</td>
                <td>Total Proyectado</td>
                <td>{saldos.total_deudas} deudas</td>
                <td>{saldos.total_saldo_inicial}</td>
              </tr>
              <tr>
                <td>Amortizaciones</td>
                <td>Total Cobrado</td>
                <td>-</td>
                <td>{saldos.total_amortizado}</td>
              </tr>
              <tr>
                <td>Saldos Pendientes</td>
                <td>Total por Cobrar</td>
                <td>-</td>
                <td>{saldos.total_saldo_actual}</td>
              </tr>
            </tbody>
          </table>

          {/* SIGNATURES IMPRESION */}
          <div className="hidden print:flex justify-between items-center mt-16 pt-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">DIRECTOR FINANCIERO</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Firma y Sello</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">AUDITOR GENERAL</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Vo.Bo.</p>
            </div>
          </div>

          {/* FOOTER IMPRESION */}
          <div className="hidden print:flex justify-between items-center text-[8px] text-gray-400 mt-8 pt-4 border-t border-gray-200">
            <div>EMISOR: {user?.nombre || "Administrador"}</div>
            <div>Pág. 1 de 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

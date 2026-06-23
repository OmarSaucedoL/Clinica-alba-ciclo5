import React, { useState, useEffect } from "react";
import { exportToExcel, exportToWord } from "../../../services/exporter";
import AsistenteVoz from "./AsistenteVoz";

export default function ReporteAdministracion({ dataMaster, user, setActiveMenu }) {
  const [activeSubTab, setActiveSubTab] = useState("resumen");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [salasData, setSalasData] = useState([]);
  const [serviciosData, setServiciosData] = useState([]);
  const [procedimientosData, setProcedimientosData] = useState([]);
  const [personalData, setPersonalData] = useState([]);
  const [kpis, setKpis] = useState({
    total_salas_activas: 0,
    total_servicios_ingreso: 0.0,
    total_procedimientos_ingreso: 0.0,
    total_servicios_solicitados: 0,
    total_procedimientos_solicitados: 0
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

      const res = await fetch(`${API_URL}/reportes/administracion?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        }
      });
      const result = await res.json();

      if (result.success) {
        setSalasData(result.salas || []);
        setServiciosData(result.servicios || []);
        setProcedimientosData(result.procedimientos || []);
        setPersonalData(result.personal || []);
        if (result.kpis) setKpis(result.kpis);
      } else {
        setErrorMessage(result.message || "Error al obtener el reporte administrativo.");
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
    exportToExcel("table-administracion", `Reporte_Administrativo_${new Date().toISOString().slice(0,10)}`, "Reporte Consolidado Operativo y de Consultorios");
  };

  const handleWord = () => {
    exportToWord("table-administracion", `Reporte_Administrativo_${new Date().toISOString().slice(0,10)}`, "Reporte Consolidado Operativo y de Consultorios");
  };

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
            margin-bottom: 20px !important;
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
          <h2 className="text-2xl font-black text-[#2A5C4D]">Reporte Administrativo</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Estadísticas operativas de consultorios (salas), facturación estimada por servicios y procedimientos.
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
                  Reporte Operativo y de Consultorios Dentales
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
                Desde (Fecha Citas)
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
                Hasta (Fecha Citas)
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
              { id: "resumen", label: "Resumen Operativo" },
              { id: "salas", label: "Ocupación Consultorios" },
              { id: "servicios", label: "Demanda de Servicios" },
              { id: "procedimientos", label: "Tratamientos Dentales" },
              { id: "personal", label: "Personal de Apoyo" }
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
            {(salasData.length > 0 || serviciosData.length > 0 || procedimientosData.length > 0) && (
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
                  className="bg-blue-600 hover:bg-[#0f6b59] text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Imprimir / PDF
                </button>
              </div>
            )}
          </div>

          {/* TABLES */}
          <div className="space-y-12 mt-8">
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
                {/* 1. RESUMEN OPERATIVO */}
                {activeSubTab === "resumen" && (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 animate-fadeIn">
                    <div className="bg-[#148F77]/5 p-5 rounded-2xl border border-[#148F77]/10 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1 text-center">Salas Ocupadas</p>
                      <p className="text-3xl font-black text-[#2A5C4D]">{kpis.total_salas_activas}</p>
                    </div>
                    <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Ingresos por Servicios</p>
                      <p className="text-xl font-black text-emerald-800">Bs. {kpis.total_servicios_ingreso.toFixed(2)}</p>
                    </div>
                    <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 text-center">Ingresos por Proced.</p>
                      <p className="text-xl font-black text-blue-800">Bs. {kpis.total_procedimientos_ingreso.toFixed(2)}</p>
                    </div>
                    <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 text-center">Servicios Atendidos</p>
                      <p className="text-3xl font-black text-amber-800">{kpis.total_servicios_solicitados}</p>
                    </div>
                    <div className="bg-purple-50/50 p-5 rounded-2xl border border-purple-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-1 text-center">Proced. Realizados</p>
                      <p className="text-3xl font-black text-purple-800">{kpis.total_procedimientos_solicitados}</p>
                    </div>
                  </div>
                )}

                {/* 2. CONSULTORIOS */}
                {activeSubTab === "salas" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Uso y Ocupación de Consultorios (Salas)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Código Sala</th>
                            <th className="py-3.5 px-4">Nombre Sala</th>
                            <th className="py-3.5 px-4">Tipo</th>
                            <th className="py-3.5 px-4">Estado Actual</th>
                            <th className="py-3.5 px-4 text-center">Citas Programadas</th>
                            <th className="py-3.5 px-4 text-center">Completadas</th>
                            <th className="py-3.5 px-4 text-center">Canceladas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {salasData.map((s) => (
                            <tr key={s.id_sala} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-gray-400">SALA #{s.id_sala}</td>
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{s.nombre_sala}</td>
                              <td className="py-3.5 px-4 text-gray-500">{s.tipo_sala}</td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black ${s.estado_sala === "ACTIVO" || s.estado_sala === "DISPONIBLE" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-500 border border-red-100"}`}>{s.estado_sala}</span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-gray-600">{s.total_citas}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{s.completadas}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-red-500">{s.canceladas}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. SERVICIOS */}
                {activeSubTab === "servicios" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Demanda e Ingresos por Servicios Clínicos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Código Servicio</th>
                            <th className="py-3.5 px-4">Nombre Servicio</th>
                            <th className="py-3.5 px-4">Precio Sugerido</th>
                            <th className="py-3.5 px-4 text-center">Veces Solicitado</th>
                            <th className="py-3.5 px-4 text-right">Facturación Estimada</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {serviciosData.map((srv) => (
                            <tr key={srv.id_servicio} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-gray-400">SRV #{srv.id_servicio}</td>
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{srv.nombre_servicio}</td>
                              <td className="py-3.5 px-4 font-semibold">Bs. {srv.precio_sugerido?.toFixed(2)}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-gray-600">{srv.total_solicitudes}</td>
                              <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">Bs. {srv.ingresos_estimados.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. PROCEDIMIENTOS */}
                {activeSubTab === "procedimientos" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Demanda e Ingresos por Procedimientos Médicos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Código Proced.</th>
                            <th className="py-3.5 px-4">Descripción Procedimiento</th>
                            <th className="py-3.5 px-4">Costo Tratamiento</th>
                            <th className="py-3.5 px-4 text-center">Tratamientos Realizados</th>
                            <th className="py-3.5 px-4 text-right">Ingresos Facturados</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {procedimientosData.map((p) => (
                            <tr key={p.id_procedimiento} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-gray-400">PROC #{p.id_procedimiento}</td>
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre_procedimiento}</td>
                              <td className="py-3.5 px-4 font-semibold">Bs. {p.precio?.toFixed(2)}</td>
                              <td className="py-3.5 px-4 text-center font-bold text-gray-600">{p.total_solicitudes}</td>
                              <td className="py-3.5 px-4 text-right font-semibold text-emerald-600">Bs. {p.ingresos_estimados.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. PERSONAL DE APOYO */}
                {activeSubTab === "personal" && (
                  <div className="space-y-4 animate-fadeIn">
                    <h3 className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider border-b border-gray-100 pb-2">
                      Desempeño y Citas Gestionadas por Personal de Apoyo (Dinámico)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-gray-100 rounded-2xl overflow-hidden">
                        <thead>
                          <tr className="bg-gray-50 text-[9px] font-black uppercase text-gray-400 border-b border-gray-100">
                            <th className="py-3.5 px-4">Funcionario</th>
                            <th className="py-3.5 px-4">Cargo / Rol</th>
                            <th className="py-3.5 px-4 text-center">Citas Asistidas / Gestionadas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 text-gray-600 font-medium">
                          {personalData.map((p, index) => (
                            <tr key={index} className="hover:bg-gray-50/50">
                              <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre_personal}</td>
                              <td className="py-3.5 px-4 font-semibold text-gray-500 uppercase">{p.cargo}</td>
                              <td className="py-3.5 px-4 text-center font-black text-emerald-600 bg-emerald-50/30">{p.citas_gestionadas} citas</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* COMBINED EXPORTABLE HTML TABLE (Hidden in screen, visible only for Excel/Word references) */}
          <table id="table-administracion" className="hidden">
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Elemento / Nombre</th>
                <th>Tipo / Precio Base (Bs.)</th>
                <th>Citas / Solicitudes Totales</th>
                <th>Ingresos Estimados (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>OCUPACIÓN DE CONSULTORIOS (SALAS)</td>
              </tr>
              {salasData.map((s, idx) => (
                <tr key={`s-${idx}`}>
                  <td>Salas</td>
                  <td>{s.nombre_sala}</td>
                  <td>{s.tipo_sala}</td>
                  <td>{s.total_citas} citas ({s.completadas} completadas)</td>
                  <td>-</td>
                </tr>
              ))}
              <tr>
                <td colSpan="5" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>DEMANDA DE SERVICIOS</td>
              </tr>
              {serviciosData.map((srv, idx) => (
                <tr key={`srv-${idx}`}>
                  <td>Servicios</td>
                  <td>{srv.nombre_servicio}</td>
                  <td>{srv.precio_sugerido}</td>
                  <td>{srv.total_solicitudes}</td>
                  <td>{srv.ingresos_estimados}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="5" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>TRATAMIENTOS Y PROCEDIMIENTOS</td>
              </tr>
              {procedimientosData.map((p, idx) => (
                <tr key={`p-${idx}`}>
                  <td>Procedimientos</td>
                  <td>{p.nombre_procedimiento}</td>
                  <td>{p.precio}</td>
                  <td>{p.total_solicitudes}</td>
                  <td>{p.ingresos_estimados}</td>
                </tr>
              ))}
              <tr>
                <td colSpan="5" style={{ fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>DESEMPEÑO DE PERSONAL DE APOYO</td>
              </tr>
              {personalData.map((p, idx) => (
                <tr key={`pers-${idx}`}>
                  <td>Personal</td>
                  <td>{p.nombre_personal}</td>
                  <td>{p.cargo}</td>
                  <td>{p.citas_gestionadas} citas</td>
                  <td>-</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* SIGNATURES IMPRESION */}
          <div className="hidden print:flex justify-between items-center mt-16 pt-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">DIRECTOR MÉDICO</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Firma y Sello</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">ADMINISTRADOR GENERAL</p>
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

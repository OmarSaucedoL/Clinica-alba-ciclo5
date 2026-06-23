import React, { useState, useEffect } from "react";
import { exportToExcel, exportToWord } from "../../services/exporter";
import AsistenteVoz from "../../components/UIs/reportes/AsistenteVoz";

export default function ReportePacientes({ dataMaster, user, setActiveMenu }) {
  const [activeSubTab, setActiveSubTab] = useState("resumen");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [pacienteSearch, setPacienteSearch] = useState("");
  const [reportData, setReportData] = useState([]);
  const [kpis, setKpis] = useState({
    total_pacientes: 0,
    pacientes_activos: 0,
    deuda_total: 0,
    pagado_total: 0
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
      if (pacienteSearch) params.append("nombre", pacienteSearch);

      const res = await fetch(`${API_URL}/reportes/pacientes?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json"
        }
      });
      const result = await res.json();

      if (result.success) {
        setReportData(result.data || []);
        if (result.kpis) {
          setKpis(result.kpis);
        }
        if ((result.data || []).length === 0) {
          setErrorMessage("No se encontraron registros de pacientes.");
        }
      } else {
        setErrorMessage(result.message || "Error al obtener reporte de pacientes.");
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
    exportToExcel("table-pacientes", `Reporte_Pacientes_${new Date().toISOString().slice(0,10)}`, "Reporte Detallado de Pacientes");
  };

  const handleWord = () => {
    exportToWord("table-pacientes", `Reporte_Pacientes_${new Date().toISOString().slice(0,10)}`, "Reporte Detallado de Pacientes");
  };

  // Client-side analytics for patient ranking
  const pacientesConDeuda = reportData.filter(p => p.saldo_pendiente > 0).length;

  const pacienteFrecuente = reportData.length > 0
    ? reportData.reduce((prev, current) => (prev.total_citas > current.total_citas) ? prev : current)
    : null;

  const pacienteMayorAbonador = reportData.length > 0
    ? reportData.reduce((prev, current) => (prev.total_pagado > current.total_pagado) ? prev : current)
    : null;

  const pacienteMayorDeudor = reportData.length > 0
    ? reportData.reduce((prev, current) => (prev.saldo_pendiente > current.saldo_pendiente) ? prev : current)
    : null;

  const tabs = [
    { id: "resumen", label: "Resumen e Indicadores" },
    { id: "general", label: "Historial General" },
    { id: "frecuentes", label: "Pacientes Frecuentes" },
    { id: "aportes", label: "Mayor Aporte" },
    { id: "deudores", label: "Deudores" },
    { id: "inactivos", label: "Pacientes Inactivos" }
  ];

  const pacientesFrecuentes = [...reportData].sort((a, b) => b.total_citas - a.total_citas);
  const pacientesAportes = [...reportData].sort((a, b) => b.total_pagado - a.total_pagado);
  const pacientesDeudores = [...reportData].sort((a, b) => b.saldo_pendiente - a.saldo_pendiente);
  const pacientesInactivos = reportData.filter(p => {
    if (!p.ultima_cita) return true;
    try {
      const lastDate = new Date(p.ultima_cita.replace(" ", "T"));
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return lastDate < sixMonthsAgo;
    } catch (e) {
      return false;
    }
  });

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
          <h2 className="text-2xl font-black text-[#2A5C4D]">Reporte de Pacientes</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Análisis consolidado del historial de visitas y total de citas asistidas.
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
                  Reporte Detallado de Pacientes e Historial Contable
                </p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <div>Emisión: {new Date().toLocaleDateString("es-BO")}</div>
                <div>Auditor: @{user?.nombre_usuario || "ADMINISTRADOR"}</div>
              </div>
            </div>
            {(fechaInicio || fechaFin) && (
              <div className="text-xs text-gray-600 font-medium mb-4">
                <p>
                  <strong>Periodo:</strong> {fechaInicio ? fechaInicio : "Inicio"} al {fechaFin ? fechaFin : "Presente"}
                </p>
              </div>
            )}
          </div>

          {/* FILTROS */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 print:hidden">
            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Buscar Paciente
              </label>
              <input
                type="text"
                placeholder="Buscar por nombre..."
                className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] bg-gray-50"
                value={pacienteSearch}
                onChange={(e) => setPacienteSearch(e.target.value)}
              />
            </div>

            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Desde (Fecha Agend.)
              </label>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] bg-gray-50"
              />
            </div>

            <div className="w-full sm:w-1/3">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Hasta (Fecha Agend.)
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
            {tabs.map((tab) => (
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
            {reportData.length > 0 && activeSubTab !== "resumen" && (
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

          {/* VISTAS DE PESTAÑAS */}
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
            ) : reportData.length > 0 ? (
              <>
                {/* 1. PESTAÑA RESUMEN E INDICADORES */}
                {activeSubTab === "resumen" && (
                  <div className="space-y-8 animate-fadeIn">
                    {/* KPIS CARDS */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="bg-[#148F77]/5 p-6 rounded-2xl border border-[#148F77]/10 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1 text-center">Total Pacientes Registrados</p>
                        <p className="text-4xl font-black text-[#2A5C4D]">{kpis.total_pacientes}</p>
                      </div>
                      <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">Pacientes Activos (Con Citas)</p>
                        <p className="text-4xl font-black text-emerald-800">{kpis.pacientes_activos}</p>
                      </div>
                      <div className="bg-rose-50/50 p-6 rounded-2xl border border-rose-100 flex flex-col justify-center items-center shadow-sm">
                        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1 text-center">Pacientes con Deuda Activa</p>
                        <p className="text-4xl font-black text-rose-800">{pacientesConDeuda}</p>
                      </div>
                    </div>

                    {/* RATINGS / CUADROS DE HONOR */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      <div className="bg-gray-50 border border-gray-100/70 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Paciente más Frecuente</p>
                          <h4 className="text-base font-black text-[#2A5C4D] uppercase">
                            {pacienteFrecuente && pacienteFrecuente.total_citas > 0 ? pacienteFrecuente.nombre : "Ninguno"}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mt-4">
                          {pacienteFrecuente && pacienteFrecuente.total_citas > 0 ? `${pacienteFrecuente.total_citas} citas agendadas` : "Sin datos"}
                        </p>
                      </div>

                      <div className="bg-gray-50 border border-gray-100/70 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Mayor Aporte Financiero</p>
                          <h4 className="text-base font-black text-blue-700 uppercase">
                            {pacienteMayorAbonador && pacienteMayorAbonador.total_pagado > 0 ? pacienteMayorAbonador.nombre : "Ninguno"}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mt-4">
                          {pacienteMayorAbonador && pacienteMayorAbonador.total_pagado > 0 ? `Bs. ${pacienteMayorAbonador.total_pagado.toFixed(2)} pagados` : "Sin datos"}
                        </p>
                      </div>

                      <div className="bg-gray-50 border border-gray-100/70 p-6 rounded-2xl flex flex-col justify-between shadow-sm">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Mayor Saldo de Deuda</p>
                          <h4 className="text-base font-black text-rose-600 uppercase">
                            {pacienteMayorDeudor && pacienteMayorDeudor.saldo_pendiente > 0 ? pacienteMayorDeudor.nombre : "Ninguno"}
                          </h4>
                        </div>
                        <p className="text-xs text-gray-500 font-bold mt-4">
                          {pacienteMayorDeudor && pacienteMayorDeudor.saldo_pendiente > 0 ? `Bs. ${pacienteMayorDeudor.saldo_pendiente.toFixed(2)} pendiente` : "Sin datos"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PESTAÑA HISTORIAL GENERAL */}
                {activeSubTab === "general" && (
                  <div className="overflow-x-auto print:overflow-visible animate-fadeIn">
                    <table id="table-pacientes" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                          <th className="py-3.5 px-4 print:py-2 print:px-2">Paciente ID</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2">Nombre</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2">C.I.</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2">Teléfono</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2 text-center">Citas</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2 text-center">Comple.</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2 text-center">Cancel.</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2 text-right">Pagado (Bs.)</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2 text-right">Saldo (Bs.)</th>
                          <th className="py-3.5 px-4 print:py-2 print:px-2">Última Visita</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                        {reportData.map((p) => (
                          <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent print:even:bg-gray-50">
                            <td className="py-3.5 px-4 font-bold text-gray-400 print:py-2 print:px-2">#{p.id_paciente}</td>
                            <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase print:text-gray-700 print:py-2 print:px-2">{p.nombre}</td>
                            <td className="py-3.5 px-4 print:py-2 print:px-2">{p.ci || "N/A"}</td>
                            <td className="py-3.5 px-4 print:py-2 print:px-2">{p.telefono || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-600 print:py-2 print:px-2">{p.total_citas}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600 print:py-2 print:px-2">{p.completadas}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-red-500 print:py-2 print:px-2">{p.canceladas}</td>
                            <td className="py-3.5 px-4 text-right font-semibold text-blue-700 print:py-2 print:px-2">Bs. {p.total_pagado.toFixed(2)}</td>
                            <td className="py-3.5 px-4 text-right font-semibold text-rose-600 print:py-2 print:px-2">Bs. {p.saldo_pendiente.toFixed(2)}</td>
                            <td className="py-3.5 px-4 text-gray-400 print:py-2 print:px-2">{p.ultima_cita || "Sin citas"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 3. PESTAÑA RANKING FRECUENCIA */}
                {activeSubTab === "frecuentes" && (
                  <div className="overflow-x-auto print:overflow-visible animate-fadeIn">
                    <table id="table-pacientes" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                          <th className="py-3.5 px-4">Posición</th>
                          <th className="py-3.5 px-4">Paciente ID</th>
                          <th className="py-3.5 px-4">Nombre</th>
                          <th className="py-3.5 px-4">C.I.</th>
                          <th className="py-3.5 px-4 text-center">Citas Totales</th>
                          <th className="py-3.5 px-4 text-center">Completadas</th>
                          <th className="py-3.5 px-4 text-center">Canceladas</th>
                          <th className="py-3.5 px-4">Última Visita</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                        {pacientesFrecuentes.map((p, idx) => (
                          <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-[#148F77]">#{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-400">#{p.id_paciente}</td>
                            <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre}</td>
                            <td className="py-3.5 px-4">{p.ci || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-gray-800 bg-[#148F77]/5">{p.total_citas}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{p.completadas}</td>
                            <td className="py-3.5 px-4 text-center font-bold text-red-500">{p.canceladas}</td>
                            <td className="py-3.5 px-4 text-gray-400">{p.ultima_cita || "N/A"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 4. PESTAÑA RANKING APORTES */}
                {activeSubTab === "aportes" && (
                  <div className="overflow-x-auto print:overflow-visible animate-fadeIn">
                    <table id="table-pacientes" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                          <th className="py-3.5 px-4">Posición</th>
                          <th className="py-3.5 px-4">Paciente ID</th>
                          <th className="py-3.5 px-4">Nombre</th>
                          <th className="py-3.5 px-4">Teléfono</th>
                          <th className="py-3.5 px-4 text-center">Citas Asistidas</th>
                          <th className="py-3.5 px-4 text-right">Total Aportado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                        {pacientesAportes.map((p, idx) => (
                          <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-blue-600">#{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-400">#{p.id_paciente}</td>
                            <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre}</td>
                            <td className="py-3.5 px-4">{p.telefono || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center font-semibold">{p.completadas}</td>
                            <td className="py-3.5 px-4 text-right font-black text-emerald-600 bg-emerald-50/40">Bs. {p.total_pagado.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 5. PESTAÑA RANKING DEUDORES */}
                {activeSubTab === "deudores" && (
                  <div className="overflow-x-auto print:overflow-visible animate-fadeIn">
                    <table id="table-pacientes" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                          <th className="py-3.5 px-4">Posición</th>
                          <th className="py-3.5 px-4">Paciente ID</th>
                          <th className="py-3.5 px-4">Nombre</th>
                          <th className="py-3.5 px-4">C.I.</th>
                          <th className="py-3.5 px-4">Teléfono</th>
                          <th className="py-3.5 px-4 text-right">Monto Deuda</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                        {pacientesDeudores.map((p, idx) => (
                          <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-black text-rose-600">#{idx + 1}</td>
                            <td className="py-3.5 px-4 font-bold text-gray-400">#{p.id_paciente}</td>
                            <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre}</td>
                            <td className="py-3.5 px-4">{p.ci || "N/A"}</td>
                            <td className="py-3.5 px-4">{p.telefono || "N/A"}</td>
                            <td className="py-3.5 px-4 text-right font-black text-rose-600 bg-rose-50/40">Bs. {p.saldo_pendiente.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 6. PESTAÑA PACIENTES INACTIVOS */}
                {activeSubTab === "inactivos" && (
                  <div className="overflow-x-auto print:overflow-visible animate-fadeIn">
                    <table id="table-pacientes" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                      <thead>
                        <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                          <th className="py-3.5 px-4">Paciente ID</th>
                          <th className="py-3.5 px-4">Nombre</th>
                          <th className="py-3.5 px-4">Teléfono</th>
                          <th className="py-3.5 px-4 text-center">Citas Registradas</th>
                          <th className="py-3.5 px-4">Última Cita</th>
                          <th className="py-3.5 px-4">Estado Alerta</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                        {pacientesInactivos.map((p) => (
                          <tr key={p.id_paciente} className="hover:bg-gray-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-gray-400">#{p.id_paciente}</td>
                            <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase">{p.nombre}</td>
                            <td className="py-3.5 px-4">{p.telefono || "N/A"}</td>
                            <td className="py-3.5 px-4 text-center font-bold">{p.total_citas}</td>
                            <td className="py-3.5 px-4 text-gray-500">{p.ultima_cita || "Ninguna registrada"}</td>
                            <td className="py-3.5 px-4">
                              <span className="inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                                Sin visitas recientes
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* SIGNATURES IMPRESION */}
          <div className="hidden print:flex justify-between items-center mt-16 pt-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">DIRECTOR ADMINISTRATIVO</p>
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

import React, { useState } from "react";
import { useAuthStore } from "../../../store/auth_store";
import {
  ESTADO_CITA,
  ESTADO_CITA_LABELS,
  ESTADO_CITA_COLORS,
} from "../../../constants/enums";

export default function ReporteCitas({ dataMaster, user }) {
  // Estados para filtros
  const [selectedOdontologo, setSelectedOdontologo] = useState("");

  const [pacienteSearch, setPacienteSearch] = useState(
    user?.rol >= 5 ? user?.nombre || user?.nombre_usuario || "Mi Perfil" : "",
  );
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false);
  const [selectedPacienteId, setSelectedPacienteId] = useState(
    user?.rol >= 5 ? user?.id_persona || "" : "",
  );

  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Estados del reporte
  const [reportType, setReportType] = useState("pacientes"); // "pacientes", "odontologos", "global", "global_odontologos"
  const [reportData, setReportData] = useState([]);
  const [reportStats, setReportStats] = useState({});
  const [totalCitas, setTotalCitas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const API_URL = import.meta.env.VITE_API_URL;

  const pacientesFiltrados = (dataMaster?.pacientes || []).filter((p) =>
    p.nombre?.toLowerCase().includes(pacienteSearch.toLowerCase()),
  );

  const generarReporteGlobal = async () => {
    setReportType("global");
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_desde", fechaInicio);
      if (fechaFin) params.append("fecha_hasta", fechaFin);

      const res = await fetch(`${API_URL}/citas/reporte_citas_global_paciente?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();

      if (data.success) {
        const mappedData = data.data.map((row) => {
          const pac = dataMaster?.pacientes?.find((p) => {
            const pid = p.id_persona || p.id_usuario || p.id || p.id_paciente;
            return String(pid) === String(row.id_paciente);
          });
          return {
            id_paciente: row.id_paciente,
            nombre_paciente: pac ? pac.nombre : `Paciente #${row.id_paciente}`,
            total_citas: row.total_citas,
            programadas: row.programadas,
            canceladas: row.canceladas,
            reprogramadas: row.reprogramadas,
            completadas: row.completadas,
            no_asistio: row.no_asistio,
          };
        });

        setReportData(mappedData);

        const stats = {
          "Total Citas": mappedData.reduce((acc, curr) => acc + curr.total_citas, 0),
          "Programadas": mappedData.reduce((acc, curr) => acc + curr.programadas, 0),
          "Canceladas": mappedData.reduce((acc, curr) => acc + curr.canceladas, 0),
          "Reprogramadas": mappedData.reduce((acc, curr) => acc + curr.reprogramadas, 0),
          "Completadas": mappedData.reduce((acc, curr) => acc + curr.completadas, 0),
          "No Asistió": mappedData.reduce((acc, curr) => acc + curr.no_asistio, 0),
        };

        setReportStats(stats);
        setTotalCitas(stats["Total Citas"]);

        if (mappedData.length === 0) {
          setErrorMessage("No se registraron citas en el periodo especificado.");
        }
      } else {
        setErrorMessage(data.message || "Error al obtener el reporte global.");
        setReportData([]);
        setReportStats({});
        setTotalCitas(0);
      }
    } catch (err) {
      setErrorMessage("Error de conexión al obtener el reporte global.");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const generarReporteGlobalOdontologos = async () => {
    setReportType("global_odontologos");
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      if (fechaInicio) params.append("fecha_desde", fechaInicio);
      if (fechaFin) params.append("fecha_hasta", fechaFin);

      const res = await fetch(`${API_URL}/citas/reporte_citas_global_odontologos?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();

      if (data.success) {
        const mappedData = data.data.map((row) => {
          const odon = dataMaster?.odontologos?.find((o) => {
            const oid = o.id_personal || o.id;
            return String(oid) === String(row.id_personal);
          });
          return {
            id_personal: row.id_personal,
            nombre_odontologo: odon ? odon.nombre : `Especialista #${row.id_personal}`,
            total_citas: row.total_citas,
            programadas: row.programadas,
            canceladas: row.canceladas,
            reprogramadas: row.reprogramadas,
            completadas: row.completadas,
            no_asistio: row.no_asistio,
          };
        });

        setReportData(mappedData);

        const stats = {
          "Total Citas": mappedData.reduce((acc, curr) => acc + curr.total_citas, 0),
          "Programadas": mappedData.reduce((acc, curr) => acc + curr.programadas, 0),
          "Canceladas": mappedData.reduce((acc, curr) => acc + curr.canceladas, 0),
          "Reprogramadas": mappedData.reduce((acc, curr) => acc + curr.reprogramadas, 0),
          "Completadas": mappedData.reduce((acc, curr) => acc + curr.completadas, 0),
          "No Asistió": mappedData.reduce((acc, curr) => acc + curr.no_asistio, 0),
        };

        setReportStats(stats);
        setTotalCitas(stats["Total Citas"]);

        if (mappedData.length === 0) {
          setErrorMessage("No se registraron citas en el periodo especificado.");
        }
      } else {
        setErrorMessage(data.message || "Error al obtener el reporte global de odontólogos.");
        setReportData([]);
        setReportStats({});
        setTotalCitas(0);
      }
    } catch (err) {
      setErrorMessage("Error de conexión al obtener el reporte global.");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const generarReporte = async () => {
    const isPacienteSection = reportType === "pacientes" || reportType === "global";
    const isOdontologoSection = reportType === "odontologos" || reportType === "global_odontologos";

    if (isPacienteSection && !selectedPacienteId) {
      setErrorMessage(
        "Por favor, selecciona un paciente para generar su historial.",
      );
      setReportData([]);
      return;
    }

    if (isOdontologoSection && !selectedOdontologo) {
      setErrorMessage(
        "Por favor, selecciona un odontólogo para generar su historial.",
      );
      setReportData([]);
      return;
    }

    // Restablecemos reportType al tipo individual correspondiente
    const targetType = isPacienteSection ? "pacientes" : "odontologos";
    setReportType(targetType);

    setLoading(true);
    setErrorMessage("");
    try {
      let url =
        reportType === "pacientes"
          ? `${API_URL}/citas/reporte_paciente`
          : `${API_URL}/citas/reporte_odontologo`;

      const params = new URLSearchParams();

      if (reportType === "pacientes") {
        params.append("id_paciente", selectedPacienteId);
      } else {
        params.append("id_odontologo", selectedOdontologo);
      }

      if (fechaInicio) params.append("fecha_agen_desde", fechaInicio);
      if (fechaFin) params.append("fecha_agen_hasta", fechaFin);
      params.append("limit", 1000); // Para traer un historial amplio en el reporte

      const res = await fetch(`${url}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();

      if (data.success) {
        const mappedData = data.data.map((row) => {
          const odon = dataMaster?.odontologos?.find(
            (o) =>
              String(o.id) === String(row.id_personal) ||
              String(o.id_personal) === String(row.id_personal),
          );
          const sala = dataMaster?.salas?.find(
            (s) =>
              String(s.id_sala) === String(row.id_sala) ||
              String(s.id) === String(row.id_sala),
          );
          return {
            id_cita: row.id_cita,
            fecha_agendamiento: row.fecha_agendamiento,
            odontologo_nombre: odon ? odon.nombre : "Desconocido",
            nombre_estado: row.nombre_estado,
            sala_nombre: sala
              ? sala.nombre
              : row.id_sala
                ? `Sala ${row.id_sala}`
                : "Sin asignar",
            procedimientos: row.cita_obs || "Sin observaciones registradas",
          };
        });

        setReportData(mappedData);
        setReportStats(data.stats || {});
        setTotalCitas(data.total || 0);

        if (mappedData.length === 0) {
          setErrorMessage(
            reportType === "pacientes"
              ? "El paciente no tiene citas registradas en su historial."
              : "El odontólogo no tiene citas registradas en el periodo especificado.",
          );
        }
      } else {
        setErrorMessage(data.message || "Error al obtener el reporte.");
        setReportData([]);
        setReportStats({});
        setTotalCitas(0);
      }
    } catch (err) {
      setErrorMessage("Error de conexión al obtener el reporte.");
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportarExcel = () => {
    if (reportData.length === 0) {
      alert("No hay datos para exportar.");
      return;
    }

    const isGlobal = reportType === "global" || reportType === "global_odontologos";

    if (isGlobal) {
      // 1. Resumen Estadístico
      const summaryRows = [
        [reportType === "global" ? "RESUMEN GLOBAL DE PACIENTES" : "RESUMEN GLOBAL DE ODONTOLOGOS"],
        ["Total General de Citas", totalCitas],
        ...Object.entries(reportStats).map(([estado, cantidad]) => [
          estado,
          cantidad,
        ]),
        [], // Línea en blanco
        [reportType === "global" ? "DETALLE GLOBAL POR PACIENTE" : "DETALLE GLOBAL POR ODONTOLOGO"],
      ];

      // 2. Cabeceras (Sin ID)
      const headers = [
        reportType === "global" ? "PACIENTE" : "ODONTOLOGO",
        "TOTAL CITAS",
        "PROGRAMADAS",
        "CANCELADAS",
        "REPROGRAMADAS",
        "COMPLETADAS",
        "NO ASISTIO",
      ];

      // 3. Filas de datos (Sin ID)
      const rows = reportData.map((row) => [
        reportType === "global" ? (row.nombre_paciente || "N/A") : (row.nombre_odontologo || "N/A"),
        row.total_citas,
        row.programadas,
        row.canceladas,
        row.reprogramadas,
        row.completadas,
        row.no_asistio,
      ]);

      const csvContent = [
        ...summaryRows.map((r) => r.join(";")),
        headers.join(";"),
        ...rows.map((r) => r.join(";")),
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Reporte_Global_Citas_${reportType === "global" ? "Pacientes" : "Odontologos"}_${fechaInicio || "Hist"}_a_${fechaFin || "Pres"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // 1. Resumen Estadístico
      const summaryRows = [
        ["RESUMEN DE CITAS"],
        ["Total General", totalCitas],
        ...Object.entries(reportStats).map(([estado, cantidad]) => [
          estado,
          cantidad,
        ]),
        [], // Línea en blanco
        ["DETALLE DE CITAS"],
      ];

      // 2. Cabeceras
      const headers = [
        "NRO CITA",
        "FECHA AGENDAMIENTO",
        "ESTADO",
        "ODONTOLOGO",
        "SALA",
        "OBSERVACIONES",
      ];

      // 3. Filas de datos
      const rows = reportData.map((row) => [
        row.id_cita,
        row.fecha_agendamiento || "N/A",
        row.nombre_estado,
        row.odontologo_nombre,
        row.sala_nombre,
        row.procedimientos || "Sin observaciones",
      ]);

      // 4. Combinar todo separando por punto y coma (formato estándar para Excel en español)
      const csvContent = [
        ...summaryRows.map((r) => r.join(";")),
        headers.join(";"),
        ...rows.map((r) => r.join(";")),
      ].join("\n");

      // 4. Crear un Blob con codificación UTF-8 y BOM (\uFEFF) para que Excel reconozca tildes y caracteres especiales
      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);

      // 5. Descargar automáticamente
      const link = document.createElement("a");
      link.href = url;
      const identifier =
        reportType === "pacientes" ? selectedPacienteId : selectedOdontologo;
      link.setAttribute(
        "download",
        `Reporte_Citas_${reportType}_${identifier || "General"}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const isGlobal = reportType === "global" || reportType === "global_odontologos";

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
          .grid {
            display: grid !important;
            grid-template-columns: repeat(6, 1fr) !important;
            gap: 8px !important;
          }
          .grid > div {
            padding: 8px !important;
          }
          .grid p {
            font-size: 8px !important;
          }
          .grid p.text-3xl, .grid p.text-2xl {
            font-size: 16px !important;
          }
        }
      ` }} />
      <div className="flex bg-emerald-50/50 border-b border-gray-100 px-6 lg:px-8 print:hidden">
        <button
          onClick={() => {
            setReportType("pacientes");
            setReportData([]);
            setErrorMessage("");
          }}
          className={`px-4 py-4 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${
            reportType === "pacientes" || reportType === "global"
              ? "border-[#148F77] text-[#148F77]"
              : "border-transparent text-gray-400 hover:text-[#148F77]"
          }`}
        >
          Historial cita de pacientes
        </button>
        <button
          onClick={() => {
            setReportType("odontologos");
            setReportData([]);
            setErrorMessage("");
          }}
          className={`px-4 py-4 text-xs font-black uppercase tracking-widest transition-colors border-b-2 ${
            reportType === "odontologos" || reportType === "global_odontologos"
              ? "border-[#148F77] text-[#148F77]"
              : "border-transparent text-gray-400 hover:text-[#148F77]"
          }`}
        >
          Historial cita de odontólogos
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-[#2A5C4D]">Reportes</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            {reportType === "pacientes"
              ? "Filtra y visualiza el historial de un paciente"
              : reportType === "global"
              ? "Visualiza el resumen consolidado de citas de todos los pacientes"
              : reportType === "global_odontologos"
              ? "Visualiza el resumen consolidado de citas de todos los odontólogos"
              : "Filtra y visualiza el historial de un odontólogo"}
          </p>
        </div>
        <div className="flex gap-3">
          {(reportType === "pacientes" || reportType === "global") && (
            <button
              onClick={generarReporteGlobal}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-3 bg-[#148F77] text-white text-sm font-bold rounded-xl transition-all shadow-sm ${
                loading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-[#0f6b59] hover:-translate-y-0.5"
              }`}
            >
              Reporte Global
            </button>
          )}
          {(reportType === "odontologos" || reportType === "global_odontologos") && (
            <button
              onClick={generarReporteGlobalOdontologos}
              disabled={loading}
              className={`flex items-center gap-2 px-5 py-3 bg-[#148F77] text-white text-sm font-bold rounded-xl transition-all shadow-sm ${
                loading
                  ? "opacity-70 cursor-not-allowed"
                  : "hover:bg-[#0f6b59] hover:-translate-y-0.5"
              }`}
            >
              Reporte Global
            </button>
          )}
          <button
            onClick={generarReporte}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-3 bg-[#148F77] text-white text-sm font-bold rounded-xl transition-all shadow-sm ${
              loading
                ? "opacity-70 cursor-not-allowed"
                : "hover:bg-[#0f6b59] hover:-translate-y-0.5"
            }`}
          >
            {loading ? "Generando..." : "Generar Reporte"}
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8 print:p-0">
        <div className="max-w-7xl mx-auto">
          {/* ENCABEZADO EXCLUSIVO PARA LA HOJA FÍSICA/PDF */}
          <div className="hidden print:flex flex-col mb-8">
            <div className="flex justify-between items-end border-b-2 border-[#148F77] pb-4 mb-4">
              <div>
                <h1 className="text-[#2A5C4D] font-black text-xl uppercase tracking-wide">
                  CLÍNICA ODONTOLÓGICA ALBA
                </h1>
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                  {reportType === "pacientes"
                    ? "Reporte de Historial de Paciente"
                    : reportType === "global"
                    ? "Reporte Resumen Global de Pacientes"
                    : reportType === "global_odontologos"
                    ? "Reporte Resumen Global de Odontólogos"
                    : "Reporte de Historial de Odontólogo"}
                </p>
              </div>
              <div className="text-right text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                <div>Emisión: {new Date().toLocaleDateString("es-BO")}</div>
              </div>
            </div>

            {reportType === "pacientes" && (
              <div className="text-xs text-gray-600 font-medium mb-4">
                <p>
                  <strong>Paciente Seleccionado:</strong>{" "}
                  {dataMaster?.pacientes?.find(
                    (p) => p.id === parseInt(selectedPacienteId),
                  )?.nombre ||
                    selectedPacienteId ||
                    "N/A"}
                </p>
                {(fechaInicio || fechaFin) && (
                  <p>
                    <strong>Periodo:</strong>{" "}
                    {fechaInicio ? fechaInicio : "Histórico"} al{" "}
                    {fechaFin ? fechaFin : "Presente"}
                  </p>
                )}
              </div>
            )}

            {reportType === "global" && (fechaInicio || fechaFin) && (
              <div className="text-xs text-gray-600 font-medium mb-4">
                <p>
                  <strong>Periodo del Reporte:</strong>{" "}
                  {fechaInicio ? fechaInicio : "Histórico"} al{" "}
                  {fechaFin ? fechaFin : "Presente"}
                </p>
              </div>
            )}

            {reportType === "global_odontologos" && (fechaInicio || fechaFin) && (
              <div className="text-xs text-gray-600 font-medium mb-4">
                <p>
                  <strong>Periodo del Reporte:</strong>{" "}
                  {fechaInicio ? fechaInicio : "Histórico"} al{" "}
                  {fechaFin ? fechaFin : "Presente"}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-6 mb-8 print:hidden">
            {(reportType === "pacientes" || reportType === "global") && (
              <div className="w-full sm:w-1/3 relative">
                <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                  Paciente
                </label>
                <input
                  type="text"
                  disabled={user?.rol >= 5}
                  placeholder="Buscar paciente por nombre..."
                  className={`w-full p-3 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] focus:ring-0 transition-colors ${user?.rol >= 5 ? "bg-gray-100 cursor-not-allowed opacity-70" : "bg-gray-50"}`}
                  value={pacienteSearch}
                  onChange={(e) => {
                    setPacienteSearch(e.target.value);
                    setReportType("pacientes");
                    setShowPacienteDropdown(true);
                    if (e.target.value === "") {
                      setSelectedPacienteId("");
                    }
                  }}
                  onFocus={() => setShowPacienteDropdown(true)}
                  onBlur={() =>
                    setTimeout(() => setShowPacienteDropdown(false), 200)
                  }
                />
                {showPacienteDropdown && (
                  <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                    {pacientesFiltrados.length > 0 ? (
                      pacientesFiltrados.map((p) => (
                        <li
                          key={p.id_persona || p.id_usuario || p.id}
                          className="p-4 text-xs font-bold text-gray-600 hover:bg-emerald-50 hover:text-[#148F77] cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                          onMouseDown={() => {
                            setSelectedPacienteId(
                              p.id_persona || p.id_usuario || p.id,
                            );
                            setPacienteSearch(p.nombre);
                            setReportType("pacientes");
                            setShowPacienteDropdown(false);
                          }}
                        >
                          {p.nombre}
                        </li>
                      ))
                    ) : (
                      <li className="p-4 text-xs text-gray-400 text-center italic">
                        No se encontraron pacientes
                      </li>
                    )}
                  </ul>
                )}
              </div>
            )}

            {(reportType === "odontologos" || reportType === "global_odontologos") && (
              <>
                <div className="w-full sm:w-1/3">
                  <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                    Odontólogo
                  </label>
                  <div className="relative">
                    <select
                      value={selectedOdontologo}
                      onChange={(e) => {
                        setSelectedOdontologo(e.target.value);
                        setReportType("odontologos");
                      }}
                      className="w-full pl-4 pr-10 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] focus:ring-0 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">Todos los odontólogos</option>
                      {dataMaster?.odontologos?.map((odon) => (
                        <option
                          key={odon.id_personal || odon.id}
                          value={odon.id_personal || odon.id}
                        >
                          {odon.nombre}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                      ▼
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="w-full sm:w-1/3 relative">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Desde (Fecha Agend.)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  placeholder="DD/MM/AA"
                  value={
                    fechaInicio
                      ? (() => {
                          const [y, m, d] = fechaInicio.split("-");
                          return `${d}/${m}/${y.slice(-2)}`;
                        })()
                      : ""
                  }
                  className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] cursor-pointer"
                  onClick={(e) => e.target.nextSibling.showPicker()}
                />
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="absolute opacity-0 inset-0 pointer-events-none"
                />
              </div>
            </div>

            <div className="w-full sm:w-1/3 relative">
              <label className="block text-xs font-black text-[#148F77] uppercase tracking-widest mb-2">
                Hasta (Fecha Agend.)
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  placeholder="DD/MM/AA"
                  value={
                    fechaFin
                      ? (() => {
                          const [y, m, d] = fechaFin.split("-");
                          return `${d}/${m}/${y.slice(-2)}`;
                        })()
                      : ""
                  }
                  className="w-full p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-700 focus:outline-none focus:border-[#148F77] cursor-pointer"
                  onClick={(e) => e.target.nextSibling.showPicker()}
                />
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="absolute opacity-0 inset-0 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* BOTONES DE ACCION */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end mt-6 pt-6 border-t border-gray-100 print:hidden">
            {/* ACCIONES DE DESCARGA */}
            {reportData.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleExportarExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Exportar a Excel
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Guardar PDF / Imprimir
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Aquí va la tabla de reportes */}
        <div className="mt-8 border-t border-gray-100 pt-8 print:mt-0 print:border-none print:pt-0">
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
            <div className="space-y-6">
              {/* Tarjetas de Estadísticas */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {isGlobal ? (
                  <>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1 text-center">
                        Total General
                      </p>
                      <p className="text-3xl font-black text-[#2A5C4D]">
                        {totalCitas}
                      </p>
                    </div>
                    {Object.entries(reportStats)
                      .filter(([k]) => k !== "Total Citas")
                      .map(([estado, cantidad]) => (
                        <div
                          key={estado}
                          className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center items-center shadow-sm"
                        >
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 text-center truncate w-full">
                            {estado}
                          </p>
                          <p className="text-2xl font-black text-gray-700">
                            {cantidad}
                          </p>
                        </div>
                      ))}
                  </>
                ) : (
                  <>
                    <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
                      <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1">
                        Total
                      </p>
                      <p className="text-3xl font-black text-[#2A5C4D]">
                        {totalCitas}
                      </p>
                    </div>
                    {Object.entries(reportStats).map(([estado, cantidad]) => (
                      <div
                        key={estado}
                        className="bg-gray-50/80 p-4 rounded-2xl border border-gray-100 flex flex-col justify-center items-center shadow-sm"
                      >
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 text-center truncate w-full">
                          {estado}
                        </p>
                        <p className="text-2xl font-black text-gray-700">
                          {cantidad}
                        </p>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Tabla */}
              <div className="overflow-x-auto bg-white rounded-2xl border border-gray-100 shadow-sm">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="bg-emerald-50/50">
                    <tr className="border-b-2 border-gray-100">
                      {isGlobal ? (
                        <>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            {reportType === "global" ? "Paciente" : "Odontólogo"}
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            Total Citas
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            Programadas
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            Canceladas
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            Reprogramadas
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            Completadas
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest text-center">
                            No Asistió
                          </th>
                        </>
                      ) : (
                        <>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            ID
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            Fecha Agendada
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            Especialista
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            Sala
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            Estado
                          </th>
                          <th className="py-4 px-6 text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                            Observaciones
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {reportData.map((row, index) => (
                      <tr
                        key={isGlobal ? (reportType === "global" ? row.id_paciente : row.id_personal) : row.id_cita}
                        className={`hover:bg-emerald-50/30 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                        }`}
                      >
                        {isGlobal ? (
                          <>
                            <td className="py-4 px-6 text-sm font-bold text-[#2A5C4D]">
                              {reportType === "global" ? row.nombre_paciente : row.nombre_odontologo}
                            </td>
                            <td className="py-4 px-6 text-sm font-black text-gray-700 text-center">
                              {row.total_citas}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-emerald-600 text-center">
                              {row.programadas}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-red-500 text-center">
                              {row.canceladas}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-amber-500 text-center">
                              {row.reprogramadas}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-blue-600 text-center">
                              {row.completadas}
                            </td>
                            <td className="py-4 px-6 text-sm font-semibold text-gray-400 text-center">
                              {row.no_asistio}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="py-4 px-6 text-xs font-bold text-gray-500">
                              #{row.id_cita}
                            </td>
                            <td className="py-4 px-6 text-sm font-bold text-[#2A5C4D]">
                              {row.fecha_agendamiento || "N/A"}
                            </td>
                            <td className="py-4 px-6 text-sm font-medium text-gray-700">
                              {row.odontologo_nombre}
                            </td>
                            <td className="py-4 px-6 text-sm font-medium text-gray-700">
                              {row.sala_nombre}
                            </td>
                            <td className="py-4 px-6">
                              <span className="px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                                {row.nombre_estado}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-xs font-medium text-gray-600 max-w-xs">
                              {row.procedimientos}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 opacity-50 print:hidden">
              <p className="font-black uppercase tracking-[0.2em] text-[10px] text-gray-500 text-center">
                Selecciona una persona y presiona "Generar Reporte" para
                visualizar el historial.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

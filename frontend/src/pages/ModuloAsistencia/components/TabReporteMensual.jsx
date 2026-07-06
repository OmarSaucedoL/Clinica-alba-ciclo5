import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido.";
  if (errorMsg.includes("CONTEXT:")) {
    return errorMsg.split("CONTEXT:")[0].replace("Error interno:", "").trim();
  }
  return errorMsg;
};

export default function TabReporteMensual({ userRolId, user, dataMaster }) {
  const isAdmin = Number(userRolId) === 1;

  // Local state for dropdowns
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

  const [selectedMonthPersonalId, setSelectedMonthPersonalId] = useState(
    isAdmin ? "" : (user?.id_persona || "")
  );

  const mesesList = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  const currentYear = new Date().getFullYear();
  const añosList = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const [selectedMonthPart, setSelectedMonthPart] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [selectedYearPart, setSelectedYearPart] = useState(
    String(new Date().getFullYear())
  );

  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);
  const [monthlyReportError, setMonthlyReportError] = useState("");

  // Load personal clinical list
  useEffect(() => {
    if (isAdmin) {
      const cargarPersonalList = async () => {
        setLoadingPersonal(true);
        try {
          const res = await fetch(`${API_URL}/asistencia/empleados`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          const data = await res.json();
          if (data.success) {
            setPersonalList(data.data || []);
          }
        } catch (e) {
          console.error("Error al cargar personal:", e);
        } finally {
          setLoadingPersonal(false);
        }
      };
      cargarPersonalList();
    }
  }, [isAdmin]);

  // Load monthly report automatically on mount or select change
  useEffect(() => {
    if (selectedMonthPersonalId) {
      cargarReporteMensual(false);
    }
  }, [selectedMonthPersonalId]);

  const cargarReporteMensual = async (isManualClick = false) => {
    if (!selectedMonthPersonalId) {
      if (isManualClick) {
        setMonthlyReportError("Debe seleccionar un empleado para generar el reporte.");
      }
      return;
    }
    
    if (!selectedMonthPart || !selectedYearPart) {
      if (isManualClick) {
        setMonthlyReportError("Debe seleccionar un mes y un año válidos.");
      }
      return;
    }
    
    setLoadingMonthlyReport(true);
    setMonthlyReportError("");
    setMonthlyReportData([]);
    
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      
      const res = await fetch(`${API_URL}/asistencia/reporte-mensual?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setMonthlyReportData(data.data || []);
      } else {
        setMonthlyReportError(sanitizarError(data.message));
      }
    } catch (err) {
      setMonthlyReportError("Error al conectar con el servidor.");
    } finally {
      setLoadingMonthlyReport(false);
    }
  };

  const exportarPDF = async () => {
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      const res = await fetch(`${API_URL}/asistencia/exportar/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Error al descargar PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Asistencia_${selectedYearPart}_${selectedMonthPart}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Error al exportar PDF: " + e.message);
    }
  };

  const exportarExcel = async () => {
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      const res = await fetch(`${API_URL}/asistencia/exportar/excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Error al descargar Excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Asistencia_${selectedYearPart}_${selectedMonthPart}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Error al exportar Excel: " + e.message);
    }
  };

  // Local calculation of stats
  const calcularEstadisticas = () => {
    let completedShifts = 0;
    let totalMinutes = 0;
    let incompleteCount = 0;

    monthlyReportData.forEach((item) => {
      const dur = item.duracion || "";
      if (item.entrada && item.salida && dur.includes("h")) {
        completedShifts += 1;
        try {
          const parts = dur.split(" ");
          const h = parseInt(parts[0].replace("h", ""), 10);
          const m = parseInt(parts[1].replace("m", ""), 10);
          totalMinutes += (h * 60) + m;
        } catch (e) {
          // Ignore
        }
      } else {
        incompleteCount += 1;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalTimeStr = `${hours}h ${mins}m`;

    return { completedShifts, totalTimeStr, incompleteCount };
  };

  const stats = calcularEstadisticas();

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Panel de Filtros */}
      <div className="bg-white p-5 rounded-[2rem] shadow-md border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
        {/* Filtro Empleado */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Seleccionar Empleado</label>
          {isAdmin ? (
            <select
              value={selectedMonthPersonalId}
              onChange={(e) => setSelectedMonthPersonalId(e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
            >
              <option value="">-- Seleccionar --</option>
              {personalList.map((s) => (
                <option key={s.id_personal} value={s.id_personal}>
                  {s.nombre} ({s.cargo})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              readOnly
              value={user?.nombre || "Mi Perfil"}
              className="w-full p-3 bg-gray-100 rounded-xl text-xs font-bold border-none outline-none text-gray-500 cursor-not-allowed"
            />
          )}
        </div>

        {/* Filtro Mes */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Mes</label>
          <select
            value={selectedMonthPart}
            onChange={(e) => setSelectedMonthPart(e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
          >
            {mesesList.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Filtro Año */}
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Año</label>
          <select
            value={selectedYearPart}
            onChange={(e) => setSelectedYearPart(e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
          >
            {añosList.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Botón de Carga */}
        <button
          onClick={() => cargarReporteMensual(true)}
          disabled={loadingMonthlyReport}
          className="w-full p-3.5 bg-[#148F77] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-[#117A65] transition-all disabled:opacity-50 cursor-pointer"
        >
          {loadingMonthlyReport ? "Generando..." : "Generar Reporte"}
        </button>
      </div>

      {monthlyReportError && (
        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500 animate-shake">
          {monthlyReportError}
        </div>
      )}

      {/* Tarjetas Estadísticas Resumen (Solo si hay datos en pantalla) */}
      {monthlyReportData.length > 0 && !loadingMonthlyReport && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
          {/* CARD 1: Turnos Completados */}
          <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-[#148F77]/10 text-[#148F77] rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Turnos Completados</span>
              <span className="text-lg font-black text-[#2A5C4D]">{stats.completedShifts} turnos</span>
            </div>
          </div>

          {/* CARD 2: Horas Trabajadas */}
          <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className="p-3 bg-[#148F77]/10 text-[#148F77] rounded-2xl">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tiempo Total Trabajado</span>
              <span className="text-lg font-black text-[#2A5C4D]">{stats.totalTimeStr}</span>
            </div>
          </div>

          {/* CARD 3: Marcas Incompletas */}
          <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
            <div className={`p-3 rounded-2xl ${stats.incompleteCount > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Marcas Incompletas</span>
              <span className={`text-lg font-black ${stats.incompleteCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                {stats.incompleteCount} {stats.incompleteCount === 1 ? "registro" : "registros"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Botones de Exportación */}
      {monthlyReportData.length > 0 && !loadingMonthlyReport && (
        <div className="flex gap-3 justify-end">
          <button
            onClick={exportarPDF}
            className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-rose-700 shadow-md active:scale-95 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar PDF
          </button>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-md active:scale-95 cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar Excel
          </button>
        </div>
      )}

      {/* Tabla de Reporte Emparejado */}
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#2A5C4D] text-white">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Entrada (Marcado)</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Salida (Marcado)</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Duración de la Jornada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingMonthlyReport ? (
                <tr>
                  <td colSpan="3" className="p-20 text-center">
                    <div className="flex justify-center space-x-2 animate-pulse">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                  </td>
                </tr>
              ) : monthlyReportData.length > 0 ? (
                monthlyReportData.map((item, idx) => {
                  const isWarning = !item.entrada || !item.salida;
                  return (
                    <tr key={idx} className="hover:bg-emerald-50/10 transition-colors">
                      {/* Entrada */}
                      <td className="p-5 text-xs font-semibold">
                        {item.entrada ? (
                          <span className="text-gray-700 font-bold">{item.entrada}</span>
                        ) : (
                          <span className="text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">
                            {item.duracion}
                          </span>
                        )}
                      </td>
                      {/* Salida */}
                      <td className="p-5 text-xs font-semibold">
                        {item.salida ? (
                          <span className="text-gray-700 font-bold">{item.salida}</span>
                        ) : (
                          <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                            Sin marcar salida
                          </span>
                        )}
                      </td>
                      {/* Duración */}
                      <td className="p-5 text-xs font-black uppercase">
                        {isWarning ? (
                          <span className="text-gray-400 italic">Incompleto</span>
                        ) : (
                          <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 inline-block font-sans">
                            {item.duracion}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="3"
                    className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic"
                  >
                    {!selectedMonthPersonalId 
                      ? "Seleccione un empleado para ver su reporte mensual." 
                      : "No hay marcas registradas para este período."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

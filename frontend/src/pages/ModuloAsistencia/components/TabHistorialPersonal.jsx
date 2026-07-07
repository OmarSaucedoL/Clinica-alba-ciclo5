import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido.";
  if (errorMsg.includes("CONTEXT:")) {
    return errorMsg.split("CONTEXT:")[0].replace("Error interno:", "").trim();
  }
  return errorMsg;
};

export default function TabHistorialPersonal({ userRolId, user }) {
  const isAdmin = Number(userRolId) === 1;
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [filterName, setFilterName] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const cargarHistorial = async () => {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const endpoint = isAdmin ? "/asistencia/historial-global" : "/asistencia/historial-personal";
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setLogsError(sanitizarError(data.message));
      }
    } catch (err) {
      setLogsError("Error al conectar con el servidor.");
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    cargarHistorial();
  }, []);

  const getTipoBadge = (tipo) => {
    return tipo === "ENTRADA" 
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
      : "bg-orange-100 text-orange-700 border border-orange-200";
  };

  const handleFilterChange = (e) => {
    setFilterName(e.target.value);
    setCurrentPage(1); // Resetear a la primera página cuando cambie el filtro
  };

  const filteredLogs = logs.filter((log) => {
    if (!filterName.trim()) return true;
    return log.nombre_empleado?.toLowerCase().includes(filterName.toLowerCase());
  });

  // Lógica de paginación
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-4 animate-fade-in w-full">
      {/* Barra de Filtros (Solo para el Admin) */}
      {isAdmin && (
        <div className="flex gap-4 items-end bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
          <div className="flex-1 space-y-1">
            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Filtrar por Empleado</label>
            <input
              type="text"
              placeholder="Ej: Dr. Pérez..."
              value={filterName}
              onChange={handleFilterChange}
              className="w-full p-3.5 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
            />
          </div>
        </div>
      )}

      {logsError && (
        <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500 animate-shake">
          {logsError}
        </div>
      )}

      {/* Tabla de registros (Ancho completo) */}
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 flex flex-col justify-between min-h-[400px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#2A5C4D] text-white">
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Fecha y Hora</th>
                {isAdmin && (
                  <th className="p-5 text-[10px] font-black uppercase tracking-widest">Empleado</th>
                )}
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Tipo</th>
                <th className="p-5 text-[10px] font-black uppercase tracking-widest">Autorizado Por</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loadingLogs ? (
                <tr>
                  <td colSpan={isAdmin ? 4 : 3} className="p-20 text-center">
                    <div className="flex justify-center space-x-2 animate-pulse">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log.id_asistencia} className="hover:bg-emerald-50/20 transition-colors">
                    <td className="p-5 text-xs font-bold text-gray-500">{log.fecha_registro}</td>
                    {isAdmin && (
                      <td className="p-5 text-xs font-black text-[#2A5C4D] uppercase">
                        {log.nombre_empleado}
                      </td>
                    )}
                    <td className="p-5">
                      <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${getTipoBadge(log.tipo)}`}>
                        {log.tipo}
                      </span>
                    </td>
                    <td className="p-5 text-xs font-bold text-gray-400 uppercase">{log.nombre_creador}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={isAdmin ? 4 : 3}
                    className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic"
                  >
                    Sin marcas de asistencia encontradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-black text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Anterior
            </button>
            <span className="text-[10px] font-black text-[#2A5C4D] uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-200 bg-white rounded-xl text-xs font-black text-gray-500 uppercase tracking-wider hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


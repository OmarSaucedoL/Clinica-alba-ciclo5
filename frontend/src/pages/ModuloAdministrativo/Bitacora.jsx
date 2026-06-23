import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

// --- FUNCIÓN PARA SANITIZAR ERRORES ---
const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido.";
  if (errorMsg.includes("CONTEXT:")) {
    return errorMsg.split("CONTEXT:")[0].replace("Error interno:", "").trim();
  }
  return errorMsg;
};

export default function Bitacora() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filters, setFilters] = useState({
    nombre: '', 
    modulo: '',
    fecha_inicio: '',
    fecha_fin: ''
  });

  const fetchLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (filters.nombre.trim()) params.append('nombre', filters.nombre.trim());
      if (filters.modulo) params.append('modulo', filters.modulo);
      if (filters.fecha_inicio) params.append('fecha_inicio', filters.fecha_inicio);
      if (filters.fecha_fin) params.append('fecha_fin', filters.fecha_fin);

      const res = await fetch(`${API_URL}/bitacora?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.data);
      } else {
        setError(sanitizarError(data.message));
      }
    } catch (err) {
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  const getActionBadge = (accion) => {
    const styles = {
      'LOGIN_SUCCESS': 'bg-emerald-100 text-emerald-700',
      'LOGIN_FAILED': 'bg-red-100 text-red-700',
      'DELETE': 'bg-rose-100 text-rose-700',
      'CREATE': 'bg-blue-100 text-blue-700',
      'UPDATE': 'bg-amber-100 text-amber-700',
      'default': 'bg-gray-100 text-gray-700'
    };
    return styles[accion] || styles.default;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-8">
        <h2 className="text-2xl sm:text-3xl font-black text-[#2A5C4D] tracking-tighter italic">Auditoría de Sistema</h2>
        <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">Historial de movimientos - Clínica Alba</p>
      </div>

      {/* FORMULARIO DE FILTROS: Responsivo (1 col en móvil, 2 en tablet, 5 en desktop) */}
      <form onSubmit={handleSearch} className="bg-white p-5 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] shadow-xl mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end border border-gray-50">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Módulo</label>
          <select 
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
            value={filters.modulo}
            onChange={(e) => setFilters({...filters, modulo: e.target.value})}
          >
            <option value="">Todos</option>
            <option value="AUTH">AUTH</option>
            <option value="CITAS">CITAS</option>
            <option value="USUARIOS">USUARIOS</option>
            <option value="SECURITY">SECURITY</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Nombre</label>
          <input 
            type="text" 
            placeholder="Ej: Luis"
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
            value={filters.nombre}
            onChange={(e) => setFilters({...filters, nombre: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Desde</label>
          <input 
            type="date" 
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
            value={filters.fecha_inicio}
            onChange={(e) => setFilters({...filters, fecha_inicio: e.target.value})}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Hasta</label>
          <input 
            type="date" 
            className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
            value={filters.fecha_fin}
            onChange={(e) => setFilters({...filters, fecha_fin: e.target.value})}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full p-3 bg-[#148F77] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-[#117A65] transition-all disabled:opacity-50"
        >
          {loading ? '...' : 'Filtrar'}
        </button>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500 animate-shake">
          {error}
        </div>
      )}

      {/* TABLA DE RESULTADOS: Con scroll horizontal para móvil */}
      <div className="bg-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-[#2A5C4D] text-white">
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Fecha</th>
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Usuario</th>
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Módulo</th>
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Acción</th>
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Descripción</th>
                <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="6" className="p-20 text-center">
                    <div className="flex justify-center space-x-2 animate-pulse">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="p-4 sm:p-5 text-[10px] sm:text-[11px] font-bold text-gray-400 whitespace-nowrap">{log.fecha}</td>
                    <td className="p-4 sm:p-5">
                      <div className="text-[10px] sm:text-[11px] font-black text-[#2A5C4D] uppercase">{log.usuario}</div>
                      <div className="text-[8px] text-gray-300 font-bold">ID: {log.id_sesion || 'S/N'}</div>
                    </td>
                    <td className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black text-gray-400 uppercase">{log.modulo}</td>
                    <td className="p-4 sm:p-5">
                      <span className={`px-2 py-1 rounded-full text-[7px] sm:text-[8px] font-black uppercase whitespace-nowrap ${getActionBadge(log.accion)}`}>
                        {log.accion}
                      </span>
                    </td>
                    <td className="p-4 sm:p-5 text-[10px] sm:text-[11px] text-gray-600 font-medium max-w-xs break-words" title={log.descripcion}>
                      {log.descripcion}
                    </td>
                    <td className="p-4 sm:p-5">
                      <code className="bg-gray-50 px-2 py-1 rounded text-[8px] sm:text-[9px] text-gray-400 font-mono whitespace-nowrap">
                        {log.metadata?.ip || '0.0.0.0'}
                      </code>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-16 sm:p-20 text-center text-gray-300 font-black uppercase text-[9px] sm:text-[10px] tracking-[0.2em] italic">
                    Sin registros encontrados
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
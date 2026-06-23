import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function DetallesConsultorio({ consultorio, onClose, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const user = useAuthStore((state) => state.user);

  // Form state for editing
  const [nombre, setNombre] = useState(consultorio.nombre || "");
  const [tipoSala, setTipoSala] = useState(consultorio.tipo_sala || "GENERAL");
  const [estadoSala, setEstadoSala] = useState(consultorio.estado_sala || "ACTIVA");

  // Availability state
  const [fechaDisponibilidad, setFechaDisponibilidad] = useState(new Date().toISOString().split('T')[0]);
  const [slotsDisponibles, setSlotsDisponibles] = useState([]);
  const [slotsOcupados, setSlotsOcupados] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [activeTab, setActiveTab] = useState("LIBRES");

  useEffect(() => {
    if (!fechaDisponibilidad) {
      setSlotsDisponibles([]);
      setSlotsOcupados([]);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const queryParams = new URLSearchParams({
          id_sala: consultorio.id_sala,
          fecha: fechaDisponibilidad,
        });

        const [resLibres, resOcupadas] = await Promise.all([
          fetch(`${API_URL}/citas/disponibilidad?${queryParams}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }),
          fetch(`${API_URL}/citas/ocupadas?${queryParams}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          })
        ]);

        const dataLibres = await resLibres.json();
        const dataOcupadas = await resOcupadas.json();

        if (dataLibres.success) setSlotsDisponibles(dataLibres.data);
        else setSlotsDisponibles([]);

        if (dataOcupadas.success) setSlotsOcupados(dataOcupadas.data);
        else setSlotsOcupados([]);

      } catch (err) {
        console.error("Error fetching slots:", err);
        setSlotsDisponibles([]);
        setSlotsOcupados([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [fechaDisponibilidad, consultorio.id_sala]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/consultorios/${consultorio.id_sala}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          nombre,
          tipo_sala: tipoSala,
          estado_sala: estadoSala,
          id_usuario: user?.id_usuario,
          id_sesion: user?.id_sesion,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      // Actualizar el objeto local para reflejar los cambios en la vista de detalles
      consultorio.nombre = nombre;
      consultorio.tipo_sala = tipoSala;
      consultorio.estado_sala = estadoSala;

      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || "Error al actualizar el consultorio");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/consultorios/${consultorio.id_sala}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      if (onRefresh) onRefresh();
      onClose();
    } catch (err) {
      setError(err.message || "Error al eliminar el consultorio. Verifica si no tiene dependencias asociadas.");
      setShowConfirmDelete(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-emerald-50 h-full animate-fade-in-up">
      {/* HEADER */}
      <div className="p-6 lg:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-gray-500 hover:text-[#148F77] hover:border-[#148F77] transition-all focus:outline-none"
            title="Volver atrás"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h3 className="text-2xl font-black text-[#2A5C4D] italic tracking-tighter">
              {isEditing ? "Modificar Consultorio" : "Detalles del Consultorio"}
            </h3>
            <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
              {isEditing ? "Editando información" : "Información completa"}
            </p>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6 lg:p-8 overflow-y-auto flex-1 relative">
          {error && (
            <div className="p-4 mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase animate-shake">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={handleUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                    Nombre del Consultorio
                  </label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 text-gray-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                    Tipo de Sala
                  </label>
                  <select
                    value={tipoSala}
                    onChange={(e) => setTipoSala(e.target.value)}
                    className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 text-gray-800"
                  >
                    <option value="GENERAL">GENERAL</option>
                    <option value="CIRUGIA">CIRUGÍA</option>
                    <option value="RADIOLOGIA">RADIOLOGÍA</option>
                    <option value="OTRO">OTRO</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                  Estado Operativo
                </label>
                <select
                  value={estadoSala}
                  onChange={(e) => setEstadoSala(e.target.value)}
                  className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 text-gray-800"
                >
                  <option value="ACTIVA">ACTIVA</option>
                  <option value="INACTIVA">INACTIVA</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                </select>
              </div>

              <div className="pt-6 flex gap-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Guardar Cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                  className="flex-1 py-4 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    ID Consultorio
                  </p>
                  <p className="text-xl font-black text-[#2A5C4D]">
                    #{consultorio.id_sala}
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Nombre
                  </p>
                  <p className="text-xl font-black text-[#2A5C4D]">
                    {consultorio.nombre}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                    Tipo de Sala
                  </p>
                  <p className="text-sm font-bold text-[#148F77]">
                    {consultorio.tipo_sala}
                  </p>
                </div>
                <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col justify-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    Estado Actual
                  </p>
                  <div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      consultorio.estado_sala === 'ACTIVA' ? 'bg-green-100 text-green-700' :
                      consultorio.estado_sala === 'MANTENIMIENTO' ? 'bg-orange-100 text-orange-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {consultorio.estado_sala}
                    </span>
                  </div>
                </div>
              </div>

              {/* DISPONIBILIDAD SECTION */}
              <div className="bg-gray-50 rounded-[2rem] p-6 border border-dashed border-gray-200 mt-6 min-h-[150px]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <div className="flex gap-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <button
                      onClick={() => setActiveTab("LIBRES")}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === "LIBRES" 
                          ? "bg-emerald-50 text-[#148F77] shadow-sm" 
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Horarios Libres
                    </button>
                    <button
                      onClick={() => setActiveTab("OCUPADOS")}
                      className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                        activeTab === "OCUPADOS" 
                          ? "bg-red-50 text-red-500 shadow-sm" 
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      Horarios Ocupados
                    </button>
                  </div>
                  <div className="relative w-full sm:w-40">
                    <input
                      type="date"
                      value={fechaDisponibilidad}
                      onChange={(e) => setFechaDisponibilidad(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 transition-all cursor-pointer shadow-sm"
                    />
                  </div>
                </div>

                {loadingSlots ? (
                  <div className="flex justify-center py-6 space-x-2">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${activeTab === 'LIBRES' ? 'bg-[#148F77]' : 'bg-red-500'}`}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-75 ${activeTab === 'LIBRES' ? 'bg-[#148F77]' : 'bg-red-500'}`}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce delay-150 ${activeTab === 'LIBRES' ? 'bg-[#148F77]' : 'bg-red-500'}`}></div>
                  </div>
                ) : activeTab === "LIBRES" ? (
                  slotsDisponibles.length > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 mt-4">
                      {slotsDisponibles.map((slot, index) => {
                        const horaValue = slot.inicio.slice(0, 5);
                        return (
                          <div
                            key={index}
                            className="bg-white border border-emerald-100 text-emerald-600 p-2 rounded-xl text-center text-xs font-bold shadow-sm"
                          >
                            {horaValue}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-xs italic py-8">
                      {fechaDisponibilidad 
                        ? "No hay horarios libres para esta fecha" 
                        : "Seleccione una fecha para ver horarios"}
                    </p>
                  )
                ) : (
                  slotsOcupados.length > 0 ? (
                    <div className="flex flex-col gap-2 mt-4">
                      {slotsOcupados.map((slot, index) => {
                        return (
                          <div
                            key={index}
                            className="bg-white border border-red-100 p-3 rounded-xl flex justify-between items-center shadow-sm"
                          >
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              Cita Agendada
                            </span>
                            <span className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1 rounded-lg">
                              {slot.inicio} - {slot.fin}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center text-gray-400 text-xs italic py-8">
                      {fechaDisponibilidad 
                        ? "No hay horarios ocupados para esta fecha" 
                        : "Seleccione una fecha para ver horarios"}
                    </p>
                  )
                )}
              </div>

              {/* Botones de acción inferior */}
              <div className="pt-6 border-t border-gray-100 flex gap-4">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all"
                >
                  Modificar
                </button>
                <button
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex-1 py-4 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-red-100"
                >
                  Eliminar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* OVERLAY DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {showConfirmDelete && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-8 text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2">
              ¿Eliminar "{consultorio.nombre}"?
            </h3>
            <p className="text-sm text-gray-500 font-medium mb-8 max-w-sm mx-auto">
              Esta acción eliminará el consultorio permanentemente. No podrás deshacerlo. Si este consultorio tiene citas registradas, no podrá ser eliminado por motivos de integridad de datos.
            </p>
            <div className="flex gap-4 w-full max-w-sm">
              <button
                onClick={() => setShowConfirmDelete(false)}
                disabled={loading}
                className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex-1 py-4 bg-red-500 text-white font-bold rounded-xl shadow-md hover:bg-red-600 transition-colors shadow-red-500/20"
              >
                {loading ? "..." : "Sí, Eliminar"}
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

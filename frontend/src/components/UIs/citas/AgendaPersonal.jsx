import React, { useState, useEffect, useCallback } from "react";
import {
  ESTADO_CITA,
  ESTADO_CITA_LABELS,
  ESTADO_CITA_COLORS,
} from "../../../constants/enums";

const API_URL = import.meta.env.VITE_API_URL;

export default function AgendaPersonal({ onClose, dataMaster, user, onVerDetalles }) {
  const [loading, setLoading] = useState(false);
  const [selectedOdontologo, setSelectedOdontologo] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [citas, setCitas] = useState([]);
  const [error, setError] = useState(null);

  const fetchCitas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // La API ahora devuelve id_estado_cita (integer)
      let url = `${API_URL}/citas?page=1&limit=100&estado=${ESTADO_CITA.PROGRAMADA}`;

      if (user?.rol >= 5) {
        // Para pacientes: filtrar por su propio ID y no restringir por fecha
        url += `&id_paciente=${user?.id_persona || user?.id_usuario}`;
      } else {
        // Para personal: usar filtros de odontólogo y fecha
        if (selectedOdontologo) {
          url += `&id_personal=${selectedOdontologo}`;
        }
        if (selectedDate) {
          url += `&fecha_agen_desde=${selectedDate}&fecha_agen_hasta=${selectedDate}`;
        }
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();

      if (data.success !== false) {
        setCitas(data.data || []);
      } else {
        setError(data.message || "Error al cargar las citas.");
      }
    } catch (err) {
      setError("Error de conexión al cargar las citas.");
    } finally {
      setLoading(false);
    }
  }, [selectedOdontologo, selectedDate]);

  useEffect(() => {
    fetchCitas();
  }, [fetchCitas]);

  const getPacienteName = (id) => {
    if (!dataMaster?.pacientes) return id;
    const paciente = dataMaster.pacientes.find(
      (p) => (p.id_persona || p.id_usuario || p.id) == id,
    );
    return paciente ? paciente.nombre : `Paciente #${id}`;
  };

  const getOdontologoName = (id) => {
    if (!dataMaster?.odontologos) return id;
    const odon = dataMaster.odontologos.find(
      (o) => (o.id_personal || o.id_persona || o.id) == id,
    );
    return odon ? odon.nombre : `Doc. #${id}`;
  };

  const getSalaName = (id) => {
    if (!dataMaster?.salas) return `Sala #${id}`;
    const sala = dataMaster.salas.find((s) => s.id_sala == id);
    return sala ? sala.nombre : `Sala #${id}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    // Si ya viene formateado como "DD/MM/YY HH:MM", extraemos la parte de la hora
    if (dateString.includes(" ")) {
      return dateString.split(" ")[1];
    }
    const d = new Date(dateString);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div className="animate-fade-in-up w-full h-full flex flex-col">
      <div className="mb-6 border-b border-gray-100 pb-4">
        <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight italic">
          Agenda Personal
        </h2>
        <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
          Visualice su horario y citas asignadas
        </p>
      </div>

      <div className="flex-1 flex flex-col gap-6">
        {/* Filtros o Controles */}
        {user?.rol < 5 && (
          <div className="bg-gray-50 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Vista Actual
                </p>
                <p className="font-bold text-[#2A5C4D] capitalize">
                  {selectedDate
                    ? new Date(selectedDate + "T12:00:00").toLocaleDateString(
                        "es-ES",
                        {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        },
                      )
                    : "Completa"}
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <select
                  value={selectedOdontologo}
                  onChange={(e) => setSelectedOdontologo(e.target.value)}
                  className="w-full bg-white border-2 border-gray-100 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 focus:outline-none focus:border-[#148F77] focus:ring-0 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Todos los odontólogos</option>
                  {dataMaster?.odontologos?.map((od, idx) => (
                    <option
                      key={od.id || od.id_persona || idx}
                      value={od.id || od.id_persona}
                    >
                      {od.nombre}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">
                  ▼
                </div>
              </div>

              <div className="relative w-full sm:w-auto">
                <input
                  type="text"
                  readOnly
                  placeholder="DD/MM/AA"
                  value={
                    selectedDate
                      ? (() => {
                          const [y, m, d] = selectedDate.split("-");
                          return `${d}/${m}/${y.slice(-2)}`;
                        })()
                      : ""
                  }
                  className="w-full sm:w-auto bg-white border-2 border-gray-100 px-4 py-2 rounded-xl text-xs font-bold text-gray-600 focus:outline-none focus:border-[#148F77] transition-colors cursor-pointer"
                  onClick={(e) => e.target.nextSibling.showPicker()}
                />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="absolute opacity-0 inset-0 pointer-events-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Contenedor Principal */}
        <div className="flex-1 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col min-h-[300px] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 opacity-50">
              <div className="w-8 h-8 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#148F77]">
                Cargando agenda...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-full opacity-70 text-red-500">
              <p className="text-sm font-bold uppercase">{error}</p>
            </div>
          ) : citas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full opacity-50">
              <p className="text-sm font-black text-[#2A5C4D] uppercase tracking-widest">
                Día Libre
              </p>
              <p className="text-xs font-bold text-gray-400 mt-2">
                No hay citas programadas para esta fecha.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {citas.map((cita) => {
                const estadoColors =
                  ESTADO_CITA_COLORS[cita.id_estado_cita] ||
                  ESTADO_CITA_COLORS[ESTADO_CITA.PROGRAMADA];
                const estadoLabel =
                  cita.nombre_estado ||
                  ESTADO_CITA_LABELS[cita.id_estado_cita] ||
                  `Estado ${cita.id_estado_cita}`;
                return (
                  <div
                    key={cita.id_cita}
                    className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden flex flex-col sm:flex-row sm:items-center gap-4 pl-6"
                  >
                    <div
                      className={`absolute top-0 left-0 w-1.5 h-full ${estadoColors.bar}`}
                    ></div>

                    <div className="flex flex-col sm:w-32 flex-shrink-0">
                      <span className="text-[10px] font-bold text-[#148F77] uppercase tracking-widest mb-0.5">
                        {cita.fecha_agendamiento
                          ? cita.fecha_agendamiento.split(" ")[0]
                          : ""}
                      </span>
                      <span className="text-lg font-black text-[#2A5C4D]">
                        {formatTime(cita.fecha_agendamiento)}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        {getSalaName(cita.id_sala)}
                      </span>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 border-t sm:border-t-0 sm:border-l border-gray-50 pt-3 sm:pt-0 sm:pl-4 w-full">
                      {user?.rol < 5 && (
                        <div className="min-w-0">
                          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                            Paciente
                          </p>
                          <p
                            className="text-sm font-bold text-gray-700 truncate"
                            title={getPacienteName(cita.id_paciente)}
                          >
                            {getPacienteName(cita.id_paciente)}
                          </p>
                        </div>
                      )}

                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                          Motivo
                        </p>
                        <p
                          className="text-xs text-gray-600 truncate"
                          title={cita.cita_obs || "Sin observaciones"}
                        >
                          {cita.cita_obs || (
                            <span className="text-gray-300 italic">
                              Sin observaciones
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">
                          Odontólogo
                        </p>
                        <p
                          className="text-sm font-bold text-gray-700 truncate"
                          title={getOdontologoName(cita.id_personal)}
                        >
                          {getOdontologoName(cita.id_personal)}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 sm:w-auto flex flex-col sm:flex-row items-start sm:items-center justify-end gap-2 mt-2 sm:mt-0">
                      <span
                        className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-md text-center ${estadoColors.badge}`}
                      >
                        {estadoLabel}
                      </span>
                      {user?.rol < 5 && (
                        <button
                          onClick={() => onVerDetalles(cita)}
                          className="px-4 py-1.5 bg-gray-100 hover:bg-emerald-50 text-[#148F77] rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors shadow-sm whitespace-nowrap"
                        >
                          Detalles
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

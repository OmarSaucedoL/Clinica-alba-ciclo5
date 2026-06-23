import { useState, useEffect, useMemo, useRef } from "react";
import FormularioPaciente from "../RegisterPatient";

const API_URL = import.meta.env.VITE_API_URL;
const ROLES = { ODONTOLOGO: 2 };

export default function AgendarCitas({
  onClose,
  user,
  isStaff,
  dataMaster,
  onRefresh,
  initialData,
  onSuccess,
}) {
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const userRolId = Number(user?.rol);
  const isOdontologo = userRolId === ROLES.ODONTOLOGO;

  const [pacientes, setPacientes] = useState([]);
  const [odontologosFiltrados, setOdontologosFiltrados] = useState([]);
  const [slotsDisponibles, setSlotsDisponibles] = useState([]);

  const [pacienteSearch, setPacienteSearch] = useState("");
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false);
  const [selectedPacienteName, setSelectedPacienteName] = useState("");

  const pacientesResult =
    (pacientes.length > 0 ? pacientes : dataMaster?.pacientes || []).filter((p) =>
      p.nombre?.toLowerCase().includes(pacienteSearch.toLowerCase()),
    );

  const [formData, setFormData] = useState({
    fecha_base: initialData?.fecha_base || "",
    hora_seleccionada: "",
    id_paciente:
      initialData?.id_paciente || (isStaff ? "" : user?.id_persona || ""),
    id_odontologo:
      initialData?.id_personal ||
      (isOdontologo ? user?.id_persona || user?.id_usuario || "" : ""),
    id_sala: initialData?.id_sala || "",
    cita_obs: initialData?.cita_obs || "",
    id_procedimiento: initialData?.id_procedimiento || "",
  });

  const abortDoc = useRef(null);
  const abortSlots = useRef(null);
  const hoy = new Date().toISOString().split("T")[0];

  const salas = (dataMaster?.salas || []).filter(s => {
    const isStateOk = s.estado_sala === 'ACTIVA' || s.estado_sala === 'DISPONIBLE';
    if (!isStateOk) return false;
    // Si no es staff (es decir, es paciente), solo mostramos las salas de tipo GENERAL
    if (!isStaff) {
      return s.tipo_sala?.toUpperCase() === 'GENERAL';
    }
    return true;
  });

  useEffect(() => {
    const source = pacientes.length > 0 ? pacientes : dataMaster?.pacientes;
    if (initialData?.id_paciente && source) {
      const p = source.find(
        (item) =>
          (item.id_persona || item.id_usuario || item.id) ==
          initialData.id_paciente,
      );
      if (p) {
        setSelectedPacienteName(p.nombre);
        setPacienteSearch(p.nombre);
      }
    }
  }, [initialData, dataMaster?.pacientes, pacientes]);

  useEffect(() => {
    const fetchOdontologos = async () => {
      try {
        const res = await fetch(`${API_URL}/odontologos`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        setOdontologosFiltrados(Array.isArray(data) ? data : data.data || []);
      } catch (err) {
        console.error("Error fetching odontologos", err);
      }
    };

    const fetchPacientes = async () => {
      try {
        const res = await fetch(`${API_URL}/pacientes`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await res.json();
        if (data.success) {
          setPacientes(data.data);
        }
      } catch (err) {
        console.error("Error fetching pacientes", err);
      }
    };

    fetchOdontologos();
    fetchPacientes();
  }, []);

  const handleProcChange = async (idProc) => {
    if (abortDoc.current) abortDoc.current.abort();
    abortDoc.current = new AbortController();

    setFormData((prev) => ({
      ...prev,
      id_procedimiento: idProc,
      id_odontologo: isOdontologo ? prev.id_odontologo : "",
      hora_seleccionada: "",
    }));
    setSlotsDisponibles([]);

    try {
      if (!idProc) {
        const res = await fetch(`${API_URL}/odontologos`, {
          signal: abortDoc.current.signal,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }).then((r) => r.json());
        setOdontologosFiltrados(Array.isArray(res) ? res : res.data || []);
      } else {
        const res = await fetch(
          `${API_URL}/citas/odontologos-por-procedimiento/${idProc}`,
          {
            signal: abortDoc.current.signal,
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        ).then((r) => r.json());
        if (res.success) setOdontologosFiltrados(res.data);
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Fallo carga especialistas");
    }
  };

  useEffect(() => {
    if (!formData.id_odontologo || !formData.id_sala || !formData.fecha_base) {
      setSlotsDisponibles([]);
      return;
    }

    const partesFecha = formData.fecha_base.split("-");
    if (partesFecha[0].length !== 4 || formData.fecha_base.length !== 10)
      return;

    if (abortSlots.current) abortSlots.current.abort();
    abortSlots.current = new AbortController();

    const delayDebounceFn = setTimeout(() => {
      setLoadingSlots(true);
      setErrorMessage("");

      const cargarSlots = async () => {
        try {
          const res = await fetch(
            `${API_URL}/citas/disponibilidad?id_personal=${formData.id_odontologo}&id_sala=${formData.id_sala}&fecha=${formData.fecha_base}`,
            {
              signal: abortSlots.current.signal,
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          ).then((r) => r.json());
          if (res.success) {
            let horariosFiltrados = res.data;

            const dateObj = new Date(formData.fecha_base + "T00:00:00");
            if (dateObj.getDay() === 6) {
              // Sábado
              horariosFiltrados = horariosFiltrados.filter((slot) => {
                const horaInt = parseInt(slot.inicio.split(":")[0], 10);
                return horaInt >= 9 && horaInt < 13;
              });
            }

            setSlotsDisponibles(horariosFiltrados);
            if (
              !horariosFiltrados.some(
                (s) => s.inicio === formData.hora_seleccionada,
              )
            ) {
              setFormData((prev) => ({ ...prev, hora_seleccionada: "" }));
            }
          }
        } catch (err) {
          if (err.name !== "AbortError")
            setErrorMessage("Error al obtener disponibilidad.");
        } finally {
          setLoadingSlots(false);
        }
      };
      cargarSlots();
    }, 450);

    return () => {
      clearTimeout(delayDebounceFn);
      if (abortSlots.current) abortSlots.current.abort();
    };
  }, [formData.id_odontologo, formData.id_sala, formData.fecha_base]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.hora_seleccionada)
      return setErrorMessage("Selecciona una hora disponible.");
    if (!formData.id_paciente)
      return setErrorMessage("Debe seleccionar un paciente.");

    setLoading(true);
    setErrorMessage("");

    // --- PAYLOAD CON DATOS DE AUDITORÍA ---
    const payload = {
      fecha_agendamiento: `${formData.fecha_base} ${formData.hora_seleccionada}:00`,
      id_paciente: Number(formData.id_paciente),
      id_odontologo: Number(formData.id_odontologo),
      id_sala: Number(formData.id_sala),
      cita_obs: formData.cita_obs,
      id_procedimiento: formData.id_procedimiento ? Number(formData.id_procedimiento) : null,
      // Inyectamos el ID del usuario y la sesión desde las props
      id_usuario: user?.id_usuario,
      id_sesion: user?.id_sesion,
    };

    try {
      const res = await fetch(`${API_URL}/citas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        if (onSuccess) {
          // Si viene del flujo de Reprogramar, llamar al callback especial
          onSuccess();
        } else {
          setIsSuccess(true);
        }
      } else setErrorMessage(data.message);
    } catch {
      setErrorMessage("Error de conexión local.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#2A5C4D]/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-[3rem] w-full max-w-xl shadow-2xl overflow-hidden animate-fade-in-up max-h-[95vh] overflow-y-auto">
        {isSuccess ? (
          <div className="p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mb-6 mx-auto animate-bounce">
              ✓
            </div>
            <h3 className="text-3xl font-black text-[#2A5C4D] mb-2 tracking-tighter">
              ¡Cita Confirmada!
            </h3>
            <p className="text-gray-400 text-xs mb-10">
              Tu cita fue registrada correctamente.
            </p>
            <button
              onClick={onClose}
              className="w-full py-5 bg-[#148F77] text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Regresar
            </button>
          </div>
        ) : (
          <div className="p-10">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-[#2A5C4D] italic tracking-tighter">
                Agendar Cita
              </h3>
              <button
                onClick={onClose}
                className="text-gray-300 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-[10px] font-black uppercase animate-shake">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isStaff && userRolId >= 5 ? (
                <div className="space-y-1 relative">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest px-2">
                    Paciente (Usted)
                  </label>
                  <input
                    type="text"
                    disabled
                    className="w-full p-4 bg-gray-100 text-gray-500 rounded-2xl text-xs font-bold border-none outline-none cursor-not-allowed"
                    value={user?.nombre || user?.nombre_usuario || "Mi Perfil"}
                  />
                </div>
              ) : (
                isStaff && (
                  <div className="space-y-1 relative">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        Paciente
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowRegisterForm(true)}
                        className="text-[9px] font-black text-[#148F77] uppercase tracking-widest hover:underline"
                      >
                        + Paciente nuevo
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar paciente por nombre..."
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={
                          showPacienteDropdown
                            ? pacienteSearch
                            : selectedPacienteName || pacienteSearch
                        }
                        onChange={(e) => {
                          setPacienteSearch(e.target.value);
                          setShowPacienteDropdown(true);
                          if (e.target.value === "") {
                            setFormData((prev) => ({
                              ...prev,
                              id_paciente: "",
                            }));
                            setSelectedPacienteName("");
                          }
                        }}
                        onFocus={() => setShowPacienteDropdown(true)}
                        onBlur={() => {
                          setTimeout(() => setShowPacienteDropdown(false), 200);
                        }}
                      />
                      {showPacienteDropdown && (
                        <ul className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                          {pacientesResult.length > 0 ? (
                            pacientesResult.map((p) => (
                              <li
                                key={p.id_persona || p.id_usuario || p.id}
                                className="p-4 text-xs font-bold text-gray-600 hover:bg-emerald-50 hover:text-[#148F77] cursor-pointer transition-colors border-b border-gray-50 last:border-0"
                                onMouseDown={() => {
                                  setFormData((prev) => ({
                                    ...prev,
                                    id_paciente:
                                      p.id_persona || p.id_usuario || p.id,
                                  }));
                                  setSelectedPacienteName(p.nombre);
                                  setPacienteSearch("");
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
                  </div>
                )
              )}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                  Tratamiento
                </label>
                <select
                  className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                  value={formData.id_procedimiento}
                  onChange={(e) => handleProcChange(e.target.value)}
                >
                  <option value="">Cualquier servicio...</option>
                  {dataMaster.procedimientos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.descripcion}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                    Especialista
                  </label>
                  <select
                    required
                    disabled={isOdontologo}
                    className={`w-full p-4 rounded-2xl text-xs font-bold border-none outline-none ${isOdontologo ? "bg-gray-100 text-gray-500 cursor-not-allowed" : "bg-gray-50 focus:ring-4 focus:ring-emerald-50"}`}
                    value={formData.id_odontologo}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        id_odontologo: e.target.value,
                      }))
                    }
                  >
                    <option value="">Elegir...</option>
                    {isOdontologo &&
                      !odontologosFiltrados.some(
                        (o) =>
                          (o.id_personal || o.id) == formData.id_odontologo,
                      ) && <option value={formData.id_odontologo}>(Tú)</option>}
                    {odontologosFiltrados.map((o) => (
                      <option
                        key={o.id_personal || o.id}
                        value={o.id_personal || o.id}
                      >
                        {o.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                    Sala
                  </label>
                  <select
                    required
                    className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                    value={formData.id_sala}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        id_sala: e.target.value,
                      }))
                    }
                  >
                    <option value="">Sala...</option>
                    {salas.map((s) => (
                      <option key={s.id_sala} value={s.id_sala}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                  Fecha
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    placeholder="DD/MM/AA"
                    required
                    value={
                      formData.fecha_base
                        ? (() => {
                            const [y, m, d] = formData.fecha_base.split("-");
                            return `${d}/${m}/${y.slice(-2)}`;
                          })()
                        : ""
                    }
                    className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 cursor-pointer"
                    onClick={(e) => e.target.nextSibling.showPicker()}
                  />
                  <input
                    type="date"
                    required
                    min={hoy}
                    max="2099-12-31"
                    value={formData.fecha_base}
                    onChange={(e) => {
                      const val = e.target.value;
                      const year = val.split("-")[0];
                      if (year.length > 4) return;

                      const dateObj = new Date(val + "T00:00:00");
                      if (dateObj.getDay() === 0) {
                        setErrorMessage(
                          "La clínica Alba no atiende los días domingo.",
                        );
                        setFormData((prev) => ({ ...prev, fecha_base: "" }));
                        return;
                      }

                      setFormData((prev) => ({
                        ...prev,
                        fecha_base: val,
                        hora: "",
                      }));
                      setErrorMessage("");
                    }}
                    className="absolute opacity-0 inset-0 pointer-events-none"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs"></div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-[2rem] p-6 border border-dashed border-gray-200 min-h-[130px]">
                <p className="text-[9px] font-black text-gray-400 uppercase mb-4 tracking-widest">
                  Horarios Disponibles:
                </p>
                {loadingSlots ? (
                  <div className="flex justify-center py-4 space-x-2">
                    <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce [animation-delay:-.3s]"></div>
                    <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce [animation-delay:-.5s]"></div>
                  </div>
                ) : slotsDisponibles.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {slotsDisponibles.map((slot, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            hora_seleccionada: slot.inicio,
                          }))
                        }
                        className={`p-2 text-[10px] font-black rounded-xl transition-all shadow-sm ${formData.hora_seleccionada === slot.inicio ? "bg-[#148F77] text-white" : "bg-white text-[#148F77] hover:bg-emerald-50"}`}
                      >
                        {slot.inicio}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-[9px] text-gray-400 italic py-4">
                    Selecciona al doctor, una sala y una fecha. Consulta la
                    disponibilidad del día.
                  </p>
                )}
              </div>

              <textarea
                placeholder="Motivo de consulta / Observaciones..."
                required
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold h-20 border-none resize-none shadow-inner outline-none focus:ring-4 focus:ring-emerald-50"
                value={formData.cita_obs}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, cita_obs: e.target.value }))
                }
              ></textarea>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-[#148F77] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
              >
                {loading ? "PROCESANDO..." : "AGENDAR CITA"}
              </button>
            </form>
          </div>
        )}
      </div>
      {showRegisterForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-xl">
            <FormularioPaciente
              onClose={() => setShowRegisterForm(false)}
              onSuccess={() => {
                onRefresh?.();
                setShowRegisterForm(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

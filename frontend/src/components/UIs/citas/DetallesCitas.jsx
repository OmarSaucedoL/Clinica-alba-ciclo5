import { useState, useEffect } from "react";
import AgendarCitas from "./AgendarCitas";
import {
  ESTADO_CITA,
  ESTADO_CITA_LABELS,
  ESTADO_CITA_COLORS,
} from "../../../constants/enums";

const API_URL = import.meta.env.VITE_API_URL;

export default function DetallesCitas({
  idCita,
  originalCita,
  user,
  dataMaster,
  onClose,
  isNested = false,
}) {
  const [loading, setLoading] = useState(true);
  const [cita, setCita] = useState(null);
  const [error, setError] = useState("");

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showReprogramarModal, setShowReprogramarModal] = useState(false);
  const [reprogramarData, setReprogramarData] = useState(null); // datos pre-llenados para AgendarCitas

  const [formData, setFormData] = useState({
    id_personal: "",
    id_paciente: "",
    id_sala: "",
    fecha_base: "",
    hora_seleccionada: "",
    estado_cita: "",
    cita_obs: "",
    id_procedimiento: "",
  });

  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsDisponibles, setSlotsDisponibles] = useState([]);

  // Estados para servicios
  const [serviciosCita, setServiciosCita] = useState([]);
  const [catalogoServicios, setCatalogoServicios] = useState([]);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [addingServicio, setAddingServicio] = useState(false);
  const [selectedServicioId, setSelectedServicioId] = useState("");
  const [customPrecio, setCustomPrecio] = useState("");
  const [showConfirmDelete, setShowConfirmDelete] = useState(null);
  const [servicesError, setServicesError] = useState("");

  const fetchCita = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/citas/${idCita}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setCita(data.data);
      } else {
        setError(data.message || "Error al cargar la cita");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const fetchServiciosCita = async () => {
    setLoadingServicios(true);
    try {
      const res = await fetch(`${API_URL}/citas/${idCita}/servicios`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setServiciosCita(data.data);
      }
    } catch (err) {
      console.error("Error al cargar servicios de la cita", err);
    } finally {
      setLoadingServicios(false);
    }
  };

  const fetchCatalogoServicios = async () => {
    try {
      const res = await fetch(`${API_URL}/servicios`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setCatalogoServicios(data.data);
      }
    } catch (err) {
      console.error("Error al cargar catálogo de servicios", err);
    }
  };

  const handleAddServicio = async (e) => {
    e.preventDefault();
    if (!selectedServicioId) return;
    setAddingServicio(true);
    setServicesError("");
    try {
      const res = await fetch(`${API_URL}/citas/${idCita}/servicios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_servicio: Number(selectedServicioId),
          precio: customPrecio !== "" ? Number(customPrecio) : null,
          id_usuario: user?.id_usuario || null,
          id_sesion: user?.id_sesion || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchServiciosCita();
        setSelectedServicioId("");
        setCustomPrecio("");
      } else {
        setServicesError(data.message || "Error al agregar servicio");
      }
    } catch (err) {
      setServicesError("Error de conexión al agregar servicio");
    } finally {
      setAddingServicio(false);
    }
  };

  const handleDeleteServicio = (idCitaServicio) => {
    setServicesError("");
    setShowConfirmDelete(idCitaServicio);
  };

  const confirmDeleteServicio = async () => {
    if (!showConfirmDelete) return;
    const idCitaServicio = showConfirmDelete;
    setShowConfirmDelete(null);
    setServicesError("");
    try {
      const payload = {
        id_usuario: user?.id_usuario || null,
        id_sesion: user?.id_sesion || null,
      };
      const res = await fetch(`${API_URL}/citas/servicios/${idCitaServicio}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchServiciosCita();
      } else {
        setServicesError(data.message || "Error al eliminar servicio");
      }
    } catch (err) {
      setServicesError("Error de conexión al eliminar servicio");
    }
  };

  useEffect(() => {
    if (idCita) {
      fetchCita();
      fetchServiciosCita();
      fetchCatalogoServicios();
    }
  }, [idCita]);

  // Setup form data when entering edit mode
  useEffect(() => {
    if (isEditing && originalCita) {
      let initialFechaBase = "";
      let initialHora = "";

      if (
        originalCita.fecha_agendamiento &&
        originalCita.fecha_agendamiento.includes("/")
      ) {
        const parts = originalCita.fecha_agendamiento.split(" ");
        const datePart = parts[0];
        const timePart = parts[1] || "00:00";
        const [d, m, y] = datePart.split("/");
        initialFechaBase = `20${y}-${m}-${d}`;
        initialHora = timePart.slice(0, 5);
      } else if (originalCita.fecha_agendamiento) {
        const initialDate = new Date(originalCita.fecha_agendamiento);
        if (!isNaN(initialDate.getTime())) {
          const tzOffset = initialDate.getTimezoneOffset() * 60000;
          const localISOTime = new Date(initialDate - tzOffset)
            .toISOString()
            .slice(0, -1);
          initialFechaBase = localISOTime.split("T")[0];
          initialHora = localISOTime.split("T")[1].slice(0, 5);
        }
      }

      setFormData({
        id_personal: originalCita.id_personal || cita?.id_personal || "",
        id_paciente: originalCita.id_paciente || cita?.id_paciente || "",
        id_sala: originalCita.id_sala || cita?.id_sala || "",
        fecha_base: initialFechaBase,
        hora_seleccionada: initialHora,
        estado_cita: originalCita.id_estado_cita || cita?.id_estado_cita || "",
        cita_obs: originalCita.cita_obs || cita?.cita_obs || "",
        id_procedimiento:
          originalCita.id_procedimiento || cita?.id_procedimiento || "",
      });
      setSaveError("");
    }
  }, [isEditing, originalCita]);

  // Fetch slots
  useEffect(() => {
    if (
      !isEditing ||
      !formData.id_personal ||
      !formData.id_sala ||
      !formData.fecha_base
    ) {
      setSlotsDisponibles([]);
      return;
    }

    const fetchSlots = async () => {
      setLoadingSlots(true);
      try {
        const queryParams = new URLSearchParams({
          id_personal: formData.id_personal,
          id_sala: formData.id_sala,
          fecha: formData.fecha_base,
        });

        const res = await fetch(
          `${API_URL}/citas/disponibilidad?${queryParams}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const data = await res.json();
        if (data.success) {
          let horarios = data.data;

          // Si estamos viendo el odontologo/sala/fecha original,
          // asegurarnos de que el slot actual esté en la lista, ya que
          // la BD podría filtrarlo como "ocupado" (por esta misma cita).
          if (originalCita) {
            let initialFechaBase = "";
            let initialHora = "";

            if (
              originalCita.fecha_agendamiento &&
              originalCita.fecha_agendamiento.includes("/")
            ) {
              const parts = originalCita.fecha_agendamiento.split(" ");
              const datePart = parts[0];
              const timePart = parts[1] || "00:00";
              const [d, m, y] = datePart.split("/");
              initialFechaBase = `20${y}-${m}-${d}`;
              initialHora = timePart.slice(0, 5);
            } else if (originalCita.fecha_agendamiento) {
              const initialDate = new Date(originalCita.fecha_agendamiento);
              if (!isNaN(initialDate.getTime())) {
                const tzOffset = initialDate.getTimezoneOffset() * 60000;
                const localISOTime = new Date(initialDate - tzOffset)
                  .toISOString()
                  .slice(0, -1);
                initialFechaBase = localISOTime.split("T")[0];
                initialHora = localISOTime.split("T")[1].slice(0, 5);
              }
            }

            if (
              formData.id_personal == originalCita.id_personal &&
              formData.id_sala == originalCita.id_sala &&
              formData.fecha_base == initialFechaBase
            ) {
              const alreadyExists = horarios.some(
                (s) => s.inicio.slice(0, 5) === initialHora,
              );
              if (!alreadyExists) {
                // Inyectarlo en orden
                horarios.push({
                  inicio: initialHora + ":00",
                  fin: initialHora + ":30",
                });
                horarios.sort((a, b) => a.inicio.localeCompare(b.inicio));
              }
            }
          }

          setSlotsDisponibles(horarios);
        } else {
          setSlotsDisponibles([]);
        }
      } catch (err) {
        console.error("Error fetching slots:", err);
        setSlotsDisponibles([]);
      } finally {
        setLoadingSlots(false);
      }
    };

    fetchSlots();
  }, [formData.id_personal, formData.id_sala, formData.fecha_base, isEditing]);

  const handleSave = async () => {
    if (!formData.hora_seleccionada) {
      setSaveError("Debe seleccionar un horario.");
      return;
    }

    setSaving(true);
    setSaveError("");

    const fecha_agendamiento = `${formData.fecha_base} ${formData.hora_seleccionada}:00`;

    const payload = {
      id_personal: formData.id_personal,
      id_paciente: formData.id_paciente,
      fecha_agendamiento: fecha_agendamiento,
      id_sala: formData.id_sala,
      cita_obs: formData.cita_obs,
      id_estado_cita: formData.estado_cita,
      fecha_finalizacion:
        formData.estado_cita == ESTADO_CITA.COMPLETADA
          ? new Date().toISOString()
          : null,
      id_usuario: user?.id_usuario || null,
      id_sesion: user?.id_sesion || null,
      id_procedimiento: formData.id_procedimiento
        ? Number(formData.id_procedimiento)
        : null,
    };

    try {
      const res = await fetch(`${API_URL}/citas/${idCita}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setIsEditing(false);
        fetchCita();

        if (originalCita) {
          originalCita.id_personal = formData.id_personal;
          originalCita.id_paciente = formData.id_paciente;
          originalCita.id_sala = formData.id_sala;
          originalCita.fecha_agendamiento = fecha_agendamiento;
          originalCita.id_estado_cita = formData.estado_cita;
          originalCita.cita_obs = formData.cita_obs;
          originalCita.id_procedimiento = formData.id_procedimiento;
        }
      } else {
        setSaveError(data.message || "Error al actualizar la cita.");
      }
    } catch (err) {
      setSaveError("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  };

  // Helper para convertir DD/MM/YY HH:MM a YYYY-MM-DD HH:MM:SS
  const formatToISO = (dateStr) => {
    if (!dateStr || !dateStr.includes("/")) return dateStr;
    try {
      const [datePart, timePart] = dateStr.split(" ");
      const [d, m, y] = datePart.split("/");
      return `20${y}-${m}-${d} ${timePart || "00:00"}:00`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleStatusUpdate = async (newStatus, setFinalization = true) => {
    setSaving(true);
    setSaveError("");

    const payload = {
      id_personal: originalCita?.id_personal || cita?.id_personal,
      id_paciente: originalCita?.id_paciente || cita?.id_paciente,
      fecha_agendamiento: formatToISO(cita?.fecha_agendamiento),
      id_sala: originalCita?.id_sala || cita?.id_sala,
      cita_obs: cita?.cita_obs,
      id_estado_cita: newStatus, // integer ID del enum
      fecha_finalizacion: setFinalization ? new Date().toISOString() : null,
      id_usuario: user?.id_usuario || null,
      id_sesion: user?.id_sesion || null,
      id_procedimiento:
        originalCita?.id_procedimiento || cita?.id_procedimiento || null,
    };

    try {
      const res = await fetch(`${API_URL}/citas/${idCita}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setSaveError(data.message || `Error al cambiar estado`);
      }
    } catch (err) {
      setSaveError("Error de conexión.");
    } finally {
      setSaving(false);
    }
  };

  const handleReprogramar = () => {
    // originalCita viene del listado y tiene los IDs numéricos (id_paciente, id_personal, id_sala)
    // cita viene del fetch de detalle y tiene nombres pero no siempre los IDs
    const idSource = originalCita; // para IDs
    const dataSource = cita || originalCita; // para fecha y obs

    let fechaBase = "";
    if (dataSource?.fecha_agendamiento) {
      if (dataSource.fecha_agendamiento.includes(" ")) {
        // Formato DD/MM/YY HH:MM -> Extraer DD/MM/YY y convertir a YYYY-MM-DD para el input date si es posible
        const [datePart] = dataSource.fecha_agendamiento.split(" ");
        const [d, m, y] = datePart.split("/");
        // Intentamos reconstruir un formato aceptable para el input (asumiendo 20xx para el año)
        fechaBase = `20${y}-${m}-${d}`;
      } else {
        fechaBase = dataSource.fecha_agendamiento.split("T")[0];
      }
    }

    setReprogramarData({
      id_paciente: idSource?.id_paciente,
      id_personal: idSource?.id_personal,
      id_sala: idSource?.id_sala,
      cita_obs: dataSource?.cita_obs || "",
      fecha_base: fechaBase,
    });
    setShowReprogramarModal(true);
  };

  // Se llama DESPUÉS de que AgendarCitas crea la nueva cita exitosamente
  const handleReprogramarSuccess = async () => {
    setShowReprogramarModal(false);
    // Ahora sí marcamos la cita original como REPROGRAMADA
    await handleStatusUpdate(ESTADO_CITA.REPROGRAMADA, false);
  };

  const pacientesResult = dataMaster?.pacientes || [];

  const isCitaTerminada =
    cita && [2, 3, 4, 5].includes(Number(cita.id_estado_cita));

  return (
    <div
      className={
        isNested
          ? "w-full flex flex-col animate-fade-in-up"
          : "bg-white rounded-[3rem] w-full shadow-xl overflow-hidden animate-fade-in-up flex flex-col"
      }
    >
      {/* Header */}
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
          <h3 className="text-2xl font-black text-[#2A5C4D] italic tracking-tighter">
            {isEditing ? "Modificar Cita" : "Detalles de la Cita"}
          </h3>
          <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
            {isEditing ? "Editando información" : "Información completa"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-100 hover:bg-emerald-50 text-[#148F77] rounded-xl text-xs font-bold uppercase tracking-widest transition-all shadow-sm flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          ← Volver
        </button>
      </div>

      <div className="p-10 flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase">
            ⚠️ {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Columna Izquierda: Información General */}
            <div className="lg:col-span-7 space-y-6">
              {isEditing ? (
                <div className="space-y-6 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                  {saveError && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase">
                      ⚠️ {saveError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                        Paciente
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={formData.id_paciente}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            id_paciente: e.target.value,
                          })
                        }
                      >
                        <option value="">Seleccione Paciente</option>
                        {pacientesResult.map((p) => (
                          <option
                            key={p.id_persona || p.id_usuario || p.id}
                            value={p.id_persona || p.id_usuario || p.id}
                          >
                            {p.nombre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                        Especialista
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={formData.id_personal}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            id_personal: e.target.value,
                            hora_seleccionada: "",
                          })
                        }
                      >
                        <option value="">Seleccione Especialista</option>
                        {dataMaster?.odontologos?.map((o) => (
                          <option
                            key={o.id_usuario || o.id_persona || o.id}
                            value={o.id_usuario || o.id_persona || o.id}
                          >
                            {o.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                        Sala
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={formData.id_sala}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            id_sala: e.target.value,
                            hora_seleccionada: "",
                          })
                        }
                      >
                        <option value="">Seleccione Sala</option>
                        {(dataMaster?.salas || [])
                          .filter(
                            (s) =>
                              s.estado_sala === "ACTIVA" ||
                              s.estado_sala === "DISPONIBLE" ||
                              s.id_sala == formData.id_sala,
                          )
                          .map((s) => (
                            <option key={s.id_sala} value={s.id_sala}>
                              {s.nombre}
                            </option>
                          ))}
                      </select>
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
                          value={
                            formData.fecha_base
                              ? (() => {
                                  const [y, m, d] =
                                    formData.fecha_base.split("-");
                                  return `${d}/${m}/${y.slice(-2)}`;
                                })()
                              : ""
                          }
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 cursor-pointer"
                          onClick={(e) => e.target.nextSibling.showPicker()}
                        />
                        <input
                          type="date"
                          className="absolute opacity-0 inset-0 pointer-events-none"
                          value={formData.fecha_base}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              fecha_base: e.target.value,
                              hora_seleccionada: "",
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-[2rem] p-6 border border-dashed border-gray-200 min-h-[130px]">
                    <p className="text-[9px] font-black text-gray-400 uppercase mb-4 tracking-widest">
                      Horarios Disponibles:
                    </p>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4 space-x-2">
                        <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce delay-150"></div>
                      </div>
                    ) : slotsDisponibles.length > 0 ? (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slotsDisponibles.map((slot, index) => {
                          const horaValue = slot.inicio.slice(0, 5);
                          return (
                            <button
                              key={index}
                              type="button"
                              className={`p-2 rounded-xl text-xs font-bold transition-all ${
                                formData.hora_seleccionada === horaValue
                                  ? "bg-[#148F77] text-white shadow-md transform scale-105"
                                  : "bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#148F77]"
                              }`}
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  hora_seleccionada: horaValue,
                                })
                              }
                            >
                              {horaValue}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 text-xs italic py-4">
                        {!formData.id_personal ||
                        !formData.id_sala ||
                        !formData.fecha_base
                          ? "Seleccione Odontólogo, Sala y Fecha para ver horarios"
                          : "No hay horarios disponibles"}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                        Estado
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={formData.estado_cita}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            estado_cita: e.target.value,
                          })
                        }
                      >
                        <option value={ESTADO_CITA.PROGRAMADA}>
                          Programada
                        </option>
                        <option value={ESTADO_CITA.COMPLETADA}>
                          Completada
                        </option>
                        <option value={ESTADO_CITA.CANCELADA}>Cancelada</option>
                        <option value={ESTADO_CITA.REPROGRAMADA}>
                          Reprogramada
                        </option>
                        <option value={ESTADO_CITA.NO_ASISTIO}>
                          No Asistió
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                        Tratamiento / Procedimiento
                      </label>
                      <select
                        className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                        value={formData.id_procedimiento || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            id_procedimiento: e.target.value,
                          })
                        }
                      >
                        <option value="">Cualquier servicio...</option>
                        {(dataMaster?.procedimientos || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.descripcion}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                      Observaciones
                    </label>
                    <textarea
                      className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-medium border-none outline-none focus:ring-4 focus:ring-emerald-50 resize-none h-24"
                      value={formData.cita_obs}
                      onChange={(e) =>
                        setFormData({ ...formData, cita_obs: e.target.value })
                      }
                      placeholder="Detalles adicionales..."
                    ></textarea>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Guardando..." : "Guardar Cambios"}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      disabled={saving}
                      className="flex-1 py-4 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : cita ? (
                <div className="space-y-6 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                  {saveError && (
                    <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase animate-shake">
                      ⚠️ {saveError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Paciente
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.nombre_paciente}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Especialista
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.nombre_personal}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
                        Fecha Agendada
                      </p>
                      <div className="text-xl font-black text-[#2A5C4D]">
                        {cita.fecha_agendamiento || "Cargando..."}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Sala
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.nombre_sala}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Fecha de Registro
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.fecha_registro || "N/A"}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Fecha de Finalización
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.fecha_finalizacion || (
                          <span className="italic opacity-50">Pendiente</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Estado Actual
                      </p>
                      {(() => {
                        const colors =
                          ESTADO_CITA_COLORS[cita.id_estado_cita] ||
                          ESTADO_CITA_COLORS[ESTADO_CITA.PROGRAMADA];
                        const label =
                          cita.nombre_estado ||
                          ESTADO_CITA_LABELS[cita.id_estado_cita] ||
                          `Estado ${cita.id_estado_cita}`;
                        return (
                          <span
                            className={`px-3 py-1 mt-1 inline-block rounded-full text-[10px] font-black uppercase tracking-wider ${colors.badge}`}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Tratamiento / Procedimiento
                      </p>
                      <p className="text-sm font-bold text-gray-800">
                        {cita.nombre_procedimiento || (
                          <span className="italic opacity-50">
                            Sin tratamiento asignado
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Observaciones
                    </p>
                    <p className="text-sm font-medium text-gray-600">
                      {cita.cita_obs || (
                        <span className="italic opacity-50">
                          Sin observaciones registradas.
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="pt-6 border-t border-gray-100 space-y-4">
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleStatusUpdate("FINALIZADA")}
                        disabled={saving}
                        className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? "..." : "Finalizar"}
                      </button>
                      <button
                        onClick={() => handleStatusUpdate("CANCELADA")}
                        disabled={saving}
                        className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? "..." : "Cancelar"}
                      </button>
                      <button
                        onClick={handleReprogramar}
                        disabled={saving}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? "..." : "Reprogramar"}
                      </button>
                    </div>

                    <div className="flex gap-4">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all cursor-pointer"
                      >
                        Modificar Cita
                      </button>
                      <button
                        onClick={onClose}
                        className="flex-1 py-4 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
                      >
                        Volver
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Columna Derecha: Servicios Realizados */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6">
                <div className="flex justify-between items-center border-b border-gray-50 pb-4">
                  <div>
                    <h4 className="text-lg font-black text-[#2A5C4D] italic tracking-tight">
                      Servicios Realizados
                    </h4>
                    <p className="text-[9px] text-[#148F77] font-black uppercase tracking-widest mt-0.5">
                      Cargos aplicados
                    </p>
                  </div>
                </div>

                {servicesError && (
                  <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl">
                    ⚠️ {servicesError}
                  </div>
                )}

                {loadingServicios ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : serviciosCita.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs italic py-6">
                    No se han registrado servicios en esta cita.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                      {serviciosCita.map((serv) => (
                        <div
                          key={serv.id_cita_servicio}
                          className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-emerald-50/10 transition-colors"
                        >
                          <div>
                            <p className="text-xs font-bold text-gray-700">
                              {serv.nombre}
                            </p>
                            <p className="text-[9px] text-gray-400 font-medium">
                              Registrado: {serv.fecha_creacion}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-black text-[#2A5C4D]">
                              Bs {serv.precio.toFixed(2)}
                            </span>
                            {!isCitaTerminada && (
                              <button
                                onClick={() =>
                                  handleDeleteServicio(serv.id_cita_servicio)
                                }
                                className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-xs transition-colors focus:outline-none cursor-pointer"
                                title="Remover de la cita"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Total Servicios:
                      </span>
                      <span className="text-xl font-black text-[#2A5C4D]">
                        Bs{" "}
                        {serviciosCita
                          .reduce((acc, curr) => acc + curr.precio, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Formulario para agregar servicios */}
                {!isCitaTerminada && (
                  <form
                    onSubmit={handleAddServicio}
                    className="border-t border-gray-100 pt-6 space-y-4"
                  >
                    <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest">
                      Agregar Servicio a la Cita
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                          Servicio
                        </label>
                        <select
                          required
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                          value={selectedServicioId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectedServicioId(val);
                            // Pre-llenar el precio sugerido
                            const selected = catalogoServicios.find(
                              (s) => String(s.id) === String(val),
                            );
                            if (selected) {
                              setCustomPrecio(selected.precio);
                            } else {
                              setCustomPrecio("");
                            }
                          }}
                        >
                          <option value="">Seleccione un servicio...</option>
                          {catalogoServicios.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.nombre} (Bs {s.precio.toFixed(2)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                          Precio Cobrado (Bs)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="0.00"
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                          value={customPrecio}
                          onChange={(e) => setCustomPrecio(e.target.value)}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={addingServicio || !selectedServicioId}
                        className="w-full py-4 bg-[#148F77] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#0f6b59] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {addingServicio ? "Agregando..." : "+ Agregar Servicio"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showReprogramarModal && reprogramarData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <AgendarCitas
            onClose={() => {
              setShowReprogramarModal(false);
              setReprogramarData(null);
            }}
            user={user}
            dataMaster={dataMaster}
            isStaff={true}
            initialData={reprogramarData}
            onRefresh={() => {}}
            onSuccess={handleReprogramarSuccess}
          />
        </div>
      )}

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100">
            <h4 className="text-lg font-black text-[#2A5C4D] text-center mb-4 italic">
              ¿Eliminar Servicio?
            </h4>
            <p className="text-gray-600 text-xs font-semibold text-center mb-6">
              ¿Está seguro de remover este servicio de la cita? Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmDeleteServicio}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer hover:shadow-lg active:scale-95"
              >
                Sí, Eliminar
              </button>
              <button
                onClick={() => setShowConfirmDelete(null)}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

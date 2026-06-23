import { useState, useEffect } from "react";
import AgendarCitas from "./AgendarCitas";
import {
  ESTADO_CITA,
  ESTADO_CITA_LABELS,
  ESTADO_CITA_COLORS,
} from "../../../constants/enums";
import MostrarCitaCard from "./detalles_cita/MostrarCitaCard";
import EditarCitaForm from "./detalles_cita/EditarCitaForm";
import TabServiciosCita from "./detalles_cita/TabServiciosCita";
import TabMaterialesCita from "./detalles_cita/TabMaterialesCita";

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

  // Estados para materiales
  const [activeTabDerecha, setActiveTabDerecha] = useState("servicios"); // "servicios" o "materiales"
  const [materialesCita, setMaterialesCita] = useState([]);
  const [catalogoMateriales, setCatalogoMateriales] = useState([]);
  const [lotesMaterial, setLotesMaterial] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(false);
  const [addingMaterial, setAddingMaterial] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedLoteId, setSelectedLoteId] = useState("");
  const [cantidadMaterial, setCantidadMaterial] = useState("");
  const [showConfirmDeleteMaterial, setShowConfirmDeleteMaterial] = useState(null);
  const [materialsError, setMaterialsError] = useState("");

  // Nuevos estados para detalles de consumos de materiales
  const [catalogoDientes, setCatalogoDientes] = useState([]);
  const [selectedServicioIdForMaterial, setSelectedServicioIdForMaterial] = useState("");
  const [selectedDienteCodigo, setSelectedDienteCodigo] = useState("");
  const [materialObservacion, setMaterialObservacion] = useState("");

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

  const fetchMaterialesCita = async () => {
    setLoadingMateriales(true);
    try {
      const res = await fetch(`${API_URL}/citas/${idCita}/materiales`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setMaterialesCita(data.data);
      }
    } catch (err) {
      console.error("Error al cargar materiales de la cita", err);
    } finally {
      setLoadingMateriales(false);
    }
  };

  const fetchCatalogoMateriales = async () => {
    try {
      const res = await fetch(`${API_URL}/materiales`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setCatalogoMateriales(data.data);
      }
    } catch (err) {
      console.error("Error al cargar catálogo de materiales", err);
    }
  };

  const fetchCatalogoDientes = async () => {
    try {
      const res = await fetch(`${API_URL}/dientes`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setCatalogoDientes(data.data);
      }
    } catch (err) {
      console.error("Error al cargar catálogo de dientes", err);
    }
  };

  const fetchLotesMaterial = async (idMaterial) => {
    if (!idMaterial) {
      setLotesMaterial([]);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/inventario/lotes/${idMaterial}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        // Solo conservar los lotes que tengan stock disponible
        setLotesMaterial((data.data || []).filter(l => l.cantidad_disponible > 0));
      }
    } catch (err) {
      console.error("Error al cargar lotes del material", err);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!selectedLoteId || !cantidadMaterial || Number(cantidadMaterial) <= 0) return;
    
    setAddingMaterial(true);
    setMaterialsError("");
    try {
      const res = await fetch(`${API_URL}/citas/${idCita}/materiales`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_lote: Number(selectedLoteId),
          cantidad: Number(cantidadMaterial),
          id_servicio: selectedServicioIdForMaterial ? Number(selectedServicioIdForMaterial) : null,
          codigo_diente: selectedDienteCodigo ? Number(selectedDienteCodigo) : null,
          observacion: materialObservacion.trim() || null,
          id_usuario: user?.id_usuario || null,
          id_sesion: user?.id_sesion || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchMaterialesCita();
        fetchLotesMaterial(selectedMaterialId);
        setCantidadMaterial("");
        setSelectedLoteId("");
        setSelectedServicioIdForMaterial("");
        setSelectedDienteCodigo("");
        setMaterialObservacion("");
      } else {
        setMaterialsError(data.message || "Error al registrar material");
      }
    } catch (err) {
      setMaterialsError("Error de conexión al registrar material");
    } finally {
      setAddingMaterial(false);
    }
  };

  const handleDeleteMaterial = (idMovimiento) => {
    setMaterialsError("");
    setShowConfirmDeleteMaterial(idMovimiento);
  };

  const confirmDeleteMaterial = async () => {
    if (!showConfirmDeleteMaterial) return;
    const idMovimiento = showConfirmDeleteMaterial;
    setShowConfirmDeleteMaterial(null);
    setMaterialsError("");
    try {
      const payload = {
        id_usuario: user?.id_usuario || null,
        id_sesion: user?.id_sesion || null,
      };
      const res = await fetch(`${API_URL}/citas/materiales/${idMovimiento}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        fetchMaterialesCita();
        if (selectedMaterialId) {
          fetchLotesMaterial(selectedMaterialId);
        }
      } else {
        setMaterialsError(data.message || "Error al eliminar consumo de material");
      }
    } catch (err) {
      setMaterialsError("Error de conexión al eliminar material");
    }
  };

  useEffect(() => {
    if (idCita) {
      fetchCita();
      fetchServiciosCita();
      fetchCatalogoServicios();
      fetchMaterialesCita();
      fetchCatalogoMateriales();
      fetchCatalogoDientes();
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
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Columna Izquierda: Información General */}
            <div className="lg:col-span-7 space-y-6">
              {isEditing ? (
                <EditarCitaForm
                  formData={formData}
                  setFormData={setFormData}
                  pacientesResult={pacientesResult}
                  dataMaster={dataMaster}
                  loadingSlots={loadingSlots}
                  slotsDisponibles={slotsDisponibles}
                  saving={saving}
                  saveError={saveError}
                  handleSave={handleSave}
                  setIsEditing={setIsEditing}
                />
              ) : (
                <MostrarCitaCard
                  cita={cita}
                  saveError={saveError}
                  saving={saving}
                  handleStatusUpdate={handleStatusUpdate}
                  handleReprogramar={handleReprogramar}
                  setIsEditing={setIsEditing}
                  onClose={onClose}
                />
              )}
            </div>
            {/* Columna Derecha: Servicios / Materiales Realizados */}
            <div className="lg:col-span-5">
              <div className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-sm space-y-6">
                
                {/* Tabs */}
                <div className="flex border-b border-gray-100 mb-6">
                  <button
                    type="button"
                    onClick={() => setActiveTabDerecha("servicios")}
                    className={`flex-1 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                      activeTabDerecha === "servicios"
                        ? "border-[#148F77] text-[#148F77]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Servicios
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTabDerecha("materiales")}
                    className={`flex-1 pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all cursor-pointer ${
                      activeTabDerecha === "materiales"
                        ? "border-[#148F77] text-[#148F77]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    Materiales
                  </button>
                </div>

                {/* TAB SERVICIOS */}
                {activeTabDerecha === "servicios" && (
                  <TabServiciosCita
                    isCitaTerminada={isCitaTerminada}
                    servicesError={servicesError}
                    loadingServicios={loadingServicios}
                    serviciosCita={serviciosCita}
                    catalogoServicios={catalogoServicios}
                    selectedServicioId={selectedServicioId}
                    setSelectedServicioId={setSelectedServicioId}
                    customPrecio={customPrecio}
                    setCustomPrecio={setCustomPrecio}
                    addingServicio={addingServicio}
                    handleAddServicio={handleAddServicio}
                    handleDeleteServicio={handleDeleteServicio}
                  />
                )}

                {/* TAB MATERIALES */}
                {activeTabDerecha === "materiales" && (
                  <TabMaterialesCita
                    isCitaTerminada={isCitaTerminada}
                    materialsError={materialsError}
                    loadingMateriales={loadingMateriales}
                    materialesCita={materialesCita}
                    catalogoMateriales={catalogoMateriales}
                    lotesMaterial={lotesMaterial}
                    selectedMaterialId={selectedMaterialId}
                    setSelectedMaterialId={setSelectedMaterialId}
                    selectedLoteId={selectedLoteId}
                    setSelectedLoteId={setSelectedLoteId}
                    cantidadMaterial={cantidadMaterial}
                    setCantidadMaterial={setCantidadMaterial}
                    selectedServicioIdForMaterial={selectedServicioIdForMaterial}
                    setSelectedServicioIdForMaterial={setSelectedServicioIdForMaterial}
                    selectedDienteCodigo={selectedDienteCodigo}
                    setSelectedDienteCodigo={setSelectedDienteCodigo}
                    materialObservacion={materialObservacion}
                    setMaterialObservacion={setMaterialObservacion}
                    serviciosCita={serviciosCita}
                    catalogoDientes={catalogoDientes}
                    addingMaterial={addingMaterial}
                    handleAddMaterial={handleAddMaterial}
                    handleDeleteMaterial={handleDeleteMaterial}
                    fetchLotesMaterial={fetchLotesMaterial}
                  />
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
      {showConfirmDeleteMaterial && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[130] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100">
            <h4 className="text-lg font-black text-[#2A5C4D] text-center mb-4 italic">
              ¿Eliminar Material?
            </h4>
            <p className="text-gray-600 text-xs font-semibold text-center mb-6">
              ¿Está seguro de remover este material de la cita? El stock será devuelto al almacén y el saldo se recalculará.
            </p>
            <div className="flex gap-4">
              <button
                onClick={confirmDeleteMaterial}
                className="flex-1 py-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer hover:shadow-lg active:scale-95"
              >
                Sí, Eliminar
              </button>
              <button
                onClick={() => setShowConfirmDeleteMaterial(null)}
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

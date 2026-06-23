import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useAuthStore } from "../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function RegistrarEntradas() {
  const user = useAuthStore((state) => state.user);

  // Estados de carga de datos maestros (Panel Inspector Izquierdo)
  const [materiales, setMateriales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [lotesHistoricos, setLotesHistoricos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Estados de control para el Acordeón del Buscador Izquierdo
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Estados de notificaciones en pantalla
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estados del Modal Express para Proveedores
  const [showProvModal, setShowProvModal] = useState(false);
  const [nuevoProvNombre, setNuevoProvNombre] = useState("");
  const [nuevoProvTelefono, setNuevoProvTelefono] = useState(""); 
  const [provSubmitting, setProvSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const formPanelRef = useRef(null);
  const cantidadInputRef = useRef(null);

  // Estado unificado del Formulario Transaccional (Ficha Derecha context-locked)
  const [form, setForm] = useState({
    id_material: "",
    cantidad: "",
    fecha_fabricacion: "",
    fecha_caducidad: "",
    id_proveedor: "",
  });

  const [isMaterialExpirable, setIsMaterialExpirable] = useState(false);
  const [selectedMaterialNombre, setSelectedMaterialNombre] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const filteredMateriales = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return materiales;
    return materiales.filter((m) =>
      String(m.id_material).toLowerCase().includes(q) || (m.nombre_material || "").toLowerCase().includes(q)
    );
  }, [materiales, searchTerm]);

  const displayMateriales = useMemo(() => {
    if (!selectedMaterialId) return filteredMateriales;
    const idx = filteredMateriales.findIndex((m) => m.id_material === selectedMaterialId);
    if (idx === -1) return filteredMateriales;
    const sel = filteredMateriales[idx];
    const rest = filteredMateriales.filter((m) => m.id_material !== selectedMaterialId);
    return [sel, ...rest];
  }, [filteredMateriales, selectedMaterialId]);

  // Configuración de cabeceras seguras estándar del proyecto
  const getFetchConfig = (method = "GET", body = null) => {
    const config = {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    };
    if (body) config.body = JSON.stringify(body);
    return config;
  };

  // ==========================================
  // 1. CARGA INICIAL DE CATÁLOGOS MASTER
  // ==========================================
  const cargarCatalogosMaster = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const [resMat, resProv] = await Promise.all([
        fetch(`${API_URL}/materiales`, getFetchConfig("GET")),
        fetch(`${API_URL}/proveedores`, getFetchConfig("GET")),
      ]);

      const dataMat = await resMat.json();
      const dataProv = await resProv.json();

      if (dataMat.success) setMateriales(dataMat.data);
      if (dataProv.success) setProveedores(dataProv.data);

      if (!dataMat.success || !dataProv.success) {
        setErrorMsg("Error al cargar datos.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al conectar con el servidor!");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogosMaster();
  }, []);


  // 2. DETECTOR: SELECCIÓN DE MATERIAL EN TABLA
  const handleInspectMaterial = async (material) => {
    if (selectedMaterialId === material.id_material) {
      setSelectedMaterialId(null);
      setLotesHistoricos([]);
      setIsMaterialExpirable(false);
      setSelectedMaterialNombre("");
      setForm({ id_material: "", cantidad: "", fecha_fabricacion: "", fecha_caducidad: "", id_proveedor: "" });
      return;
    }

    try {
      setSelectedMaterialId(material.id_material);
      setSelectedMaterialNombre(material.nombre_material);
      setIsMaterialExpirable(!!material.expirable);
      setLoadingLotes(true);
      setLotesHistoricos([]);
      setErrorMsg("");

      // Inicializamos los campos base del formulario contextual derecho
      setForm({
        id_material: material.id_material,
        cantidad: "",
        fecha_fabricacion: "",
        fecha_caducidad: "",
        id_proveedor: "",
      });

      // Consultamos la función f_obtener_lotes_material del motor
      const res = await fetch(`${API_URL}/inventario/lotes/${material.id_material}?todo=true`, getFetchConfig("GET"));
      const result = await res.json();

      if (result.success) {
        setLotesHistoricos(result.data);
      } else {
        setErrorMsg(result.message || "No se pudieron cargar los lotes para este material.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al conectar con el servidor");
    } finally {
      setLoadingLotes(false);
    }
  };

  useEffect(() => {
    if (!selectedMaterialId || !formPanelRef.current) return;

    const scrollToShowBoth = () => {
      const row = document.querySelector(`[data-material-id="${selectedMaterialId}"]`);
      const rightEl = formPanelRef.current;
      if (!row || !rightEl) return;

      const pageOffset = window.pageYOffset || document.documentElement.scrollTop;

      // include expanded details row (next sibling) when present
      const elems = [row];
      const next = row.nextElementSibling;
      if (next && next.querySelector && next.querySelector('div')) elems.push(next);

      const rects = elems.map((el) => el.getBoundingClientRect());

      const leftTop = Math.min(...rects.map((r) => r.top + pageOffset));
      const leftBottom = Math.max(...rects.map((r) => r.top + pageOffset + r.height));

      const rightRect = rightEl.getBoundingClientRect();
      const rightTop = rightRect.top + pageOffset;
      const rightBottom = rightTop + rightRect.height;

      const topMost = Math.min(leftTop, rightTop);
      const bottomMost = Math.max(leftBottom, rightBottom);
      const viewportH = window.innerHeight;
      const padding = 60;

      // center the combined area in the viewport when possible
      let targetTop = Math.max(0, Math.floor((topMost + bottomMost - viewportH) / 2));
      // if centering would put top above topMost, clamp to topMost - padding
      if (targetTop > topMost - padding) targetTop = Math.max(0, topMost - padding);

      window.scrollTo({ top: targetTop, behavior: 'smooth' });

      setTimeout(() => cantidadInputRef.current?.focus(), 350);
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToShowBoth));
  }, [selectedMaterialId, lotesHistoricos]);

  // 3. ACCIÓN EXPRESS: GUARDAR NUEVO PROVEEDOR
  const handleGuardarProveedorExpress = async (e) => {
    e.preventDefault();
    if (!nuevoProvNombre.trim()) return;

    try {
      setProvSubmitting(true);
      const payloadProv = {
        nombre_proveedor: nuevoProvNombre.trim(),
        telefono: nuevoProvTelefono.trim() || null 
      };

      const res = await fetch(`${API_URL}/proveedores`, getFetchConfig("POST", payloadProv));
      const result = await res.json();

      if (result.success) {
        const resProv = await fetch(`${API_URL}/proveedores`, getFetchConfig("GET"));
        const dataProv = await resProv.json();
        if (dataProv.success) setProveedores(dataProv.data);

        setNuevoProvNombre("");
        setNuevoProvTelefono("");
        setShowProvModal(false);
        setSuccessMsg("Proveedor añadido con éxito.");
        setTimeout(() => setSuccessMsg(""), 3000);
      } else {
        alert(result.message || "No se pudo registrar al proveedor");
      }
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setProvSubmitting(false);
    }
  };

  // ENVIAR ENTRADA (POST) - CON VALIDACIONES DE FECHAS
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.id_material || !form.cantidad) {
      setErrorMsg("Por favor, complete los campos obligatorios: Material y Cantidad.");
      return;
    }

    if (Number(form.cantidad) <= 0) {
      setErrorMsg("La cantidad de unidades a ingresar debe ser mayor a cero.");
      return;
    }

    if (isMaterialExpirable) {
      if (!form.fecha_fabricacion || !form.fecha_caducidad) {
        setErrorMsg("Para materiales expirables, las fechas de fabricación y caducidad son obligatorias.");
        return;
      }
      
      // VALIDACIÓN: fecha de fabricación no puede ser mayor a fecha de vencimiento
      if (form.fecha_fabricacion > form.fecha_caducidad) {
        setErrorMsg("La fecha de fabricación no puede ser posterior a la fecha de vencimiento.");
        return;
      }
      
      // VALIDACIÓN: fecha de fabricación no puede ser futura
      const hoy = new Date().toISOString().split('T')[0];
      if (form.fecha_fabricacion > hoy) {
        setErrorMsg("La fecha de fabricación no puede ser una fecha futura.");
        return;
      }
      
      // VALIDACIÓN: fecha de vencimiento no puede ser pasada (opcional, según regla de negocio)
      if (form.fecha_caducidad < hoy) {
        setErrorMsg("La fecha de vencimiento no puede ser una fecha pasada.");
        return;
      }
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setSubmitting(true);
      const payload = {
        id_material: Number(form.id_material),
        cantidad: Number(form.cantidad),
        fecha_fabricacion: isMaterialExpirable && form.fecha_fabricacion ? form.fecha_fabricacion : null,
        fecha_caducidad: isMaterialExpirable && form.fecha_caducidad ? form.fecha_caducidad : null,
        id_proveedor: form.id_proveedor ? Number(form.id_proveedor) : null,
        nombre_material: selectedMaterialNombre
      };

      const res = await fetch(`${API_URL}/inventario/entrada`, getFetchConfig("POST", payload));
      const result = await res.json();

      if (result.success) {
        setSuccessMsg(result.message || "Entrada registrada exitosamente.");
        
        // Limpieza total y cierre
        setForm({ id_material: "", cantidad: "", fecha_fabricacion: "", fecha_caducidad: "", id_proveedor: "" });
        setIsMaterialExpirable(false);
        setSelectedMaterialId(null);
        setSelectedMaterialNombre("");
        setLotesHistoricos([]);
        cargarCatalogosMaster();

        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(result.message || "No se pudo procesar la entrada. Verifique los datos e intente nuevamente.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de comunicación con el Servidor.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center text-[#148F77] font-black text-xs uppercase tracking-widest animate-pulse">
        Cargando Datos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-[#2A5C4D] font-black text-lg uppercase tracking-wide">
          Registrar Entradas al Almacén
        </h2>
        <p className="text-gray-400 text-xs mt-1">
          En esta sección, puede registrar la entrada de insumos clínicos al almacén. Seleccione el material que desea ingresar desde el panel izquierdo, complete los detalles en la ficha de ingreso y confirme para actualizar el inventario.
        </p>
      </div>

      {/* ALERTAS REACTIVAS */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#148F77] text-xs font-bold px-5 py-4 rounded-xl shadow-sm animate-fadeIn">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-5 py-4 rounded-xl shadow-sm animate-fadeIn">
          ⚠ {errorMsg}
        </div>
      )}

      {/* ARQUITECTURA DE TRABAJO DISTRIBUIDA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================
            PANEL IZQUIERDO (7 COLUMNAS): EXPLORADOR HISTÓRICO DE STOCK
            ========================================================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/60 border-b border-gray-100">
            <h3 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest">
              Insumos Disponibles en Almacén:
            </h3>
          </div>

          <div className="p-3 border-b border-gray-100 bg-white">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por id o nombre..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-[#148F77]"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/40 border-b border-gray-100 text-[9px] font-black uppercase tracking-widest text-gray-400">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Descripción de Insumo</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayMateriales.map((m) => (
                  <Fragment key={m.id_material}>
                    <tr data-material-id={m.id_material} className={`hover:bg-gray-50/40 transition-colors ${selectedMaterialId === m.id_material ? "bg-emerald-50/10" : ""}`}>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase tracking-wide"> {m.id_material}</td>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase tracking-wide">
                        {m.nombre_material}
                        <span className={`inline-block ml-2 px-2 py-0.5 rounded text-[8px] font-black uppercase ${m.expirable ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                          {m.expirable ? "Expirable" : "Permanente"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectMaterial(m)}
                          className={`font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                            selectedMaterialId === m.id_material
                              ? "bg-[#2A5C4D] text-white border-[#2A5C4D]"
                              : "text-[#148F77] bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
                          }`}
                        >
                          {selectedMaterialId === m.id_material ? "✕ Cancelar" : "Registrar Entrada"}
                        </button>
                      </td>
                    </tr>

                    {/* DESGLOSE ANALÍTICO DE TRAZABILIDAD DE LOTES PREVIOS */}
                    {selectedMaterialId === m.id_material && (
                      <tr>
                        <td colSpan="3" className="bg-gray-50/40 px-4 py-3 border-y border-gray-100">
                          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 animate-fadeIn shadow-inner">
                            <div className="text-gray-400 font-bold text-[9px] uppercase tracking-wide border-b border-gray-50 pb-1">
                              Historial de Lotes para: <span className="text-[#2A5C4D]">{m.nombre_material}</span>
                            </div>
                            
                            {loadingLotes ? (
                              <div className="text-center py-4 text-[#148F77] font-bold text-[10px] uppercase tracking-widest animate-pulse">
                                Cargando Lotes...
                              </div>
                            ) : lotesHistoricos.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 font-medium text-[10px]">
                                No se han registrado entradas previas para este material.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {lotesHistoricos.map((l) => (
                                  <div key={l.id_lote} className="p-2.5 bg-gray-50/50 border border-gray-100 rounded-xl flex justify-between items-center text-[10px] font-semibold">
                                    <div className="space-y-0.5">
                                      <div className="text-gray-600 font-bold">LOTE #{l.id_lote}</div>
                                      <div className="text-gray-400 uppercase text-[8px]">PROV: {l.nombre_proveedor}</div>
                                    </div>
                                    <div className="flex gap-4 text-gray-400">
                                      <span>INGRESADOS: <strong className="text-gray-600">{l.cantidad_inicial} u.</strong></span>
                                      <span>EXISTENCIAS: <strong className="text-[#148F77]">{l.cantidad_disponible} u.</strong></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================
            PANEL DERECHO (5 COLUMNAS): FICHA TRANSACCIONAL CONTEXTUAL
            ========================================================= */}
        <div className="lg:col-span-5" ref={formPanelRef}>
          {!form.id_material ? (
            
            /* EMPTY STATE INFORMATIVO */
            <div className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 space-y-3">
              <div className="text-2xl">-</div>
              <h4 className="font-black text-xs uppercase tracking-widest text-[#2A5C4D]">Registrar Entrada de Material</h4>
              <p className="text-[11px] leading-relaxed max-w-xs mx-auto">
                Seleccione un material de la lista y pulse <span className="text-[#148F77] font-bold">"Registrar Entrada"</span> para completar la ficha de ingreso del material seleccionado.
              </p>
            </div>
          ) : (
            
            /* FORMULARIO DE INGRESO CONTEXT-LOCKED */
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-slideUp">
              <div className="p-4 bg-emerald-500/5 border-b border-emerald-100 px-6 flex justify-between items-center">
                <h3 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest">
                  Registro de Entrada para: <span className="text-[#148F77]">{selectedMaterialNombre}</span>
                </h3>
                <span className="bg-[#148F77] text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider animate-pulse">
                  Nuevo Lote
                </span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {/* IDENTIFICACIÓN DEL CONTEXTO */}
                <div className="space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100 text-[11px]">
                  <span className="text-gray-400 uppercase text-[9px] font-bold block">Insumo a Recibir:</span>
                  <span className="text-[#2A5C4D] font-black uppercase text-xs block truncate">{selectedMaterialNombre}</span>
                </div>

                {/* CANTIDAD A REGISTRAR */}
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">
                    Cantidad de Unidades a Ingresar *
                  </label>
                  <input
                    ref={cantidadInputRef}
                    type="number"
                    required
                    min="1"
                    placeholder="Ej. 100"
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] font-semibold"
                  />
                </div>

                {/* FECHAS CRONOLÓGICAS (CONDICIONALES EXCLUSIVAS) */}
                {isMaterialExpirable && (
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-xl space-y-3 animate-slideUp">
                    <div className="space-y-1">
                      <label className="text-amber-800 font-black text-[9px] uppercase tracking-widest">Fecha de Fabricación *</label>
                      <input
                        type="date"
                        required={isMaterialExpirable}
                        value={form.fecha_fabricacion}
                        onChange={(e) => setForm({ ...form, fecha_fabricacion: e.target.value })}
                        className="w-full bg-white border border-amber-200 text-gray-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#148F77]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-amber-800 font-black text-[9px] uppercase tracking-widest">Fecha de Vencimiento *</label>
                      <input
                        type="date"
                        required={isMaterialExpirable}
                        value={form.fecha_caducidad}
                        onChange={(e) => setForm({ ...form, fecha_caducidad: e.target.value })}
                        className="w-full bg-white border border-amber-200 text-gray-800 text-xs px-3 py-2.5 rounded-xl focus:outline-none focus:border-[#148F77]"
                      />
                    </div>
                  </div>
                )}

                {/* SELECT PROVEEDORES + ACCIÓN DIRECTA */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Proveedor Distribuidor (Opcional)</label>
                    <button
                      type="button"
                      onClick={() => setShowProvModal(true)}
                      className="text-[#148F77] bg-emerald-50 hover:bg-emerald-200 font-black text-[8px] uppercase tracking-widest px-5 py-1 rounded border border-emerald-100 transition-all"
                    >
                      + REGISTRAR PROVEEDOR
                    </button>
                  </div>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] font-semibold uppercase"
                  >
                    <option value=""> SIN PROVEEDOR </option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre_proveedor} {p.telefono ? `(${p.telefono})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ACCIONES DE ENVÍO */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMaterialId(null);
                      setLotesHistoricos([]);
                      setIsMaterialExpirable(false);
                      setSelectedMaterialNombre("");
                      setForm({ id_material: "", cantidad: "", fecha_fabricacion: "", fecha_caducidad: "", id_proveedor: "" });
                    }}
                    className="py-3 px-4 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-[#148F77] hover:bg-[#117A65] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-emerald-900/10"
                  >
                    {submitting ? "Registrando..." : "Confirmar Entrada"}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>

      </div>

      {/* ==========================================
          MODAL INTERNO EXPRESS PARA PROVEEDOR
          ========================================== */}
      {showProvModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-5 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h4 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest">Registrar Proveedor:</h4>
              <button
                type="button"
                onClick={() => setShowProvModal(false)}
                className="text-gray-400 hover:text-red-500 font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGuardarProveedorExpress} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Nombre de la Empresa / Distribuidor *</label>
                <input
                  type="text"
                  required
                  maxLength={50}
                  placeholder="Ej. DENTAL BOLIVIA SRL"
                  value={nuevoProvNombre}
                  onChange={(e) => setNuevoProvNombre(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] uppercase font-semibold"
                />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Teléfono de Contacto (Opcional)</label>
                <input
                  type="text"
                  maxLength={20}
                  placeholder="Ej. 77012345"
                  value={nuevoProvTelefono}
                  onChange={(e) => setNuevoProvTelefono(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] font-semibold"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProvModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={provSubmitting || !nuevoProvNombre.trim()}
                  className="flex-1 py-3 bg-[#148F77] text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-[#117A65] transition-all"
                >
                  {provSubmitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
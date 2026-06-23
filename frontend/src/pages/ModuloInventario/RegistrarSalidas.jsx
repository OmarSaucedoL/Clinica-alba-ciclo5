import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useAuthStore } from "../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function RegistrarSalidas() {
  const user = useAuthStore((state) => state.user);

  // Estados de carga de datos maestros (Panel de Inspección Izquierdo)
  const [materiales, setMateriales] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Estado de control para el Acordeón del Buscador Izquierdo
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Estados de notificaciones en pantalla
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estado unificado del Formulario Transaccional (Ficha Derecha context-locked)
  const [form, setForm] = useState({
    id_material: "",
    id_lote: "",
    cantidad: "",
    motivo: "VENCIMIENTO",
  });

  // Metadatos ampliados para el control informativo del lote a retirar
  const [metaSalida, setMetaSalida] = useState({
    nombre_material: "",
    nombre_proveedor: "",
    stock_inicial: null,
    stock_teorico: null,
    fecha_caducidad: null,
  });

  const formPanelRef = useRef(null);
  const cantidadInputRef = useRef(null);
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

  // Configuración de cabeceras seguras estándar de tu proyecto
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
  // 1. CARGA INICIAL DE MATERIALES MASTER
  // ==========================================
  const cargarMaterialesMaster = async () => {
    try {
      setLoadingMateriales(true);
      setErrorMsg("");
      const res = await fetch(`${API_URL}/materiales`, getFetchConfig("GET"));
      const result = await res.json();
      if (result.success) {
        setMateriales(result.data);
      } else {
        setErrorMsg("Error al cargar datos.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setLoadingMateriales(false);
    }
  };

  useEffect(() => {
    cargarMaterialesMaster();
  }, []);

  // ==========================================
  // 2. DETECTOR REACTIVO: SELECCIÓN DE MATERIAL -> CARGAR LOTES HISTÓRICOS
  // ==========================================
  const handleInspectMaterial = async (id_material) => {
    if (selectedMaterialId === id_material) {
      setSelectedMaterialId(null);
      setLotes([]);
      return;
    }

    try {
      setSelectedMaterialId(id_material);
      setLoadingLotes(true);
      setLotes([]);
      setErrorMsg("");
      
      const res = await fetch(`${API_URL}/inventario/lotes/${id_material}?todo=true`, getFetchConfig("GET"));
      const result = await res.json();

      if (result.success) {
        setLotes(result.data);
      } else {
        setErrorMsg(result.message || "Error al cargar los lotes para el material seleccionado.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión con el servidor.");
    } finally {
      setLoadingLotes(false);
    }
  };

  // 3. CAPTURA MECÁNICA DESDE EL MONITOR HACIA LA FICHA DE SALIDA
  const handleLockLoteToForm = (material, lote) => {
    setErrorMsg("");
    setSuccessMsg("");

    setForm({
      id_material: material.id_material,
      id_lote: lote.id_lote,
      cantidad: "",
      motivo: "VENCIMIENTO",
    });

    setMetaSalida({
      nombre_material: material.nombre_material,
      nombre_proveedor: lote.nombre_proveedor,
      stock_inicial: Number(lote.cantidad_inicial),
      stock_teorico: Number(lote.cantidad_disponible),
      fecha_caducidad: lote.fecha_caducidad || "PERMANENTE",
    });
  };

  useEffect(() => {
    if (!selectedMaterialId || !formPanelRef.current) return;

    const scrollToShowBoth = () => {
      const row = document.querySelector(`[data-material-id="${selectedMaterialId}"]`);
      const rightEl = formPanelRef.current;
      if (!row || !rightEl) return;

      const pageOffset = window.pageYOffset || document.documentElement.scrollTop;

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

      let targetTop = Math.max(0, Math.floor((topMost + bottomMost - viewportH) / 2));
      if (targetTop > topMost - padding) targetTop = Math.max(0, topMost - padding);

      window.scrollTo({ top: targetTop, behavior: 'smooth' });

      setTimeout(() => cantidadInputRef.current?.focus(), 350);
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToShowBoth));
  }, [selectedMaterialId, lotes]);

  // 4. ENVÍO DE LA BAJA TRANSACCIONAL (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cantidadRetiro = Number(form.cantidad);

    if (cantidadRetiro <= 0) {
      setErrorMsg("La cantidad a retirar debe ser mayor a cero.");
      return;
    }

    if (cantidadRetiro > metaSalida.stock_teorico) {
      setErrorMsg(
        `Operación abortada: No puede retirar ${cantidadRetiro} unidades. El lote seleccionado solo dispone de ${metaSalida.stock_teorico} unidades.`
      );
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;

    try {
      setSubmitting(true);

      const payload = {
        id_lote: Number(form.id_lote),
        cantidad: cantidadRetiro,
        motivo: form.motivo,
      };

      const res = await fetch(`${API_URL}/inventario/salida`, getFetchConfig("POST", payload));
      const result = await res.json();

      if (result.success) {
        setSuccessMsg(result.message || "Baja registrada cocorrectamente. El inventario ha sido actualizado.");

        // Limpieza y re-sincronización del workspace
        setForm({ id_material: "", id_lote: "", cantidad: "", motivo: "VENCIMIENTO" });
        setMetaSalida({ nombre_material: "", nombre_proveedor: "", stock_inicial: null, stock_teorico: null, fecha_caducidad: null });
        setSelectedMaterialId(null);
        setLotes([]);
        cargarMaterialesMaster();

        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(result.message || "Ocurrió un error al procesar el retiro.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de comunicación con el Servidor.");
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  if (loadingMateriales) {
    return (
      <div className="bg-white p-10 rounded-2xl border border-gray-100 shadow-sm text-center text-[#148F77] font-black text-xs uppercase tracking-widest animate-pulse">
        Cargando datos...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER DE LA COMPONENTE */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-[#2A5C4D] font-black text-lg uppercase tracking-wide">
          Registrar Salidas de Almacén
        </h2>
        <p className="text-gray-400 text-xs mt-1">
          En este apartado puedes gestionar las bajas de inventario por consumo clínico no registrado, vencimientos o ajustes de stock.
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

      {/* WORKSPACE DIVIDIDO EN DOS COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================
            PANEL IZQUIERDO (7 COLUMNAS): MONITOR ANALÍTICO DE TRAZA
            ========================================================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/60 border-b border-gray-100">
            <h3 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest">
              Insumos disponibles en el almacén
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
                  <th className="py-3 px-4">Descripción Insumo</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayMateriales.map((m) => (
                  <Fragment key={m.id_material}>
                    <tr data-material-id={m.id_material} className={`hover:bg-gray-50/40 transition-colors ${selectedMaterialId === m.id_material ? "bg-emerald-50/10" : ""}`}>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase tracking-wide">{m.id_material}</td>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase tracking-wide">
                        {m.nombre_material} {m.expirable ? "-" : "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleInspectMaterial(m.id_material)}
                          className={`font-black text-[9px] uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                            selectedMaterialId === m.id_material
                              ? "bg-[#2A5C4D] text-white border-[#2A5C4D]"
                              : "text-[#148F77] bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50"
                          }`}
                        >
                          {selectedMaterialId === m.id_material ? "✕ Ocultar" : "Consultar Lotes"}
                        </button>
                      </td>
                    </tr>

                    {/* ACORDEÓN DESPLEGABLE DE LOTES CON BALANCES */}
                    {selectedMaterialId === m.id_material && (
                      <tr>
                        <td colSpan="3" className="bg-gray-50/40 px-4 py-3 border-y border-gray-100">
                          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 animate-fadeIn shadow-inner">
                            {loadingLotes ? (
                              <div className="text-center py-4 text-[#148F77] font-bold text-[10px] uppercase tracking-widest animate-pulse">
                                Cargando lotes...
                              </div>
                            ) : lotes.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 font-medium text-[10px]">
                                No se encontraron lotes para este insumo.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                {lotes.map((l) => (
                                  <div 
                                    key={l.id_lote} 
                                    className={`p-2.5 rounded-xl border flex justify-between items-center text-[11px] font-semibold transition-all ${
                                      Number(form.id_lote) === Number(l.id_lote)
                                        ? "bg-red-50/60 border-red-300 shadow-sm"
                                        : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <div className="text-gray-700 font-bold flex items-center gap-1.5">
                                        LOTE #{l.id_lote}
                                        {Number(l.cantidad_disponible) === 0 && (
                                          <span className="bg-red-100 text-red-600 font-black text-[8px] px-1.5 py-0.5 rounded uppercase">AGOTADO</span>
                                        )}
                                      </div>
                                      <div className="text-[9px] text-gray-400 uppercase tracking-wide">
                                        VENCE: <span className="text-gray-600 font-bold">{l.fecha_caducidad || "PERMANENTE"}</span>
                                      </div>
                                    </div>
                                    
                                    {/* SECCIÓN ANALÍTICA DE CONTRASTE AL PASO */}
                                    <div className="flex items-center gap-4">
                                      <div className="flex flex-col text-right text-[10px] space-y-0.5 font-bold">
                                        <span className="text-gray-400">COMPRADO: <strong className="text-gray-500">{l.cantidad_inicial} u.</strong></span>
                                        <span className="text-gray-400">DISPONIBLE: <strong className={Number(l.cantidad_disponible) > 0 ? "text-emerald-600" : "text-red-400"}>{l.cantidad_disponible} u.</strong></span>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={Number(l.cantidad_disponible) === 0}
                                        onClick={() => handleLockLoteToForm(m, l)}
                                        className={`px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all ${
                                          Number(l.cantidad_disponible) === 0
                                            ? "bg-gray-100 text-gray-300 cursor-not-allowed"
                                            : Number(form.id_lote) === Number(l.id_lote)
                                              ? "bg-red-600 text-white shadow-sm"
                                              : "bg-[#148F77] text-white hover:bg-[#117A65]"
                                        }`}
                                      >
                                        {Number(form.id_lote) === Number(l.id_lote) ? "En proceso" : "Retirar"}
                                      </button>
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
          {metaSalida.stock_teorico === null ? (
            
            /* ESTADO VACÍO (EMPTY STATE DE INSTRUCCIÓN) */
            <div className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 space-y-3">
              <div className="text-2xl">-</div>
              <h4 className="font-black text-xs uppercase tracking-widest text-red-700/80">Retiro de insumos/ajustes de stock</h4>
              <p className="text-[11px] leading-relaxed max-w-xs mx-auto">
                Seleccione un lote activo para iniciar el proceso de retiro de inventario. Aquí podrá registrar bajas por consumo clínico, vencimientos o ajustes de stock no registrados.
              </p>
            </div>
          ) : (
            
            /* FORMULARIO DE CONCILIACIÓN DESBLOQUEADO */
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-slideUp">
              <div className="p-4 bg-red-500/5 border-b border-red-100 px-6 flex justify-between items-center">
                <h3 className="text-red-700 font-black text-[10px] uppercase tracking-widest">
                  N° Lote #{form.id_lote} - {metaSalida.nombre_material}
                </h3>
                <span className="bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  RETIRO
                </span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {/* TARJETA INFORMATIVA FIJA CON EL ESTADO COMPLETO DEL LOTE */}
                <div className="space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-100 text-[11px]">
                  <div>
                    <span className="text-gray-400 uppercase text-[9px] font-bold block">Insumo a Retirar:</span>
                    <span className="text-[#2A5C4D] font-black uppercase text-xs">{metaSalida.nombre_material}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200/60 flex justify-between text-gray-400 text-[10px] font-bold">
                    <div className="flex flex-col">
                      <span>PROVEEDOR: <strong className="text-gray-600 uppercase">{metaSalida.nombre_proveedor}</strong></span>
                      <span>CADUCIDAD: <strong className="text-amber-700">{metaSalida.fecha_caducidad}</strong></span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span>COMPRA: <strong className="text-gray-600">{metaSalida.stock_inicial} u.</strong></span>
                      <span>EXISTENCIAS: <strong className="text-emerald-600">{metaSalida.stock_teorico} u.</strong></span>
                    </div>
                  </div>
                </div>

                {/* VISUALIZADOR REVOLUCIONARIO DE PROYECCIÓN POST-DESPACHO */}
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center text-[11px] font-bold">
                  <span className="text-gray-400 uppercase text-[9px] tracking-widest">Existencias proyectadas:</span>
                  {form.cantidad === "" ? (
                    <span className="text-gray-500">{metaSalida.stock_teorico} unidades</span>
                  ) : (metaSalida.stock_teorico - Number(form.cantidad)) < 0 ? (
                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-black">Stock Insuficiente</span>
                  ) : (
                    <span className="text-[#148F77] bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-100 font-black text-xs">
                      {metaSalida.stock_teorico - Number(form.cantidad)} unidades
                    </span>
                  )}
                </div>

                {/* SELECCIÓN DEL MOTIVO */}
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">
                    Motivo o Justificación del Retiro *
                  </label>
                  <select
                    required
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 font-semibold"
                  >
                    <option value="VENCIMIENTO">PRODUCTO EXPIRADO / CADUCADO</option>
                    <option value="DAÑO / ROTURA">MATERIAL DAÑADO / ROTURA</option>
                    <option value="CONSUMO CLÍNICO">DESPACHO NO REGISTRADO</option>
                    <option value="MERMA DE CONTROL">AJUSTE POR CONTROL DE CALIDAD</option>
                  </select>
                </div>

                {/* INPUT DE CANTIDAD A DISMINUIR */}
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">
                    Cantidad de Unidades a Dar de Baja *
                  </label>
                  <input
                    ref={cantidadInputRef}
                    type="number"
                    required
                    min="1"
                    max={metaSalida.stock_teorico}
                    placeholder={`Máximo a retirar de estantes: ${metaSalida.stock_teorico}`}
                    value={form.cantidad}
                    onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-red-500 font-semibold"
                  />
                </div>

                {/* ACCIONES DE LA ORDEN */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ id_material: "", id_lote: "", cantidad: "", motivo: "VENCIMIENTO" });
                      setMetaSalida({ nombre_material: "", nombre_proveedor: "", stock_inicial: null, stock_teorico: null, fecha_caducidad: null });
                    }}
                    className="py-3 px-4 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || form.cantidad === "" || (metaSalida.stock_teorico - Number(form.cantidad)) < 0}
                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-red-900/10 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    {submitting ? "Descontando del Almacén..." : "✕ Confirmar Baja del Lote"}
                  </button>
                </div>

              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
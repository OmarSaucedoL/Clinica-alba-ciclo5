import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import { useAuthStore } from "../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function AjustarInventario() {
  const user = useAuthStore((state) => state.user);

  // Estados de carga de datos maestros (Panel Inspector Izquierdo)
  const [materiales, setMateriales] = useState([]);
  const [lotes, setLotes] = useState([]);
  const [loadingMateriales, setLoadingMateriales] = useState(true);
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  // Estado de control para el Acordeón del Buscador Izquierdo
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);

  // Estados de alertas reactivas en la UI
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estado del Formulario unificado de Auditoría (Ficha Derecha context-locked)
  const [form, setForm] = useState({
    id_material: "",
    id_lote: "",
    nuevo_stock: "",
    motivo: "ERROR DE REGISTRO",
  });

  // Metadatos ampliados para el control del lote actualmente auditado
  const [metaAudit, setMetaAudit] = useState({
    nombre_material: "",
    nombre_proveedor: "",
    stock_inicial: null,  
    stock_teorico: null,  
  });

  const formPanelRef = useRef(null);
  const nuevoStockInputRef = useRef(null);
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

  // Configuración de cabeceras seguras nativas de tu app
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

  // 1. CARGAR CATÁLOGO DE MATERIALES BASE
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


  // 2. DETECTOR: SELECCIÓN DE MATERIAL EN TABLA -> SE DESLIZAN SUS LOTES
  const handleInspectMaterial = async (id_material) => {
    if (selectedMaterialId === id_material) {
      setSelectedMaterialId(null);
      setLotes([]);
      return;
    }

    try {
      setSelectedMaterialId(id_material);
      loadingLotes ? null : setLoadingLotes(true);
      setLotes([]);
      
      // Invocamos el endpoint amarrado a la subconsulta del Kardex histórico
      const res = await fetch(`${API_URL}/inventario/lotes/${id_material}?todo=true`, getFetchConfig("GET"));
      const result = await res.json();

      if (result.success) {
        setLotes(result.data);
      } else {
        setErrorMsg(result.message || " Error al cargar datos.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al cargar datos.");
    } finally {
      setLoadingLotes(false);
    }
  };

  const handleLockLoteToForm = (material, lote) => {
    setErrorMsg("");
    setSuccessMsg("");
  
    setForm({
      id_material: material.id_material,
      id_lote: lote.id_lote,
      nuevo_stock: "",
      motivo: "ERROR DE REGISTRO",
    });

    setMetaAudit({
      nombre_material: material.nombre_material,
      nombre_proveedor: lote.nombre_proveedor,
      stock_inicial: Number(lote.cantidad_inicial),
      stock_teorico: Number(lote.cantidad_disponible), 
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

      setTimeout(() => nuevoStockInputRef.current?.focus(), 350);
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToShowBoth));
  }, [selectedMaterialId, lotes]);

  // 4. CALCULAR VARIACIÓN 
  const deltaVariacion = form.nuevo_stock !== "" && metaAudit.stock_teorico !== null
    ? Number(form.nuevo_stock) - metaAudit.stock_teorico
    : null;

  // 5. ENVIAR TRANSACCIÓN DE CONCILIACIÓN (POST)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.id_lote || form.nuevo_stock === "" || !form.motivo) {
      setErrorMsg("Rellene todos los campos obligatorios para procesar el ajuste.");
      return;
    }

    const nuevoStockValor = Number(form.nuevo_stock);

    if (nuevoStockValor < 0) {
      setErrorMsg("El nuevo stock no puede ser negativo.");
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setSubmitting(true);

      const payload = {
        id_lote: Number(form.id_lote),
        nuevo_stock: nuevoStockValor,
        motivo: form.motivo.trim(),
      };

      const res = await fetch(`${API_URL}/inventario/ajuste`, getFetchConfig("POST", payload));
      const result = await res.json();

      if (result.success) {
        setSuccessMsg(result.message || "Ajuste aplicado exitosamente. El inventario se ha actualizado.");

        // Limpieza de estados y re-sincronización en caliente de las grillas de consulta
        setForm({ id_material: "", id_lote: "", nuevo_stock: "", motivo: "ERROR DE REGISTRO" });
        setMetaAudit({ nombre_material: "", nombre_proveedor: "", stock_inicial: null, stock_teorico: null });
        setSelectedMaterialId(null);
        setLotes([]);
        cargarMaterialesMaster();

        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(result.message || "No se pudo registrar el ajuste. Intente nuevamente.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error de conexión con el servidor. No se pudo procesar el ajuste.");
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
      {/* SECCIÓN TITULAR */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="text-[#2A5C4D] font-black text-lg uppercase tracking-wide">
          Ajuste y Revisión de Inventario
        </h2>
        <p className="text-gray-400 text-xs mt-1">
           Esta sección permite consultar y actualizar las existencias reales de los insumos del almacén.
        </p>
      </div>

      {/* ALERTAS REACTIVAS GENERALES */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-[#148F77] text-xs font-bold px-5 py-4 rounded-xl shadow-sm animate-fadeIn">
          ✓ {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-5 py-4 rounded-xl shadow-sm animate-fadeIn">
          ☡ {errorMsg}
        </div>
      )}

      {/* ARQUITECTURA DISTRIBUIDA EN DOS PANELES TRABAJO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* =========================================================
            PANEL IZQUIERDO (7 COLUMNAS): MONITOR INTERACTIVO DE LOTES
            ========================================================= */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/60 border-b border-gray-100">
            <h3 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest">
              Insumos disponibles en Almacén
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
                    <tr data-material-id={m.id_material} className={`hover:bg-gray-50/50 transition-colors ${selectedMaterialId === m.id_material ? "bg-emerald-50/10" : ""}`}>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D uppercase tracking-wide">{m.id_material}</td>
                      <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase tracking-wide">
                        {m.nombre_material}
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
                          {selectedMaterialId === m.id_material ? "✕ Cerrar" : "Ver Lotes"}
                        </button>
                      </td>
                    </tr>

                    {/* ACORDEÓN INTERNO DE LOTES PARA COMPAÑÍA EN VIVO */}
                    {selectedMaterialId === m.id_material && (
                      <tr>
                        <td colSpan="3" className="bg-gray-50/40 px-4 py-3 border-y border-gray-100">
                          <div className="bg-white rounded-xl border border-gray-100 p-3 space-y-2 animate-fadeIn shadow-inner">
                            {loadingLotes ? (
                              <div className="text-center py-4 text-[#148F77] font-bold text-[10px] uppercase tracking-widest animate-pulse">
                                Cargando lotes para {m.nombre_material}...
                              </div>
                            ) : lotes.length === 0 ? (
                              <div className="text-center py-4 text-gray-400 font-medium text-[10px]">
                                No se encontraron lotes disponibles para este insumo.
                              </div>
                            ) : (
                              <div className="space-y-1.5">
                                                {lotes.map((l) => (
                                                  <div 
                                                    key={l.id_lote} 
                                                    className={`p-2.5 rounded-xl border flex justify-between items-center text-[11px] font-semibold transition-all ${
                                                      Number(form.id_lote) === Number(l.id_lote)
                                                        ? "bg-amber-50/60 border-amber-300 shadow-sm"
                                                        : "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                                                    }`}
                                                  >
                                    <div className="space-y-0.5">
                                      <div className="text-gray-700 font-bold">LOTE #{l.id_lote}</div>
                                      <div className="text-[10px] text-gray-400 uppercase">
                                        PROV: <span className="text-gray-600 font-bold">{l.nombre_proveedor}</span>
                                      </div>
                                    </div>
                                    
                                    {/* FIJADO AQUÍ: Despliegue de los dos estados de stock en la sub-tabla */}
                                    <div className="flex items-center gap-3">
                                      <div className="flex flex-col text-right text-[10px] space-y-0.5 font-bold">
                                        <span className="text-gray-400">COMPRA: <strong className="text-gray-500">{l.cantidad_inicial} u.</strong></span>
                                        <span className="text-gray-400">EXISTENCIAS: <strong className="text-[#148F77]">{l.cantidad_disponible} u.</strong></span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => handleLockLoteToForm(m, l)}
                                        className={`px-3 py-1.5 font-black text-[9px] uppercase tracking-widest rounded-lg transition-all ${
                                          Number(form.id_lote) === Number(l.id_lote)
                                            ? "bg-amber-500 text-white"
                                            : "bg-[#148F77] text-white hover:bg-[#117A65]"
                                        }`}
                                      >
                                        {Number(form.id_lote) === Number(l.id_lote) ? "En Proceso" : "Ajustar Inventario"}
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
          {metaAudit.stock_teorico === null ? (
            
            /* ESTADO VACÍO (EMPTY STATE INTUITIVO) */
            <div className="bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 p-8 text-center text-gray-400 space-y-3">
              <div className="text-2xl">-</div>
              <h4 className="font-black text-xs uppercase tracking-widest text-[#2A5C4D]">AJUSTES DE INVENTARIO</h4>
              <p className="text-[11px] leading-relaxed max-w-xs mx-auto">
                Seleccione un insumo y lote para iniciar el proceso de ajuste de inventario. 
              </p>
            </div>
          ) : (
            
            /* FORMULARIO DE CONCILIACIÓN DESBLOQUEADO */
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden animate-slideUp">
              <div className="p-4 bg-amber-500/5 border-b border-amber-100 px-6 flex justify-between items-center">
                <h3 className="text-amber-700 font-black text-[10px] uppercase tracking-widest">
                  Ajustes para el LOTE #{form.id_lote} del insumo "{metaAudit.nombre_material}"
                </h3>
                <span className="bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                  En Proceso
                </span>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                
                {/* METADATOS FIJOS DEL CONTEXTO (CON COMPARATIVA DE BALANCES) */}
                <div className="space-y-1 bg-gray-50 p-4 rounded-xl border border-gray-100 text-[11px]">
                  <div>
                    <span className="text-gray-400 uppercase text-[9px] font-bold block">Insumo Seleccionado:</span>
                    <span className="text-[#2A5C4D] font-black uppercase text-xs">{metaAudit.nombre_material}</span>
                  </div>
                  <div className="pt-2 flex justify-between text-gray-400 text-[10px] font-bold">
                    <span>PROVEEDOR: <strong className="text-gray-600 uppercase">{metaAudit.nombre_proveedor}</strong></span>
                    <span>COMPRA INICIAL: <strong className="text-gray-600">{metaAudit.stock_inicial} u.</strong></span>
                    <span>EXISTENCIAS: <strong className="text-[#148F77]">{metaAudit.stock_teorico} u.</strong></span>
                  </div>
                </div>

                {/* VISUALIZADOR DEL DELTA EN TIEMPO REAL */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <span className="text-gray-400 font-black text-[9px] uppercase tracking-widest">Ajuste esperado de existencias: </span>
                  {deltaVariacion === null ? (
                    <span className="text-gray-400 text-xs font-bold">NA...</span>
                  ) : deltaVariacion === 0 ? (
                    <span className="text-gray-500 bg-gray-200 font-black text-[10px] px-3 py-1 rounded-full">0 (Sin Cambios)</span>
                  ) : deltaVariacion > 0 ? (
                    <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 font-black text-[10px] px-3 py-1 rounded-full">
                      +{deltaVariacion} u. (Sobrante)
                    </span>
                  ) : (
                    <span className="text-red-600 bg-red-50 border border-red-100 font-black text-[10px] px-3 py-1 rounded-full">
                      {deltaVariacion} u. (Faltante)
                    </span>
                  )}
                </div>

                {/* SELECCIÓN DEL MOTIVO */}
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">
                    Razón o Justificación Técnica *
                  </label>
                  <select
                    required
                    value={form.motivo}
                    onChange={(e) => setForm({ ...form, motivo: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] font-semibold"
                  >
                    <option value="ERROR DE REGISTRO">ERROR DE REGISTRO / TRANSACCIÓN</option>
                    <option value="PÉRDIDA / ROBO">EXISTENCIA FALTANTE POR PÉRDIDA / ROBO</option>
                    <option value="DAÑO / ROTURA">EXISTENCIA DAÑADA / ROTA</option>
                    <option value="INVENTARIO ANUAL">BALANCE MAL REALIZADO</option>
                  </select>
                </div>

                {/* NUEVO STOCK REAL CONSTATADO */}
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest">
                    Existencias de Stock a Ajustar *
                  </label>
                    <input
                      ref={nuevoStockInputRef}
                      type="number"
                      required
                      min="1"
                      max={metaAudit.stock_teorico}
                      placeholder={`Máximo a retener: ${metaAudit.stock_teorico}`}
                      value={form.nuevo_stock}
                      onChange={(e) => setForm({ ...form, nuevo_stock: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-xs px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] font-semibold"
                    />
                </div>

                {/* ACCIONES DE LA FICHA */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setForm({ id_material: "", id_lote: "", nuevo_stock: "", motivo: "ERROR DE REGISTRO" });
                      setMetaAudit({ nombre_material: "", nombre_proveedor: "", stock_inicial: null, stock_teorico: null });
                    }}
                    className="py-3 px-4 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md shadow-amber-900/10"
                  >
                    {submitting ? "Procesando Ajuste..." : "Aplicar Ajuste"}
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
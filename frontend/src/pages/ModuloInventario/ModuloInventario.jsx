import { useState, useEffect, Fragment } from "react"; 
import { useAuthStore } from "../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloInventario() {
  const user = useAuthStore((state) => state.user);

  // Estados del catálogo maestro
  const [materiales, setMateriales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Estados para vista Maestro-Detalle (Acordeón de Lotes)
  const [expandedMaterialId, setExpandedMaterialId] = useState(null);
  const [lotes, setLotes] = useState([]);
  const [loadingLotes, setLoadingLotes] = useState(false);

  // Estados del Modal (Crear / Editar)
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  
  // Estado del Modal de Confirmación para Eliminar
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState(null);
  
  // Estado del Formulario
  const [form, setForm] = useState({ nombre_material: "", precio: "", expirable: false, precio_venta:"" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para alertas de inventario
  const [alertasStock, setAlertasStock] = useState([]);
  const [alertasVencimiento, setAlertasVencimiento] = useState([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false);

  // Función para ocultar mensajes automáticamente
  const autoHideMessages = () => {
    setTimeout(() => {
      setSuccessMsg("");
      setErrorMsg("");
    }, 4000);
  };

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

  const cargarCatalogosMaster = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const [resMat, resAlerts] = await Promise.all([
        fetch(`${API_URL}/materiales`, getFetchConfig("GET")),
        fetch(`${API_URL}/inventario/alertas`, getFetchConfig("GET"))
      ]);
      const dataMat = await resMat.json();
      const dataAlerts = await resAlerts.json();

      if (dataMat.success && Array.isArray(dataMat.data)) setMateriales(dataMat.data);
      if (dataAlerts.success) {
        setAlertasStock(dataAlerts.stock_bajo || []);
        setAlertasVencimiento(dataAlerts.por_vencer || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("No se pudo conectar con el servidor!");
      autoHideMessages();
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    cargarCatalogosMaster();
  }, []);

  const handleToggleLotes = async (id_material) => {
    if (expandedMaterialId === id_material) {
      setExpandedMaterialId(null);
      setLotes([]);
      return;
    }
    try {
      setExpandedMaterialId(id_material);
      setLoadingLotes(true);
      setLotes([]); 
      setErrorMsg("");
      const res = await fetch(`${API_URL}/inventario/lotes/${id_material}?todo=true`, getFetchConfig("GET"));
      const result = await res.json();
      if (result.success && Array.isArray(result.data)) {
        setLotes(result.data);
      } else {
        setLotes([]);
      }
    } catch (err) { 
      console.error(err);
      setErrorMsg("Error al cargar los lotes del material");
      autoHideMessages();
    } finally { 
      setLoadingLotes(false); 
    }
  };

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setForm({ nombre_material: "", precio: "", expirable: false, precio_venta:"" });
    setShowModal(true);
  };

  const handleOpenEdit = (material) => {
    setEditingMaterial(material);
    setForm({ nombre_material: material.nombre_material, precio: material.precio, expirable: material.expirable, precio_venta: material.precio_venta });
    setShowModal(true);
  };

  const handleDeleteClick = (material) => {
    setMaterialToDelete(material);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!materialToDelete) return;
    
    try {
      const res = await fetch(`${API_URL}/materiales/${materialToDelete.id_material}`, getFetchConfig("DELETE"));
      const result = await res.json();
      
      if (res.ok && result.success) {
        setSuccessMsg(`Material "${materialToDelete.nombre_material}" eliminado correctamente`);
        await cargarCatalogosMaster();
        if (expandedMaterialId === materialToDelete.id_material) {
          setExpandedMaterialId(null);
          setLotes([]);
        }
      } else {
        setErrorMsg(result.message || "Error al eliminar el material");
      }
      autoHideMessages();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al eliminar el material");
      autoHideMessages();
    } finally {
      setShowDeleteConfirm(false);
      setMaterialToDelete(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!form.nombre_material || !form.precio) {
      setErrorMsg("Por favor complete todos los campos");
      autoHideMessages();
      return;
    }
    setIsSubmitting(true);
    const payload = { ...form, precio: Number(form.precio), precio_venta: Number(form.precio_venta) };
    try {
      const res = editingMaterial
        ? await fetch(`${API_URL}/materiales/${editingMaterial.id_material}`, getFetchConfig("PUT", payload))
        : await fetch(`${API_URL}/materiales`, getFetchConfig("POST", payload));
      const result = await res.json();
      if (result.success) { 
        await cargarCatalogosMaster(); 
        setShowModal(false);
        setSuccessMsg(editingMaterial ? "Material actualizado correctamente" : "Material registrado correctamente");
        autoHideMessages();
      } else {
        setErrorMsg(result.message || "Error al guardar el material");
        autoHideMessages();
      }
    } catch (err) { 
      console.error(err);
      setErrorMsg("Error al guardar el material");
      autoHideMessages();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMateriales = Array.isArray(materiales) ? materiales.filter((m) =>
    m.nombre_material?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const totalStockAcordeon = Array.isArray(lotes) ? lotes.reduce((acc, curr) => acc + Number(curr.cantidad_disponible || 0), 0) : 0;

  return (
    <div className="space-y-6">
      {/* CABECERA - Se oculta completamente en impresión */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:hidden">
        <div>
          <h2 className="text-[#2A5C4D] font-black text-lg uppercase tracking-wide">INVENTARIO</h2>
          <p className="text-gray-400 text-xs mt-1">Gestiona el inventario de materiales y suministros de la clínica, controla existencias y monitorea lotes</p>
        </div>
      </div>

      {/* ALERTA DE STOCK Y VENCIMIENTOS - Premium Glassmorphism */}
      {(alertasStock.length > 0 || alertasVencimiento.length > 0) && (
        <div className="bg-gradient-to-r from-red-50 to-rose-50/50 border border-red-200/60 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-600 text-lg font-black animate-pulse">
              !
            </div>
            <div>
              <h4 className="text-red-900 font-black text-xs uppercase tracking-wide">Atención: Diagnóstico de Inventario</h4>
              <p className="text-red-700 text-[11px] mt-0.5 font-medium">
                Se detectaron {alertasStock.length} insumos con stock bajo y {alertasVencimiento.length} lotes próximos a vencer o caducados.
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowAlertsModal(true)} 
            className="self-start sm:self-center px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-wider rounded-xl shadow-sm transition-all cursor-pointer border-none outline-none"
          >
            Ver Detalles de Alertas
          </button>
        </div>
      )}

      {/* NOTIFICACIONES - Se ocultan en impresión */}
      {(successMsg || errorMsg) && (
        <div className="print:hidden animate-fadeIn">
          {successMsg && (
            <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 text-sm font-medium px-4 py-3 rounded-r-xl shadow-sm flex items-center gap-2">
              <span className="text-lg">✓</span> {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-medium px-4 py-3 rounded-r-xl shadow-sm flex items-center gap-2">
              <span className="text-lg font-black">!</span> {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* TAB CATALOGO - Se oculta completamente en impresión */}
      <div className="space-y-6 animate-fadeIn print:hidden">
          <div className="flex justify-between items-center gap-4">
            <input type="text" placeholder="Buscar material por nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-96 bg-white border border-gray-200 text-gray-700 text-xs px-5 py-3.5 rounded-2xl focus:outline-none focus:border-[#148F77] transition-all shadow-sm" />
            <button onClick={handleOpenAdd} className="bg-[#148F77] text-white font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-[#117A65] transition-all shadow-md flex items-center gap-2">
              <span className="text-base">+</span> Registrar Insumo
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/70 border-b border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <th className="py-4 px-6">LOTE</th><th className="py-4 px-6">Descripción del Material</th><th className="py-4 px-6">Precio de compra</th>
                    <th className="py-4 px-6 text-center">Insumo Expirable</th><th className="py-4 px-6">Precio de Venta</th><th className="py-4 px-6 text-right">Operaciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 text-xs">
                  {filteredMateriales.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-8 text-gray-400">
                        No se encontraron materiales
                      </td>
                    </tr>
                  ) : (
                    filteredMateriales.map((m) => (
                      <Fragment key={m.id_material}>
                        <tr className={`hover:bg-gray-50/40 transition-colors text-gray-700 font-medium ${expandedMaterialId === m.id_material ? "bg-emerald-50/10" : ""}`}>
                          <td className="py-4 px-6 text-gray-400 font-bold">#{m.id_material}</td>
                          <td className="py-4 px-6 font-bold text-[#2A5C4D] uppercase">{m.nombre_material}</td>
                          <td className="py-4 px-6 font-semibold text-gray-600">Bs. {m.precio.toFixed(2)}</td>
                          <td className="py-4 px-6 text-center"><span className={`inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${m.expirable ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{m.expirable ? "SI" : "NO"}</span></td>
                          <td className="py-4 px-6 font-semibold text-gray-600">Bs. {m.precio_venta.toFixed(2)}</td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <button onClick={() => handleToggleLotes(m.id_material)} className={`font-bold px-3 py-1.5 rounded-xl border transition-all text-[11px] ${expandedMaterialId === m.id_material ? "bg-[#148F77] text-white border-[#148F77]" : "text-[#148F77] hover:bg-emerald-50 border-emerald-100"}`}>{expandedMaterialId === m.id_material ? "✕ OCULTAR" : "VER STOCK"}</button>
                            <button onClick={() => handleOpenEdit(m)} className="text-gray-500 hover:bg-gray-100 font-bold px-3 py-1.5 rounded-xl border border-gray-100 text-[11px]">Editar</button>
                            <button onClick={() => handleDeleteClick(m)} className="text-red-400 hover:bg-red-50 font-bold px-3 py-1.5 rounded-xl border border-red-50 text-[11px]">Eliminar</button>
                          </td>
                        </tr>
                        {expandedMaterialId === m.id_material && (
                          <tr>
                            <td colSpan="6" className="bg-gray-50/60 px-8 py-5 border-y border-gray-100">
                              <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-inner space-y-4 animate-fadeIn">
                                <h4 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest border-b border-gray-50 pb-2">Detalle de Lotes y Existencias</h4>
                                <div className="overflow-hidden rounded-xl border border-gray-50">
                                  <table className="w-full text-left text-[11px]">
                                    <thead>
                                      <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-100">
                                        <th className="py-2.5 px-4">Código Lote</th><th className="py-2.5 px-4">Cantidad Inicial</th><th className="py-2.5 px-4">Cantidad Disponible</th><th className="py-2.5 px-4">F. Fabricación</th><th className="py-2.5 px-4">F. Vencimiento</th><th className="py-2.5 px-4">Proveedor</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50 font-medium text-gray-600">
                                      {loadingLotes ? (
                                        <tr><td colSpan="6" className="text-center py-4 text-gray-400">Cargando lotes...</td></tr>
                                      ) : lotes.length === 0 ? (
                                        <tr><td colSpan="6" className="text-center py-4 text-gray-400">No hay lotes registrados</td></tr>
                                      ) : (
                                        lotes.map((l) => (
                                          <tr key={l.id_lote} className="hover:bg-gray-50/50">
                                            <td className="py-3 px-4 font-bold text-gray-400">LOTE #{l.id_lote}</td>
                                            <td className="py-3 px-4 text-gray-500 font-semibold">{l.cantidad_inicial} unidades</td>
                                            <td className="py-3 px-4"><span className="bg-emerald-50 text-[#148F77] font-black px-2.5 py-1 rounded-md border border-emerald-100">{l.cantidad_disponible} unidades</span></td>
                                            <td className="py-3 px-4 text-gray-500">{l.fecha_fabricacion || "N/A"}</td>
                                            <td className="py-3 px-4">{l.fecha_caducidad ? <span className="text-amber-700 font-semibold">{l.fecha_caducidad}</span> : <span className="text-blue-600 font-bold text-[9px] uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded border border-blue-100">PERMANENTE</span>}</td>
                                            <td className="py-3 px-4 text-[#2A5C4D] font-bold uppercase">{l.nombre_proveedor}</td>
                                          </tr>
                                        ))
                                      )}
                                    </tbody>
                                  </table>
                                  {!loadingLotes && lotes.length > 0 && (
                                    <div className="bg-gray-50/80 p-3 flex justify-between items-center px-4 border-t border-gray-100 font-bold text-xs">
                                      <span className="text-gray-400 uppercase tracking-wider text-[10px]">Existencias Totales:</span>
                                      <span className="text-[#148F77] font-black text-sm bg-white px-4 py-1.5 rounded-xl border border-gray-100 shadow-sm">{totalStockAcordeon} u. en Almacén</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      {/* MODAL PARA CREAR/EDITAR MATERIAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn print:hidden">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-[#2A5C4D] font-black text-xs uppercase tracking-widest">{editingMaterial ? `Modificar: ${editingMaterial.nombre_material}` : "Registrar Nuevo Material"}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-red-500 font-black text-sm transition-colors">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Nombre del Material *</label>
                <input type="text" required placeholder="Ej. RESINA FLUIDA" value={form.nombre_material} onChange={(e) => setForm({ ...form, nombre_material: e.target.value.toUpperCase() })} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] focus:ring-1 focus:ring-[#148F77] uppercase font-medium transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Precio de Compra (Bs.) *</label>
                <input type="number" required step="0.01" min="0" placeholder="0.00" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] focus:ring-1 focus:ring-[#148F77] font-medium transition-all" />
              </div>
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Precio de Venta (Bs.) *</label>
                <input type="number" required step="0.01" min="0" placeholder="0.00" value={form.precio_venta} onChange={(e) => setForm({ ...form, precio_venta: e.target.value })} className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm px-4 py-3 rounded-xl focus:outline-none focus:border-[#148F77] focus:ring-1 focus:ring-[#148F77] font-medium transition-all" />
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div>
                  <h4 className="text-[#2A5C4D] font-bold text-sm">¿Insumo Expirable?</h4>
                  <p className="text-gray-400 text-[8px] uppercase tracking-wider">Productos con fecha de caducidad</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={form.expirable} onChange={(e) => setForm({ ...form, expirable: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#148F77]"></div>
                </label>
              </div>
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 py-3.5 bg-[#148F77] text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-[#117A65] shadow-md transition-all">{editingMaterial ? "Actualizar" : "Registrar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN PARA ELIMINAR */}
      {showDeleteConfirm && materialToDelete && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn print:hidden">
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-transform">
            <div className="p-6 bg-red-50/30 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-red-600 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <span className="text-lg font-black">!</span> Confirmar Eliminación
              </h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-400 hover:text-red-500 font-black text-sm transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl text-red-500 font-black">!</span>
                </div>
                <p className="text-gray-700 font-bold text-sm">
                  ¿Estás seguro de eliminar el material?
                </p>
                <p className="text-[#2A5C4D] font-black text-base uppercase bg-gray-50 p-3 rounded-xl">
                  {materialToDelete.nombre_material}
                </p>
                <p className="text-gray-400 text-[10px]">
                  Esta acción no se puede deshacer.
                </p>
                {materialToDelete.expirable && (
                  <p className="text-amber-600 text-[9px] font-bold uppercase bg-amber-50 p-2 rounded-lg">
                    Este material tiene lotes asociados. Si tiene movimientos, no podrá ser eliminado.
                  </p>
                )}
              </div>
              <div className="pt-4 flex gap-3 border-t border-gray-100">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-3.5 bg-gray-100 text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                <button onClick={handleConfirmDelete} className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 shadow-md transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLES DE ALERTAS DE INVENTARIO */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn print:hidden">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden transform scale-100 transition-transform flex flex-col max-h-[85vh]">
            <div className="p-6 bg-red-50/50 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-red-900 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                <span>!</span> Alertas del Sistema de Suministros
              </h3>
              <button onClick={() => setShowAlertsModal(false)} className="text-gray-400 hover:text-red-500 font-black text-sm transition-colors cursor-pointer border-none bg-transparent">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* SECCIÓN 1: STOCK BAJO */}
              <div className="space-y-3">
                <h4 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest border-b pb-2">
                  Insumos con Existencias Críticas (Bajo 15% / Piso de 2 unidades)
                </h4>
                {alertasStock.length === 0 ? (
                  <p className="text-gray-400 italic py-2">No hay insumos con stock crítico.</p>
                ) : (
                  <div className="space-y-2">
                    {alertasStock.map((a) => (
                      <div key={a.id_material} className="flex justify-between items-center p-3.5 bg-red-50/20 border border-red-100/50 rounded-2xl">
                        <div>
                          <p className="font-bold text-gray-800 uppercase">{a.nombre_material}</p>
                          <p className="text-[9px] text-gray-400 mt-0.5">Código Insumo: #{a.id_material}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-red-50 text-red-600 font-black px-2.5 py-1 rounded-md text-[10px] border border-red-100">
                            {a.cantidad_disponible} / {a.cantidad_inicial} u ({a.porcentaje}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECCIÓN 2: VENCIMIENTOS PROXIMOS */}
              <div className="space-y-3">
                <h4 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest border-b pb-2">
                  Lotes Próximos a Vencer (Límite de 30 Días o Caducados)
                </h4>
                {alertasVencimiento.length === 0 ? (
                  <p className="text-gray-400 italic py-2">No hay lotes con fecha de vencimiento próxima.</p>
                ) : (
                  <div className="space-y-2">
                    {alertasVencimiento.map((l) => {
                      const diasRestantes = Math.ceil(
                        (new Date(l.fecha_caducidad).getTime() - new Date().getTime()) / (1000 * 3600 * 24)
                      );
                      const esCaducado = diasRestantes <= 0;
                      return (
                        <div key={l.id_lote} className="flex justify-between items-center p-3.5 bg-red-50/20 border border-red-100/50 rounded-2xl">
                          <div>
                            <p className="font-bold text-gray-800 uppercase">{l.nombre_material}</p>
                            <p className="text-[9px] text-gray-400 mt-0.5">Lote #{l.id_lote} | Stock en Lote: {l.cantidad_disponible} u</p>
                          </div>
                          <div className="text-right">
                            <span className={`font-black px-2.5 py-1 rounded-md text-[10px] border ${
                              esCaducado 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {esCaducado ? "Vencido" : `Vence en ${diasRestantes} días`} ({l.fecha_caducidad})
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                onClick={() => setShowAlertsModal(false)} 
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md cursor-pointer border-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
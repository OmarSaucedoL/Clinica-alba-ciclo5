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

  // ESTADOS MAESTROS DE COMPONENTES REPORTE
  const [activeTab, setActiveTab] = useState("catalogo"); 
  const [reportType, setReportType] = useState("general");
  const [reportColumns, setReportColumns] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loadingReport, setLoadingReport] = useState(false);

  // NUEVOS ESTADOS DE FILTRADO TÁCTICO INTERACTIVO
  const [filtroExpirable, setFiltroExpirable] = useState("TODOS");
  const [filtroEstadoStock, setFiltroEstadoStock] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // FILTROS AVANZADOS ADICIONALES PARA MÁXIMA ESCALABILIDAD
  const [filtroMaterialId, setFiltroMaterialId] = useState("");
  const [filtroProveedorId, setFiltroProveedorId] = useState("");
  const [filtroTopN, setFiltroTopN] = useState("");
  const [filtroDiasVencimiento, setFiltroDiasVencimiento] = useState("");
  const [filtroStockMin, setFiltroStockMin] = useState("");
  const [filtroStockMax, setFiltroStockMax] = useState("");
  const [filtroSoloStock, setFiltroSoloStock] = useState(false);
  const [proveedores, setProveedores] = useState([]);

  // Estado exclusivo para la reconstrucción del Reporte Estático
  const [fechaCorte, setFechaCorte] = useState(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16)
  );

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
      const [resMat, resProv] = await Promise.all([
        fetch(`${API_URL}/materiales`, getFetchConfig("GET")),
        fetch(`${API_URL}/proveedores`, getFetchConfig("GET"))
      ]);
      const dataMat = await resMat.json();
      const dataProv = await resProv.json();

      if (dataMat.success && Array.isArray(dataMat.data)) setMateriales(dataMat.data);
      if (dataProv.success && Array.isArray(dataProv.data)) setProveedores(dataProv.data);
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

  // MATERIALES FILTRADOS PARA EL SELECTOR SEGÚN EL TIPO DE REPORTE
  const materialesFiltradosParaSelector = () => {
    if (!Array.isArray(materiales)) return [];
    if (reportType === "vencimientos") {
      return materiales.filter(m => m.expirable === true);
    }
    return materiales;
  };

  // Resetear filtro de material cuando se cambia a reporte de vencimientos
  useEffect(() => {
    if (reportType === "vencimientos" && filtroMaterialId) {
      const materialSeleccionado = materiales.find(m => m.id_material === parseInt(filtroMaterialId, 10));
      if (materialSeleccionado && !materialSeleccionado.expirable) {
        setFiltroMaterialId("");
        setErrorMsg("El material seleccionado no es expirable, se ha removido el filtro.");
        autoHideMessages();
      }
    }
  }, [reportType, materiales, filtroMaterialId]);

  const cargarDatosDelReporte = async () => {
    try {
      setLoadingReport(true);
      setErrorMsg("");
      
      let url = `${API_URL}/inventario/reportes?tipo=${reportType}&expirable=${filtroExpirable}&estado=${filtroEstadoStock}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&id_material=${filtroMaterialId}&id_proveedor=${filtroProveedorId}&top=${filtroTopN}&dias=${filtroDiasVencimiento}&stock_min=${filtroStockMin}&stock_max=${filtroStockMax}&solo_stock=${filtroSoloStock}&fecha=${encodeURIComponent(fechaCorte)}`;

      const res = await fetch(url, getFetchConfig("GET"));
      const result = await res.json();
      if (result.success) {
        setReportColumns(result.columns || []);
        setReportData(result.data || []);
      } else {
        setErrorMsg(result.message || "Error al cargar los datos del reporte.");
        autoHideMessages();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error al cargar los datos del reporte.");
      autoHideMessages();
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
   if (activeTab === "reportes") {
      cargarDatosDelReporte();
   }
  }, [
    activeTab,
    reportType,
    filtroExpirable,
    filtroEstadoStock,
    fechaInicio,
    fechaFin,
    fechaCorte,
    filtroMaterialId,
    filtroProveedorId,
    filtroTopN,
    filtroDiasVencimiento,
    filtroStockMin,
    filtroStockMax,
    filtroSoloStock
  ]);

  const handleExportarExcel = async () => {
    try {
      setErrorMsg("");
      setSuccessMsg("Generando archivo Excel...");
      
      let url = `${API_URL}/inventario/reportes/exportar?tipo=${reportType}&expirable=${filtroExpirable}&estado=${filtroEstadoStock}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&id_material=${filtroMaterialId}&id_proveedor=${filtroProveedorId}&top=${filtroTopN}&dias=${filtroDiasVencimiento}&stock_min=${filtroStockMin}&stock_max=${filtroStockMax}&solo_stock=${filtroSoloStock}&fecha=${encodeURIComponent(fechaCorte)}`;

      const res = await fetch(url, getFetchConfig("GET"));
      if (!res.ok) throw new Error("Error al generar el archivo Excel.");

      const blob = await res.blob();
      const urlDescarga = window.URL.createObjectURL(blob);
      const linkVirtual = document.createElement("a");
      linkVirtual.href = urlDescarga;
      linkVirtual.download = `Reporte_${reportType.toUpperCase()}_${new Date().toISOString().slice(0, 10)}.csv`;
      
      document.body.appendChild(linkVirtual);
      linkVirtual.click();
      document.body.removeChild(linkVirtual);
      window.URL.revokeObjectURL(urlDescarga);

      setSuccessMsg("Archivo Excel generado correctamente.");
      autoHideMessages();
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || "Error al generar el archivo Excel.");
      autoHideMessages();
    }
  };

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

  const renderCeldasReporte = (item) => {
    switch (reportType) {
      case "general":
        return (
          <>
            <td className="py-3.5 px-4 font-semibold">Bs. {item.precio?.toFixed(2) || "0.00"}</td>
            <td className="py-3.5 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra || "NO"}</span>
            </td>
            <td className="py-3.5 px-4 font-black text-[#148F77]">{item.metrica_core || 0} unidades</td>
            <td className="py-3.5 px-4 text-gray-400">{item.conteo_lotes || 0} lotes activos</td>
          </>
        );
      case "mermas":
        return (
          <>
            <td className="py-3.5 px-4 font-semibold">Bs. {item.precio?.toFixed(2) || "0.00"}</td>
            <td className="py-3.5 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra || "NO"}</span>
            </td>
            <td className="py-3.5 px-4 font-black text-red-500">-{item.metrica_core || 0} u.</td>
            <td className="py-3.5 px-4 text-gray-400 font-bold uppercase">{item.conteo_lotes || 0} Incidentes</td>
          </>
        );
      case "ingresos":
        return (
          <>
            <td className="py-3.5 px-4 font-semibold">Bs. {item.precio?.toFixed(2) || "0.00"}</td>
            <td className="py-3.5 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra || "NO"}</span>
            </td>
            <td className="py-3.5 px-4 font-black text-emerald-600">+{item.metrica_core || 0} u.</td>
            <td className="py-3.5 px-4 text-gray-400 font-bold uppercase">{item.conteo_lotes || 0} Entradas</td>
          </>
        );
      case "vencimientos":
        return (
          <>
            <td className="py-3.5 px-4 font-semibold">Bs. {item.precio?.toFixed(2) || "0.00"}</td>
            <td className="py-3.5 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra || "NO"}</span>
            </td>
            <td className="py-3.5 px-4 font-black text-amber-600 bg-amber-50 px-2 rounded-lg">{item.metrica_core || 0} u. en riesgo</td>
            <td className="py-3.5 px-4 text-amber-700 font-black tracking-wide">{item.fecha_ref || "N/A"}</td>
          </>
        );
      case "estatico": 
        return (
          <>
            <td className="py-3.5 px-4 font-semibold">Bs. {item.precio?.toFixed(2) || "0.00"}</td>
            <td className="py-3.5 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra || "NO"}</span>
            </td>
            <td className="py-3.5 px-4 font-black text-[#2A5C4D]">{item.metrica_core || 0} unidades</td>
            <td className="py-3.5 px-4 font-black text-emerald-600 bg-emerald-50/60 px-3 rounded-lg">Bs. {item.costo_total?.toFixed(2) || "0.00"}</td>
          </>
        );
      default:
        return null;
    }
  };

  // Función para validar y limitar el año en la fecha
  const handleDateChange = (setter) => (e) => {
    let value = e.target.value;
    if (value) {
      // Validar que el año no tenga más de 4 dígitos
      const parts = value.split('-');
      if (parts.length === 3 && parts[0] && parts[0].length > 4) {
        setErrorMsg("El año no puede tener más de 4 dígitos");
        autoHideMessages();
        return;
      }
    }
    setter(value);
  };

  return (
    <div className="space-y-6">
      {/* CABECERA - Se oculta completamente en impresión */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm print:hidden">
        <div>
          <h2 className="text-[#2A5C4D] font-black text-lg uppercase tracking-wide">INVENTARIO</h2>
          <p className="text-gray-400 text-xs mt-1">Gestiona el inventario de materiales y suministros de la clínica, controla existencias, monitorea lotes y genera reportes</p>
        </div>
        <div className="flex bg-gray-100 p-1.5 rounded-xl gap-2">
          <button onClick={() => setActiveTab("catalogo")} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "catalogo" ? "bg-white text-[#148F77] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>GESTIÓN DE INVENTARIO</button>
          <button onClick={() => setActiveTab("reportes")} className={`px-4 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all ${activeTab === "reportes" ? "bg-white text-[#148F77] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>REPORTE DE INVENTARIO</button>
        </div>
      </div>

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
              <span className="text-lg">⚠</span> {errorMsg}
            </div>
          )}
        </div>
      )}

      {/* TAB CATALOGO - Se oculta completamente en impresión */}
      {activeTab === "catalogo" && (
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
      )}

      {/* TAB CONSOLA DE REPORTES - OPTIMIZADO PARA PDF */}
      {activeTab === "reportes" && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* PANEL DE FILTROS - Se oculta completamente en impresión */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 print:hidden">
            <h4 className="text-[#2A5C4D] font-black text-[10px] uppercase tracking-widest border-b pb-2">Panel de Filtros</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs font-semibold text-gray-600">
              
              {/* REPORTE BASE */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Reporte:</label>
                <select value={reportType} onChange={(e) => { setReportType(e.target.value); setFiltroEstadoStock("todos"); }} className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="general">REPORTE GENERAL DE INVENTARIO</option>
                  <option value="mermas">PRODUCTOS DAÑADOS Y PÉRDIDAS</option>
                  <option value="ingresos">PRODUCTOS CON MAYOR ROTACIÓN DE INGRESO</option>
                  <option value="vencimientos">LOTES PRÓXIMOS A VENCER</option>
                  <option value="estatico">REGISTRO CRONOLÓGICO - HISTÓRICO</option>
                </select>
              </div>

              {/* INSUMO CLÍNICO ESPECÍFICO */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">
                  Material:
                  {reportType === "vencimientos" && (
                    <span className="ml-2 text-amber-600 text-[8px]">* Solo expirables</span>
                  )}
                </label>
                <select 
                  value={filtroMaterialId} 
                  onChange={(e) => setFiltroMaterialId(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]"
                >
                  <option value="">-- TODOS LOS MATERIALES --</option>
                  {materialesFiltradosParaSelector().map(m => (
                    <option key={m.id_material} value={m.id_material}>
                      {m.nombre_material}
                      {reportType === "vencimientos" && !m.expirable && " (No Expirable)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* PROVEEDOR ORIGEN */}
              {(reportType === "ingresos" || reportType === "vencimientos") && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Proveedor:</label>
                  <select value={filtroProveedorId} onChange={(e) => setFiltroProveedorId(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                    <option value="">-- TODOS LOS PROVEEDORES --</option>
                    {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>)}
                  </select>
                </div>
              )}

              {/* LÍMITE RESULTADOS */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Límite Resultados</label>
                <select value={filtroTopN} onChange={(e) => setFiltroTopN(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="">-- TODOS --</option>
                  <option value="5">TOP 5</option>
                  <option value="10">TOP 10</option>
                  <option value="25">TOP 25</option>
                </select>
              </div>

              {/* TOLERANCIA SANITARIA */}
              {reportType === "vencimientos" && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-amber-800 font-black text-[9px] uppercase tracking-widest block">Tolerancia Sanitaria</label>
                  <select value={filtroDiasVencimiento} onChange={(e) => setFiltroDiasVencimiento(e.target.value)} className="w-full bg-amber-50/40 border border-amber-200 text-amber-900 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                    <option value="">-- TODOS LOS VENCIMIENTOS --</option>
                    <option value="30">≤ 30 DÍAS (Crítico)</option>
                    <option value="90">≤ 90 DÍAS (Trimestral)</option>
                    <option value="180">≤ 180 DÍAS (Semestral)</option>
                  </select>
                </div>
              )}

              {/* TRATAMIENTO INSUMO */}
              {reportType !== "estatico" && reportType !== "vencimientos" && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Tipo Insumo</label>
                  <select value={filtroExpirable} onChange={(e) => setFiltroExpirable(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                    <option value="TODOS">-- TODOS --</option>
                    <option value="SI">EXPIRABLES</option>
                    <option value="NO">NO EXPIRABLES</option>
                  </select>
                </div>
              )}

              {/* CONTROLES EXCLUSIVOS DEL REPORTE GENERAL */}
              {reportType === "general" && (
                <>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Estado Stock:</label>
                    <select value={filtroEstadoStock} onChange={(e) => setFiltroEstadoStock(e.target.value)} className="w-full bg-gray-50 border border-gray-200 text-gray-800 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                      <option value="todos">-- TODOS --</option>
                      <option value="agotados">AGOTADOS (Stock = 0)</option>
                      <option value="bajo_minimo">STOCK CRÍTICO (&lt; 10)</option>
                    </select>
                  </div>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Stock Mínimo</label>
                    <input type="number" min="0" placeholder="Ej. 10" value={filtroStockMin} onChange={(e) => setFiltroStockMin(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                  </div>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Stock Máximo</label>
                    <input type="number" min="0" placeholder="Ej. 100" value={filtroStockMax} onChange={(e) => setFiltroStockMax(e.target.value)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <input type="checkbox" id="checkStock" checked={filtroSoloStock} onChange={(e) => setFiltroSoloStock(e.target.checked)} className="rounded text-[#148F77] focus:ring-[#148F77]" />
                    <label htmlFor="checkStock" className="text-[10px] font-black uppercase tracking-wider text-gray-500 cursor-pointer">Ocultar sin existencias</label>
                  </div>
                </>
              )}

              {/* RANGOS CRONOLÓGICOS */}
              {(reportType === "ingresos" || reportType === "mermas") && (
                <>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Fecha Desde</label>
                    <input type="date" value={fechaInicio} onChange={handleDateChange(setFechaInicio)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                  </div>
                  <div className="space-y-1 animate-fadeIn">
                    <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Fecha Hasta</label>
                    <input type="date" value={fechaFin} onChange={handleDateChange(setFechaFin)} className="w-full bg-gray-50 border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                  </div>
                </>
              )}

              {/* FECHA DE CORTE ESTÁTICA */}
              {reportType === "estatico" && (
                <div className="space-y-1 lg:col-span-2 animate-slideDown">
                  <label className="text-amber-800 font-black text-[9px] uppercase tracking-widest block">Fecha de Corte Cronológica *</label>
                  <input type="datetime-local" value={fechaCorte} onChange={handleDateChange(setFechaCorte)} className="w-full bg-amber-50/40 border border-amber-200 text-amber-900 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]" />
                </div>
              )}
            </div>

            {/* BOTONERA DE ACCIONES */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={cargarDatosDelReporte}
                disabled={loadingReport}
                className="bg-[#148F77] hover:bg-[#117A65] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                {loadingReport ? (
                  <>
                    <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Cargando...
                  </>
                ) : (
                  "⟳ Aplicar Filtros"
                )}
              </button>
              <button onClick={handleExportarExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md">Exportar a Excel</button>
              <button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md">Imprimir</button>
            </div>
          </div>
          
          {/* GRILLA DE RENDERIZADO - OPTIMIZADA PARA PDF */}
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden p-8 space-y-6 print:bg-white print:shadow-none print:p-0 print:m-0 print:rounded-none">
            
            {/* ENCABEZADO DEL REPORTE PARA PDF - Solo visible en impresión */}
            <div className="hidden print:flex justify-between items-center border-b-2 border-[#148F77] pb-4 mb-4">
              <div>
                <h1 className="text-[#2A5C4D] font-black text-2xl uppercase tracking-wide">CLÍNICA ODONTOLÓGICA ALBA</h1>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">REPORTE DE INVENTARIO - SISTEMA DE GESTIÓN LOGÍSTICA</p>
              </div>
              <div className="text-right text-xs text-gray-500 font-bold uppercase">
                <div>Emisión: {new Date().toLocaleDateString('es-BO')}</div>
                <div>Hora: {new Date().toLocaleTimeString('es-BO')}</div>
                <div className="mt-1">Auditor: @{user?.nombre_usuario || "ADMINISTRADOR"}</div>
              </div>
            </div>

            {/* TÍTULO DEL REPORTE */}
            <div className="border-b border-gray-100 pb-2 print:border-b-2 print:border-gray-300">
              <h3 className="text-[#2A5C4D] font-black text-xs uppercase tracking-wide print:text-sm">
                {reportType === "general" && "REPORTE GENERAL DE INVENTARIO - EXISTENCIAS Y STOCK"}
                {reportType === "mermas" && "REPORTE DE PÉRDIDAS Y DAÑOS - DESCUENTOS DE EXISTENCIAS REGISTRADOS"}
                {reportType === "ingresos" && "REPORTE DE INGRESOS - ROTACIÓN DE COMPRAS"}
                {reportType === "vencimientos" && "REPORTE DE VENCIMIENTOS - LOTES PRÓXIMOS A CADUCAR"}
                {reportType === "estatico" && `BALANCE DE INVENTARIO HISTÓRICO - CORTE AL ${new Date(fechaCorte).toLocaleString('es-BO')}`}
              </h3>
              <p className="text-gray-400 text-[10px] mt-0.5 print:text-gray-500 print:text-xs">
                Reporte generado para análisis de existencias y movimientos del almacén
              </p>
            </div>

            {/* CONTENIDO DEL REPORTE */}
            {loadingReport ? (
              <div className="p-14 text-center text-[#148F77] font-bold text-xs uppercase tracking-widest animate-pulse">Cargando datos...</div>
            ) : reportData.length === 0 ? (
              <div className="p-14 text-center text-gray-400 font-medium text-xs print:text-gray-500 print:py-8">
                No se encontraron registros que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto print:overflow-visible">
                <table className="w-full text-left text-xs border-collapse print:text-[9px] print:border print:border-gray-300">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                      {reportColumns.map((col, index) => <th key={index} className="py-3 px-4 print:py-2 print:px-2">{col}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                    {reportData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent print:even:bg-gray-50">
                        <td className="py-3.5 px-4 font-bold text-gray-400 print:py-2 print:px-2">#{item.id}</td>
                        <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase print:text-gray-700 print:py-2 print:px-2">{item.descripcion}</td>
                        {renderCeldasReporte(item)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* PIE DE FIRMAS PARA PDF - Solo visible en impresión */}
            <div className="hidden print:flex justify-between items-center mt-16 pt-8">
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">ADMINISTRADOR/A DE INVENTARIO</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Firma y sello</p>
              </div>
              <div className="text-center">
                <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">DIRECCIÓN MÉDICA</p>
                <p className="text-[8px] text-gray-400 mt-0.5">Vo.Bo.</p>
              </div>
            </div>

            {/* PIE DE PÁGINA PARA PDF */}
            <div className="hidden print:flex justify-between items-center text-[8px] text-gray-400 mt-8 pt-4 border-t border-gray-200">
              <div>DOCUMENTO GENERADO POR: {user?.nombre || "Usuario no definido"}</div>
              <div>Página 1 de 1</div>
            </div>
          </div>
        </div>
      )}

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
                <span className="text-lg">⚠</span> Confirmar Eliminación
              </h3>
              <button onClick={() => setShowDeleteConfirm(false)} className="text-gray-400 hover:text-red-500 font-black text-sm transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl text-red-500">🗑️</span>
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
                    ⚠️ Este material tiene lotes asociados. Si tiene movimientos, no podrá ser eliminado.
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
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { exportToExcel, exportToWord } from "../../services/exporter";
import AsistenteVoz from "../../components/UIs/reportes/AsistenteVoz";

export default function ReporteInventario({ dataMaster, user, setActiveMenu }) {
  const API_URL = import.meta.env.VITE_API_URL;

  // ESTADOS DE FILTRADO TÁCTICO INTERACTIVO
  const [reportType, setReportType] = useState("general");
  const [filtroExpirable, setFiltroExpirable] = useState("TODOS");
  const [filtroEstadoStock, setFiltroEstadoStock] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [filtroMaterialId, setFiltroMaterialId] = useState("");
  const [filtroProveedorId, setFiltroProveedorId] = useState("");
  const [filtroTopN, setFiltroTopN] = useState("");
  const [filtroStockMin, setFiltroStockMin] = useState("");
  const [filtroStockMax, setFiltroStockMax] = useState("");
  const [filtroSoloStock, setFiltroSoloStock] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
      .toISOString().slice(0, 16)
  );

  const [materiales, setMateriales] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [reportColumns, setReportColumns] = useState([]);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const getFetchConfig = () => ({
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`
    }
  });

  const cargarCatalogosSelectores = async () => {
    try {
      const [resMat, resProv] = await Promise.all([
        fetch(`${API_URL}/materiales`, getFetchConfig()),
        fetch(`${API_URL}/proveedores`, getFetchConfig())
      ]);
      const dataMat = await resMat.json();
      const dataProv = await resProv.json();

      if (dataMat.success) setMateriales(dataMat.data || []);
      if (dataProv.success) setProveedores(dataProv.data || []);
    } catch (err) {
      console.error("Error al cargar catalogos para filtros", err);
    }
  };

  const cargarDatosDelReporte = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const params = new URLSearchParams();
      params.append("tipo", reportType);
      params.append("expirable", filtroExpirable);
      params.append("estado", filtroEstadoStock);
      if (fechaInicio) params.append("fecha_inicio", fechaInicio);
      if (fechaFin) params.append("fecha_fin", fechaFin);
      if (filtroMaterialId) params.append("id_material", filtroMaterialId);
      if (filtroProveedorId) params.append("id_proveedor", filtroProveedorId);
      if (filtroTopN) params.append("top", filtroTopN);
      if (filtroStockMin) params.append("stock_min", filtroStockMin);
      if (filtroStockMax) params.append("stock_max", filtroStockMax);
      if (filtroSoloStock) params.append("solo_stock", "true");
      if (reportType === "estatico" && fechaCorte) {
        params.append("fecha", fechaCorte);
      }

      const res = await fetch(`${API_URL}/reportes/inventario?${params.toString()}`, getFetchConfig());
      const result = await res.json();

      if (result.success) {
        setReportData(result.data || []);
        setReportColumns(result.columns || []);
        if ((result.data || []).length === 0) {
          setErrorMessage("No se encontraron registros en el reporte con los filtros seleccionados.");
        }
      } else {
        setErrorMessage(result.message || "Error al generar el reporte.");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage("Error de conexión al cargar datos del reporte.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCatalogosSelectores();
    cargarDatosDelReporte();
  }, [reportType]);

  const handleExcel = () => {
    exportToExcel("table-inventario-rep", `Reporte_Inventario_${reportType.toUpperCase()}`, `Reporte de Inventario - ${reportType}`);
  };

  const handleWord = () => {
    exportToWord("table-inventario-rep", `Reporte_Inventario_${reportType.toUpperCase()}`, `Reporte de Inventario - ${reportType}`);
  };

  // KPIs
  const totalCostoCompra = reportData.reduce((acc, curr) => acc + (curr.costo_total || 0), 0);
  const totalCostoVenta = reportData.reduce((acc, curr) => acc + (curr.costo_total_venta || 0), 0);
  const margenUtilidad = totalCostoVenta - totalCostoCompra;
  const margenPorcentaje = totalCostoCompra > 0 ? (margenUtilidad / totalCostoCompra) * 100 : 0;

  const renderCeldasReporte = (item) => {
    const formatBs = (val) => `Bs. ${val?.toFixed(2)}`;
    switch (reportType) {
      case "general":
        return (
          <>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio)}</td>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio_venta)}</td>
            <td className="py-3 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra}</span>
            </td>
            <td className="py-3 px-4 font-black text-[#148F77]">{item.metrica_core} unidades</td>
            <td className="py-3 px-4 text-gray-400 font-bold">{item.conteo_lotes} lotes activos</td>
            <td className="py-3 px-4 font-black text-emerald-700">{formatBs(item.costo_total)}</td>
            <td className="py-3 px-4 font-black text-blue-700">{formatBs(item.costo_total_venta)}</td>
          </>
        );
      case "mermas":
        return (
          <>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio)}</td>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio_venta)}</td>
            <td className="py-3 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra}</span>
            </td>
            <td className="py-3 px-4 font-black text-red-500">-{item.metrica_core} u.</td>
            <td className="py-3 px-4 text-gray-400 font-bold uppercase">{item.conteo_lotes} Incidentes</td>
            <td className="py-3 px-4 font-black text-red-700">{formatBs(item.costo_total)}</td>
            <td className="py-3 px-4 font-black text-red-900">{formatBs(item.costo_total_venta)}</td>
          </>
        );
      case "ingresos":
        return (
          <>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio)}</td>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio_venta)}</td>
            <td className="py-3 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra}</span>
            </td>
            <td className="py-3 px-4 font-black text-emerald-600">+{item.metrica_core} u.</td>
            <td className="py-3 px-4 text-gray-400 font-bold uppercase">{item.conteo_lotes} Entradas</td>
            <td className="py-3 px-4 font-black text-emerald-700">{formatBs(item.costo_total)}</td>
            <td className="py-3 px-4 font-black text-blue-700">{formatBs(item.costo_total_venta)}</td>
          </>
        );
      case "vencimientos":
        return (
          <>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio)}</td>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio_venta)}</td>
            <td className="py-3 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra}</span>
            </td>
            <td className="py-3 px-4 font-black text-amber-600">{item.metrica_core} u. en riesgo</td>
            <td className="py-3 px-4 text-amber-700 font-bold">{item.fecha_ref || "N/A"}</td>
            <td className="py-3 px-4 font-black text-amber-800">{formatBs(item.costo_total)}</td>
            <td className="py-3 px-4 font-black text-amber-900">{formatBs(item.costo_total_venta)}</td>
          </>
        );
      case "estatico":
        return (
          <>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio)}</td>
            <td className="py-3 px-4 font-semibold">{formatBs(item.precio_venta)}</td>
            <td className="py-3 px-4">
              <span className={`px-2 py-0.5 rounded text-[9px] font-black ${item.info_extra === "SÍ" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>{item.info_extra}</span>
            </td>
            <td className="py-3 px-4 font-black text-gray-700">{item.metrica_core} unidades</td>
            <td className="py-3 px-4 text-gray-400 font-bold">{item.conteo_lotes} movs.</td>
            <td className="py-3 px-4 font-black text-emerald-700">{formatBs(item.costo_total)}</td>
            <td className="py-3 px-4 font-black text-blue-700">{formatBs(item.costo_total_venta)}</td>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-emerald-50 relative overflow-hidden print:border-none print:shadow-none print-section">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: letter;
            margin: 12mm 15mm 12mm 15mm;
          }
          .print-section {
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .overflow-x-auto {
            overflow: visible !important;
          }
          table {
            width: 100% !important;
            min-width: 0 !important;
            table-layout: auto !important;
          }
          th, td {
            padding: 8px 6px !important;
            font-size: 10px !important;
            word-break: break-word !important;
          }
          th {
            color: #148F77 !important;
            background-color: rgba(20, 143, 119, 0.05) !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      ` }} />

      {/* TITULO Y DESCRIPCION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-[#2A5C4D]">Reporte de Inventario</h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Consola analítica avanzada de existencias, pérdidas, vencimientos y valorización comercial.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <AsistenteVoz setActiveMenu={setActiveMenu} userRolId={user?.rol} />
          <button
            onClick={cargarDatosDelReporte}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-3 bg-[#148F77] text-white text-sm font-bold rounded-xl transition-all shadow-sm hover:bg-[#0f6b59] hover:-translate-y-0.5 disabled:opacity-50"
          >
            {loading ? "Cargando..." : "Aplicar Filtros"}
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8 print:p-0">
        <div className="max-w-7xl mx-auto">
          {/* MEMBRETE IMPRESION */}
          <div className="hidden print:flex justify-between items-center border-b-2 border-[#148F77] pb-4 mb-4">
            <div>
              <h1 className="text-[#2A5C4D] font-black text-2xl uppercase tracking-wide">CLÍNICA ODONTOLÓGICA ALBA</h1>
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">
                REPORTE DE INVENTARIO - VALORIZACIÓN FINANCIERA
              </p>
            </div>
            <div className="text-right text-xs text-gray-500 font-bold uppercase">
              <div>Emisión: {new Date().toLocaleDateString('es-BO')}</div>
              <div>Auditor: @{user?.nombre_usuario || "ADMINISTRADOR"}</div>
            </div>
          </div>

          {/* FILTROS PANEL */}
          <div className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100/70 space-y-4 mb-8 print:hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs font-semibold text-gray-600">
              
              {/* REPORTE BASE */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Reporte:</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 font-bold p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="general">REPORTE GENERAL DE INVENTARIO</option>
                  <option value="mermas">PRODUCTOS DAÑADOS Y PÉRDIDAS</option>
                  <option value="ingresos">ROTACIÓN DE INGRESO (COMPRAS)</option>
                  <option value="vencimientos">LOTES PRÓXIMOS A VENCER</option>
                  <option value="estatico">BALANCE HISTÓRICO AL CORTE</option>
                </select>
              </div>

              {/* INSUMO CLÍNICO */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Material:</label>
                <select value={filtroMaterialId} onChange={(e) => setFiltroMaterialId(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="">-- TODOS LOS MATERIALES --</option>
                  {materiales.map(m => (
                    <option key={m.id_material} value={m.id_material}>{m.nombre_material}</option>
                  ))}
                </select>
              </div>

              {/* PROVEEDOR */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Proveedor:</label>
                <select value={filtroProveedorId} onChange={(e) => setFiltroProveedorId(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="">-- TODOS LOS PROVEEDORES --</option>
                  {proveedores.map(p => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>
                  ))}
                </select>
              </div>

              {/* EXPIRABLES */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Expirabilidad:</label>
                <select value={filtroExpirable} onChange={(e) => setFiltroExpirable(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                  <option value="TODOS">TODOS LOS PRODUCTOS</option>
                  <option value="expirables">SOLO EXPIRABLES</option>
                  <option value="no_expirables">SOLO NO EXPIRABLES</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs font-semibold text-gray-600">
              {/* ESTADO STOCK */}
              {reportType === "general" && (
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Nivel de Existencias:</label>
                  <select value={filtroEstadoStock} onChange={(e) => setFiltroEstadoStock(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 p-3 rounded-xl focus:outline-none focus:border-[#148F77]">
                    <option value="todos">TODOS LOS NIVELES</option>
                    <option value="normal">NORMAL (DENTRO DEL RANGO)</option>
                    <option value="bajo">STOCK BAJO (DISCRETO)</option>
                    <option value="critico">CRÍTICO (PRÓXIMO A AGOTARSE)</option>
                    <option value="sin_stock">SIN EXISTENCIAS (CERO)</option>
                  </select>
                </div>
              )}

              {/* FECHA CORTE HISTORICO */}
              {reportType === "estatico" && (
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Fecha de Corte:</label>
                  <input type="datetime-local" value={fechaCorte} onChange={(e) => setFechaCorte(e.target.value)} className="w-full bg-white border border-gray-200 text-gray-800 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                </div>
              )}

              {/* FECHA RANGO INICIO */}
              {["mermas", "ingresos"].includes(reportType) && (
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Fecha Inicio:</label>
                  <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="w-full bg-white border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                </div>
              )}

              {/* FECHA RANGO FIN */}
              {["mermas", "ingresos"].includes(reportType) && (
                <div className="space-y-1">
                  <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Fecha Fin:</label>
                  <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="w-full bg-white border border-gray-200 p-2.5 rounded-xl focus:outline-none focus:border-[#148F77]" />
                </div>
              )}

              {/* TOP LIMIT */}
              <div className="space-y-1">
                <label className="text-gray-400 font-black text-[9px] uppercase tracking-widest block">Límite Top N:</label>
                <input type="number" placeholder="Ej. 10" value={filtroTopN} onChange={(e) => setFiltroTopN(e.target.value)} className="w-full bg-white border border-gray-200 p-3 rounded-xl focus:outline-none" />
              </div>

              {/* CHECKBOX SOLO CON EXISTENCIAS */}
              <div className="flex items-center gap-2 h-12">
                <input type="checkbox" id="solo_stock_chk" checked={filtroSoloStock} onChange={(e) => setFiltroSoloStock(e.target.checked)} className="w-4 h-4 text-[#148F77] border-gray-200 rounded focus:ring-0" />
                <label htmlFor="solo_stock_chk" className="text-xs text-gray-500 font-bold uppercase tracking-wide cursor-pointer">Solo con existencias</label>
              </div>
            </div>
          </div>

          {/* KPIS VALORIZACION */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-[#148F77]/5 p-5 rounded-2xl border border-[#148F77]/10 flex flex-col justify-center items-center shadow-sm">
              <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest mb-1 text-center">
                Valor Total Almacén (Costo Compra)
              </p>
              <p className="text-2xl font-black text-[#2A5C4D]">
                Bs. {totalCostoCompra.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100 flex flex-col justify-center items-center shadow-sm">
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 text-center">
                Valor Comercial Estimado (Precio Venta)
              </p>
              <p className="text-2xl font-black text-blue-800">
                Bs. {totalCostoVenta.toFixed(2)}
              </p>
            </div>
            <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-center items-center shadow-sm">
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1 text-center">
                Ganancia / Margen Proyectado
              </p>
              <p className="text-2xl font-black text-emerald-800">
                Bs. {margenUtilidad.toFixed(2)} <span className="text-xs text-emerald-600 font-black">({margenPorcentaje.toFixed(1)}%)</span>
              </p>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-2 pb-6 border-b border-gray-100 print:hidden">
            {reportData.length > 0 && (
              <div className="flex gap-3">
                <button
                  onClick={handleExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Exportar Excel
                </button>
                <button
                  onClick={handleWord}
                  className="bg-blue-800 hover:bg-blue-900 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Exportar Word
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3.5 rounded-xl transition-all shadow-md"
                >
                  Imprimir / PDF
                </button>
              </div>
            )}
          </div>

          {/* DATAGRID */}
          <div className="mt-8">
            {errorMessage && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl print:hidden">
                {errorMessage}
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="w-12 h-12 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : reportData.length > 0 ? (
              <div className="overflow-x-auto print:overflow-visible">
                <table id="table-inventario-rep" className="w-full text-left text-xs border-collapse border border-gray-100 print:border print:border-gray-300">
                  <thead>
                    <tr className="bg-gray-50 text-[9px] font-black uppercase tracking-widest text-gray-400 border-b border-gray-200 print:bg-gray-100 print:text-gray-700 print:border-b-2 print:border-gray-400">
                      {reportColumns.map((col, index) => (
                        <th key={index} className="py-3 px-4 print:py-2 print:px-2">{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium text-gray-600 print:divide-gray-200">
                    {reportData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50/50 transition-colors print:hover:bg-transparent print:even:bg-gray-50">
                        <td className="py-3.5 px-4 font-bold text-gray-400 print:py-2 print:px-2">
                          {reportType === "vencimientos" ? item.id : `#${item.id}`}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-[#2A5C4D] uppercase print:text-gray-700 print:py-2 print:px-2">
                          {item.descripcion}
                        </td>
                        {renderCeldasReporte(item)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          {/* SIGNATURES */}
          <div className="hidden print:flex justify-between items-center mt-16 pt-8">
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">ADMINISTRADOR DE INVENTARIO</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Firma y Sello</p>
            </div>
            <div className="text-center">
              <div className="w-48 border-t-2 border-gray-400 pt-2"></div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">DIRECCIÓN MÉDICA</p>
              <p className="text-[8px] text-gray-400 mt-0.5">Vo.Bo.</p>
            </div>
          </div>

          {/* FOOTER IMPRESION */}
          <div className="hidden print:flex justify-between items-center text-[8px] text-gray-400 mt-8 pt-4 border-t border-gray-200">
            <div>AUDITOR: @{user?.nombre_usuario || "ADMINISTRADOR"}</div>
            <div>Pág. 1 de 1</div>
          </div>
        </div>
      </div>
    </div>
  );
}

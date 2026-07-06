import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido.";
  if (errorMsg.includes("CONTEXT:")) {
    return errorMsg.split("CONTEXT:")[0].replace("Error interno:", "").trim();
  }
  return errorMsg;
};

export default function ModuloAsistencia({ userRolId, user, dataMaster }) {
  const isAdmin = Number(userRolId) === 1;
  const [activeTab, setActiveTab] = useState(isAdmin ? "proyectar" : "escanear");
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsError, setLogsError] = useState("");
  const [filterName, setFilterName] = useState("");

  // Estados para el QR Dinámico (Admin)
  const [qrToken, setQrToken] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

  // Estados para el Escáner (Staff)
  const [scannerLoaded, setScannerLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [scanResult, setScanResult] = useState(null); // { success: boolean, message: string }
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

  // Estados para el Reporte Mensual (Nuevo)
  const [selectedMonthPersonalId, setSelectedMonthPersonalId] = useState(
    isAdmin ? "" : (user?.id_persona || "")
  );
  const [personalList, setPersonalList] = useState([]);
  const [loadingPersonal, setLoadingPersonal] = useState(false);
  
  const mesesList = [
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" }
  ];

  const currentYear = new Date().getFullYear();
  const añosList = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  const [selectedMonthPart, setSelectedMonthPart] = useState(
    String(new Date().getMonth() + 1).padStart(2, "0")
  );
  const [selectedYearPart, setSelectedYearPart] = useState(
    String(new Date().getFullYear())
  );
  const [monthlyReportData, setMonthlyReportData] = useState([]);
  const [loadingMonthlyReport, setLoadingMonthlyReport] = useState(false);
  const [monthlyReportError, setMonthlyReportError] = useState("");

  // Cargar lista de personal clínico (Admin)
  useEffect(() => {
    if (isAdmin) {
      const cargarPersonalList = async () => {
        setLoadingPersonal(true);
        try {
          const res = await fetch(`${API_URL}/asistencia/empleados`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          const data = await res.json();
          if (data.success) {
            setPersonalList(data.data || []);
          }
        } catch (e) {
          console.error("Error al cargar personal:", e);
        } finally {
          setLoadingPersonal(false);
        }
      };
      cargarPersonalList();
    }
  }, [isAdmin]);

  // 1. CARGAR LIBRERÍA DE QR DESDE CDN DINÁMICAMENTE (Evita problemas de compatibilidad en React 19)
  useEffect(() => {
    if (window.Html5Qrcode) {
      setScannerLoaded(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/html5-qrcode";
    script.async = true;
    script.onload = () => setScannerLoaded(true);
    document.body.appendChild(script);
  }, []);

  // 2. EFECTO PARA ACTUALIZAR EL QR DINÁMICO (Admin)
  useEffect(() => {
    if (activeTab === "proyectar" && isAdmin) {
      obtenerNuevoToken();
      
      // Reiniciar intervalo de 30 segundos
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            obtenerNuevoToken();
            return 30;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab]);

  // Asegura la limpieza del escáner en desmontaje
  useEffect(() => {
    return () => {
      if (scannerInstance) {
        scannerInstance.stop().catch(console.error);
      }
    };
  }, [scannerInstance]);

  const obtenerNuevoToken = async () => {
    setQrLoading(true);
    try {
      const res = await fetch(`${API_URL}/asistencia/generar-token`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setQrToken(data.token);
        setTimeLeft(30);
      }
    } catch (err) {
      console.error("Error al obtener token QR:", err);
    } finally {
      setQrLoading(false);
    }
  };

  // 3. CARGAR HISTORIAL (Global para Admin, Personal para Staff)
  const cargarHistorial = async () => {
    setLoadingLogs(true);
    setLogsError("");
    try {
      const endpoint = isAdmin ? "/asistencia/historial-global" : "/asistencia/historial-personal";
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data || []);
      } else {
        setLogsError(sanitizarError(data.message));
      }
    } catch (err) {
      setLogsError("Error al conectar con el servidor.");
    } finally {
      setLoadingLogs(false);
    }
  };

  // 4. CARGAR REPORTE MENSUAL (CON DIFERENCIA DE TIEMPOS)
  const cargarReporteMensual = async (isManualClick = false) => {
    if (!selectedMonthPersonalId) {
      if (isManualClick) {
        setMonthlyReportError("Debe seleccionar un empleado para generar el reporte.");
      }
      return;
    }
    
    if (!selectedMonthPart || !selectedYearPart) {
      if (isManualClick) {
        setMonthlyReportError("Debe seleccionar un mes y un año válidos.");
      }
      return;
    }
    
    setLoadingMonthlyReport(true);
    setMonthlyReportError("");
    setMonthlyReportData([]);
    
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      
      const res = await fetch(`${API_URL}/asistencia/reporte-mensual?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      const data = await res.json();
      if (data.success) {
        setMonthlyReportData(data.data || []);
      } else {
        setMonthlyReportError(sanitizarError(data.message));
      }
    } catch (err) {
      setMonthlyReportError("Error al conectar con el servidor.");
    } finally {
      setLoadingMonthlyReport(false);
    }
  };

  const exportarPDF = async () => {
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      const res = await fetch(`${API_URL}/asistencia/exportar/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Error al descargar PDF");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Asistencia_${selectedYearPart}_${selectedMonthPart}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Error al exportar PDF: " + e.message);
    }
  };

  const exportarExcel = async () => {
    try {
      const mesString = `${selectedYearPart}-${selectedMonthPart}`;
      const params = new URLSearchParams({
        id_personal: selectedMonthPersonalId,
        mes: mesString
      });
      const res = await fetch(`${API_URL}/asistencia/exportar/excel?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      if (!res.ok) throw new Error("Error al descargar Excel");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Reporte_Asistencia_${selectedYearPart}_${selectedMonthPart}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("Error al exportar Excel: " + e.message);
    }
  };

  useEffect(() => {
    if (activeTab === "historial") {
      cargarHistorial();
    } else if (activeTab === "reporte") {
      if (selectedMonthPersonalId) {
        cargarReporteMensual(false);
      }
    }
  }, [activeTab, selectedMonthPersonalId]);

  // 5. INICIAR/DETENER CÁMARA PARA ESCANEAR
  const iniciarEscaneo = () => {
    if (!scannerLoaded) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      try {
        const html5QrCode = new window.Html5Qrcode("reader");
        setScannerInstance(html5QrCode);
        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScannerInstance(null);
              
              let token = decodedText;
              if (decodedText.includes("checkin_token=")) {
                const urlParams = new URLSearchParams(decodedText.split("?")[1]);
                token = urlParams.get("checkin_token");
              }
              
              registrarAsistencia(token);
            }).catch(console.error);
          },
          () => {}
        ).catch((err) => {
          console.error("Error al iniciar cámara:", err);
          alert("No se pudo acceder a la cámara. Asegúrese de otorgar permisos.");
          setIsScanning(false);
        });
      } catch (e) {
        console.error(e);
        setIsScanning(false);
      }
    }, 150);
  };

  const detenerEscaneo = () => {
    if (scannerInstance) {
      scannerInstance.stop().then(() => {
        setIsScanning(false);
        setScannerInstance(null);
      }).catch(console.error);
    } else {
      setIsScanning(false);
    }
  };

  // 6. REGISTRAR ASISTENCIA EN EL BACKEND
  const registrarAsistencia = async (token) => {
    setSubmittingCheckin(true);
    setScanResult(null);
    try {
      const res = await fetch(`${API_URL}/asistencia/marcar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success) {
        setScanResult({ success: true, message: data.message });
      } else {
        setScanResult({ success: false, message: data.message || "Error al registrar marca." });
      }
    } catch (err) {
      setScanResult({ success: false, message: "Error de red al registrar asistencia." });
    } finally {
      setSubmittingCheckin(false);
    }
  };

  const getQRUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/panel?checkin_token=${qrToken}`;
  };

  const getTipoBadge = (tipo) => {
    return tipo === "ENTRADA" 
      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
      : "bg-orange-100 text-orange-700 border border-orange-200";
  };



  const filteredLogs = logs.filter((log) => {
    if (!filterName.trim()) return true;
    return log.nombre_empleado?.toLowerCase().includes(filterName.toLowerCase());
  });

  const calcularEstadisticas = () => {
    let completedShifts = 0;
    let totalMinutes = 0;
    let incompleteCount = 0;

    monthlyReportData.forEach((item) => {
      const dur = item.duracion || "";
      if (item.entrada && item.salida && dur.includes("h")) {
        completedShifts += 1;
        try {
          const parts = dur.split(" ");
          const h = parseInt(parts[0].replace("h", ""), 10);
          const m = parseInt(parts[1].replace("m", ""), 10);
          totalMinutes += (h * 60) + m;
        } catch (e) {
          // Ignorar errores de parsing
        }
      } else {
        incompleteCount += 1;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const totalTimeStr = `${hours}h ${mins}m`;

    return { completedShifts, totalTimeStr, incompleteCount };
  };

  const stats = calcularEstadisticas();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto animate-fade-in space-y-6">
      
      {/* Título de Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#2A5C4D] tracking-tighter italic font-sans">
            Control de Asistencia
          </h2>
          <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest font-sans">
            Registro de entrada y salida por Código QR - Clínica Alba
          </p>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b border-gray-100 mb-6 bg-white p-2 rounded-2xl shadow-sm gap-2">
        {isAdmin && (
          <button
            onClick={() => setActiveTab("proyectar")}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === "proyectar"
                ? "bg-[#148F77] text-white shadow-md"
                : "text-gray-400 hover:bg-emerald-50/50 hover:text-[#148F77]"
            }`}
          >
            Proyectar Código QR
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={() => setActiveTab("escanear")}
            className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === "escanear"
                ? "bg-[#148F77] text-white shadow-md"
                : "text-gray-400 hover:bg-emerald-50/50 hover:text-[#148F77]"
            }`}
          >
            Registrar Marca (Escanear)
          </button>
        )}
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "historial"
              ? "bg-[#148F77] text-white shadow-md"
              : "text-gray-400 hover:bg-emerald-50/50 hover:text-[#148F77]"
          }`}
        >
          {isAdmin ? "Historial General" : "Mi Historial"}
        </button>
        <button
          onClick={() => setActiveTab("reporte")}
          className={`flex-1 py-3.5 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "reporte"
              ? "bg-[#148F77] text-white shadow-md"
              : "text-gray-400 hover:bg-emerald-50/50 hover:text-[#148F77]"
          }`}
        >
          Reporte Mensual
        </button>
      </div>

      {/* ── SECCIÓN 1: PROYECTAR QR (ADMINISTRADOR) ── */}
      {activeTab === "proyectar" && isAdmin && (
        <div className="flex flex-col items-center bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-50 max-w-lg mx-auto text-center space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-black text-[#2A5C4D] tracking-tight uppercase">
              Asistencia Diaria
            </h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1 leading-relaxed">
              ESCANEÉ ESTE CÓDIGO CON LA CÁMARA DE SU CELULAR PARA MARCAR SU INGRESO O SALIDA
            </p>
          </div>

          <div className="relative w-80 h-80 bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200 p-4 mx-auto">
            {qrLoading && !qrToken ? (
              <div className="w-10 h-10 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
            ) : qrToken ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(getQRUrl())}`}
                alt="Código QR de Asistencia"
                className="w-full h-full rounded-2xl shadow-sm transition-opacity duration-300"
              />
            ) : (
              <p className="text-xs text-gray-400 font-bold uppercase">Sin Token Activo</p>
            )}
          </div>

          <div className="flex flex-col items-center space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#148F77] bg-emerald-50 px-4 py-2 rounded-full border border-emerald-100">
              Expira en: {timeLeft} segundos
            </span>
            <button
              onClick={obtenerNuevoToken}
              className="text-xs font-bold text-gray-400 hover:text-[#148F77] hover:underline cursor-pointer"
            >
              Fuerza renovación
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(getQRUrl());
                alert("Enlace del QR copiado. Pégalo en la barra de direcciones de la pestaña del empleado para simular el escaneo.");
              }}
              className="text-[9px] font-black uppercase tracking-wider text-teal-600 hover:text-teal-700 hover:underline mt-2 cursor-pointer"
            >
              [Copiar Enlace de Prueba]
            </button>
          </div>
        </div>
      )}

      {/* ── SECCIÓN 2: ESCANEAR QR (STAFF) ── */}
      {activeTab === "escanear" && !isAdmin && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg mx-auto text-center space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-black text-[#2A5C4D] tracking-tight uppercase">
              Registrar Asistencia
            </h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">
              ESCANEE EL CÓDIGO QR EN LA RECEPCIÓN PARA MARCAR SU ASISTENCIA
            </p>
          </div>

          {/* Área de Cámara */}
          {isScanning ? (
            <div className="space-y-4">
              <div
                id="reader"
                className="overflow-hidden rounded-3xl border-2 border-[#148F77] bg-black shadow-md mx-auto w-full max-w-sm"
              ></div>
              <button
                onClick={detenerEscaneo}
                className="px-6 py-3 bg-rose-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all hover:bg-rose-700 cursor-pointer"
              >
                Cancelar Escaneo
              </button>
            </div>
          ) : (
            <div className="py-6 flex flex-col items-center gap-4">
              <div className="p-8 bg-emerald-50 rounded-full text-[#148F77]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <button
                onClick={iniciarEscaneo}
                className="px-8 py-4 bg-[#148F77] text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-[#117A65] cursor-pointer"
              >
                Activar Cámara
              </button>
            </div>
          )}

          {/* Indicador de Carga al enviar la marca */}
          {submittingCheckin && (
            <div className="p-4 bg-emerald-50 text-[#148F77] rounded-2xl text-xs font-bold animate-pulse flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
              Registrando marca de asistencia...
            </div>
          )}

          {/* Resultado de la Lectura */}
          {scanResult && (
            <div
              className={`p-5 rounded-2xl text-xs font-black uppercase tracking-wider border text-center ${
                scanResult.success
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <p className="text-sm font-black mb-1">{scanResult.success ? "✓ ¡Éxito!" : "✗ Error"}</p>
              <p className="font-semibold text-[10px] text-gray-500 lowercase first-letter:uppercase">{scanResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* ── SECCIÓN 3: TABLA DE HISTORIAL DIARIO (COMPARTIDA) ── */}
      {activeTab === "historial" && (
        <div className="space-y-4 animate-fade-in w-full">
          
          {/* Barra de Filtros (Solo para el Admin) */}
          {isAdmin && (
            <div className="flex gap-4 items-end bg-white p-5 rounded-3xl shadow-sm border border-gray-50">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Filtrar por Empleado</label>
                <input
                  type="text"
                  placeholder="Ej: Dr. Pérez..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          )}

          {logsError && (
            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500 animate-shake">
              {logsError}
            </div>
          )}

          {/* Tabla de registros (Ancho completo) */}
          <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#2A5C4D] text-white">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Fecha y Hora</th>
                    {isAdmin && (
                      <th className="p-5 text-[10px] font-black uppercase tracking-widest">Empleado</th>
                    )}
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Tipo</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Autorizado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="p-20 text-center">
                        <div className="flex justify-center space-x-2 animate-pulse">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <tr key={log.id_asistencia} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-5 text-xs font-bold text-gray-500">{log.fecha_registro}</td>
                        {isAdmin && (
                          <td className="p-5 text-xs font-black text-[#2A5C4D] uppercase">
                            {log.nombre_empleado}
                          </td>
                        )}
                        <td className="p-5">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${getTipoBadge(log.tipo)}`}>
                            {log.tipo}
                          </span>
                        </td>
                        <td className="p-5 text-xs font-bold text-gray-400 uppercase">{log.nombre_creador}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={isAdmin ? 4 : 3}
                        className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic"
                      >
                        Sin marcas de asistencia encontradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── SECCIÓN 4: REPORTE MENSUAL EMPAREJADO (NUEVA TAB) ── */}
      {activeTab === "reporte" && (
        <div className="space-y-4 animate-fade-in w-full">
          
          {/* Panel de Filtros */}
          <div className="bg-white p-5 rounded-[2rem] shadow-md border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
            
            {/* Filtro Empleado (Solo Admin) */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Seleccionar Empleado</label>
              {isAdmin ? (
                <select
                  value={selectedMonthPersonalId}
                  onChange={(e) => setSelectedMonthPersonalId(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
                >
                  <option value="">-- Seleccionar --</option>
                  {personalList.map((s) => (
                    <option key={s.id_personal} value={s.id_personal}>
                      {s.nombre} ({s.cargo})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  readOnly
                  value={user?.nombre || "Mi Perfil"}
                  className="w-full p-3 bg-gray-100 rounded-xl text-xs font-bold border-none outline-none text-gray-500 cursor-not-allowed"
                />
              )}
            </div>

            {/* Filtro Mes */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Mes</label>
              <select
                value={selectedMonthPart}
                onChange={(e) => setSelectedMonthPart(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
              >
                {mesesList.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Filtro Año */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Año</label>
              <select
                value={selectedYearPart}
                onChange={(e) => setSelectedYearPart(e.target.value)}
                className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200 cursor-pointer"
              >
                {añosList.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Botón de Carga */}
            <button
              onClick={() => cargarReporteMensual(true)}
              disabled={loadingMonthlyReport}
              className="w-full p-3.5 bg-[#148F77] text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-[#117A65] transition-all disabled:opacity-50 cursor-pointer"
            >
              {loadingMonthlyReport ? "Generando..." : "Generar Reporte"}
            </button>
          </div>

          {monthlyReportError && (
            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500 animate-shake">
              {monthlyReportError}
            </div>
          )}

          {/* Tarjetas Estadísticas Resumen (Solo si hay datos en pantalla) */}
          {monthlyReportData.length > 0 && !loadingMonthlyReport && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
              {/* CARD 1: Turnos Completados */}
              <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-[#148F77]/10 text-[#148F77] rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Turnos Completados</span>
                  <span className="text-lg font-black text-[#2A5C4D]">{stats.completedShifts} turnos</span>
                </div>
              </div>

              {/* CARD 2: Horas Trabajadas */}
              <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="p-3 bg-[#148F77]/10 text-[#148F77] rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Tiempo Total Trabajado</span>
                  <span className="text-lg font-black text-[#2A5C4D]">{stats.totalTimeStr}</span>
                </div>
              </div>

              {/* CARD 3: Marcas Incompletas */}
              <div className="bg-[#F4F9F9] border border-[#E4EFEF] p-5 rounded-3xl flex items-center gap-4 shadow-sm">
                <div className={`p-3 rounded-2xl ${stats.incompleteCount > 0 ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Marcas Incompletas</span>
                  <span className={`text-lg font-black ${stats.incompleteCount > 0 ? "text-amber-600" : "text-emerald-700"}`}>
                    {stats.incompleteCount} {stats.incompleteCount === 1 ? "registro" : "registros"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Botones de Exportación (solo si hay datos) */}
          {monthlyReportData.length > 0 && !loadingMonthlyReport && (
            <div className="flex gap-3 justify-end">
              <button
                onClick={exportarPDF}
                className="flex items-center gap-2 px-5 py-3.5 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-rose-700 shadow-md active:scale-95 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar PDF
              </button>
              <button
                onClick={exportarExcel}
                className="flex items-center gap-2 px-5 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-700 shadow-md active:scale-95 cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Exportar Excel
              </button>
            </div>
          )}

          {/* Tabla de Reporte Emparejado */}
          <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#2A5C4D] text-white">
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Entrada (Marcado)</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Salida (Marcado)</th>
                    <th className="p-5 text-[10px] font-black uppercase tracking-widest">Duración de la Jornada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingMonthlyReport ? (
                    <tr>
                      <td colSpan="3" className="p-20 text-center">
                        <div className="flex justify-center space-x-2 animate-pulse">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        </div>
                      </td>
                    </tr>
                  ) : monthlyReportData.length > 0 ? (
                    monthlyReportData.map((item, idx) => {
                      const isWarning = !item.entrada || !item.salida;
                      return (
                        <tr key={idx} className="hover:bg-emerald-50/10 transition-colors">
                          {/* Entrada */}
                          <td className="p-5 text-xs font-semibold">
                            {item.entrada ? (
                              <span className="text-gray-700 font-bold">{item.entrada}</span>
                            ) : (
                              <span className="text-red-500 font-bold bg-red-50 px-2.5 py-1.5 rounded-lg border border-red-100">
                                {item.duracion}
                              </span>
                            )}
                          </td>
                          {/* Salida */}
                          <td className="p-5 text-xs font-semibold">
                            {item.salida ? (
                              <span className="text-gray-700 font-bold">{item.salida}</span>
                            ) : (
                              <span className="text-amber-600 font-bold bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100">
                                Sin marcar salida
                              </span>
                            )}
                          </td>
                          {/* Duración */}
                          <td className="p-5 text-xs font-black uppercase">
                            {isWarning ? (
                              <span className="text-gray-400 italic">Incompleto</span>
                            ) : (
                              <span className="text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 inline-block font-sans">
                                {item.duracion}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td
                        colSpan="3"
                        className="p-20 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic"
                      >
                        {!selectedMonthPersonalId 
                          ? "Seleccione un empleado para ver su reporte mensual." 
                          : "No hay marcas registradas para este período."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

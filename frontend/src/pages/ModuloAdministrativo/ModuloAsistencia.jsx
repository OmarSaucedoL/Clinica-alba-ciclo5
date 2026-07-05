import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido.";
  if (errorMsg.includes("CONTEXT:")) {
    return errorMsg.split("CONTEXT:")[0].replace("Error interno:", "").trim();
  }
  return errorMsg;
};

export default function ModuloAsistencia({ userRolId, user }) {
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

  useEffect(() => {
    if (activeTab === "historial") {
      cargarHistorial();
    }
  }, [activeTab]);

  // 4. INICIAR/DETENER CÁMARA PARA ESCANEAR
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
            // Detener escáner tras lectura exitosa
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              setScannerInstance(null);
              
              // Extraer token si es una URL completa o el token directamente
              let token = decodedText;
              if (decodedText.includes("checkin_token=")) {
                const urlParams = new URLSearchParams(decodedText.split("?")[1]);
                token = urlParams.get("checkin_token");
              }
              
              registrarAsistencia(token);
            }).catch(console.error);
          },
          () => {} // Ignorar errores de escaneo continuo
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

  // 5. REGISTRAR ASISTENCIA EN EL BACKEND
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

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto animate-fade-in space-y-6">
      
      {/* Título de Cabecera */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-[#2A5C4D] tracking-tighter italic">
            Control de Asistencia
          </h2>
          <p className="text-gray-400 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
            Registro de entrada y salida por Código QR - Clínica Alba
          </p>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex border-b border-gray-100 mb-6 bg-white p-2 rounded-2xl shadow-sm">
        {isAdmin && (
          <button
            onClick={() => setActiveTab("proyectar")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === "proyectar"
                ? "bg-[#148F77] text-white shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Proyectar Código QR
          </button>
        )}
        {!isAdmin && (
          <button
            onClick={() => setActiveTab("escanear")}
            className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
              activeTab === "escanear"
                ? "bg-[#148F77] text-white shadow-md"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            Registrar Marca (Escanear)
          </button>
        )}
        <button
          onClick={() => setActiveTab("historial")}
          className={`flex-1 py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === "historial"
              ? "bg-[#148F77] text-white shadow-md"
              : "text-gray-400 hover:text-gray-600"
          }`}
        >
          {isAdmin ? "Historial General" : "Mi Historial"}
        </button>
      </div>

      {/* ── SECCIÓN 1: PROYECTAR QR (ADMINISTRADOR) ── */}
      {activeTab === "proyectar" && isAdmin && (
        <div className="flex flex-col items-center bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-50 max-w-md mx-auto text-center space-y-6 animate-fade-in">
          <div>
            <h3 className="text-lg font-black text-[#2A5C4D] tracking-tight uppercase">
              Asistencia Diaria
            </h3>
            <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1 leading-relaxed">
              ESCANEÉ ESTE CÓDIGO CON LA CÁMARA DE SU CELULAR PARA MARCAR SU INGRESO O SALIDA
            </p>
          </div>

          <div className="relative w-72 h-72 bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200 p-4">
            {qrLoading && !qrToken ? (
              <div className="w-10 h-10 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
            ) : qrToken ? (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(getQRUrl())}`}
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
        <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-md mx-auto text-center space-y-6 animate-fade-in">
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

      {/* ── SECCIÓN 3: TABLA DE HISTORIAL (COMPARTIDA) ── */}
      {activeTab === "historial" && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Barra de Filtros (Solo para el Admin) */}
          {isAdmin && (
            <div className="flex gap-4 items-end bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
              <div className="flex-1 space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Filtrar por Empleado</label>
                <input
                  type="text"
                  placeholder="Ej: Dr. Pérez..."
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-200"
                />
              </div>
            </div>
          )}

          {logsError && (
            <div className="p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border-l-4 border-red-500">
              {logsError}
            </div>
          )}

          {/* Tabla de registros */}
          <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-[#2A5C4D] text-white">
                    <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Fecha y Hora</th>
                    {isAdmin && (
                      <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Empleado</th>
                    )}
                    <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Tipo</th>
                    <th className="p-4 sm:p-5 text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Autorizado Por</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingLogs ? (
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3} className="p-16 text-center">
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
                        <td className="p-4 sm:p-5 text-xs font-bold text-gray-400">{log.fecha_registro}</td>
                        {isAdmin && (
                          <td className="p-4 sm:p-5 text-xs font-black text-[#2A5C4D] uppercase">
                            {log.nombre_empleado}
                          </td>
                        )}
                        <td className="p-4 sm:p-5">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${getTipoBadge(log.tipo)}`}>
                            {log.tipo}
                          </span>
                        </td>
                        <td className="p-4 sm:p-5 text-xs font-bold text-gray-500 uppercase">{log.nombre_creador}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={isAdmin ? 4 : 3}
                        className="p-16 text-center text-gray-300 font-black uppercase text-xs tracking-widest italic"
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
    </div>
  );
}

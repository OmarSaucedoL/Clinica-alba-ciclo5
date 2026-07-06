import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function TabEscanearQR({ user }) {
  const [scannerLoaded, setScannerLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInstance, setScannerInstance] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);

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

    return () => {
      // Nettoyage si necessaire
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scannerInstance) {
        scannerInstance.stop().catch(console.error);
      }
    };
  }, [scannerInstance]);

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

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-gray-100 max-w-lg mx-auto text-center space-y-6 animate-fade-in">
      <div>
        <h3 className="text-lg font-black text-[#2A5C4D] tracking-tight uppercase">
          Registrar Asistencia
        </h3>
        <p className="text-[10px] text-gray-400 font-bold tracking-wider mt-1">
          ESCANEE EL CÓDIGO QR EN LA RECEPCIÓN PARA MARCAR SU ASISTENCIA
        </p>
      </div>

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

      {submittingCheckin && (
        <div className="p-4 bg-emerald-50 text-[#148F77] rounded-2xl text-xs font-bold animate-pulse flex items-center justify-center gap-2">
          <div className="w-4 h-4 border-2 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
          Registrando marca de asistencia...
        </div>
      )}

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
  );
}

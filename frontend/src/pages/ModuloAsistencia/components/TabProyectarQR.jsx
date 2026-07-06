import { useState, useEffect, useRef } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function TabProyectarQR({ user }) {
  const [qrToken, setQrToken] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef(null);

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

  useEffect(() => {
    obtenerNuevoToken();

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          obtenerNuevoToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const getQRUrl = () => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/panel?checkin_token=${qrToken}`;
  };

  return (
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
  );
}

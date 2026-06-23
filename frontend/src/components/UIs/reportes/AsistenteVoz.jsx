import React, { useState, useEffect } from "react";

export default function AsistenteVoz({ setActiveMenu, userRolId }) {
  const [listening, setListening] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [supported, setSupported] = useState(true);

  // Web Speech API references
  let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;

  if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "es-BO";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
  }

  useEffect(() => {
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const hablar = (mensaje) => {
    if (window.speechSynthesis) {
      // Cancel previous speech to prevent overlapping
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(mensaje);
      utterance.lang = "es-ES";
      window.speechSynthesis.speak(utterance);
    }
  };

  const listar_reportes = () => {
    let reportesDisponibles = [];
    
    // Citas report is available for Admin (1), Odontologo (2), Recepcionista (4)
    if ([1, 2, 4].includes(Number(userRolId))) {
      reportesDisponibles.push("Citas");
    }
    // Admin (1) has all reports
    if (Number(userRolId) === 1) {
      reportesDisponibles.push("Pacientes", "Finanzas", "Inventario", "Administración");
    }

    const mensaje = `Los reportes disponibles para su nivel de acceso son: ${reportesDisponibles.join(", ")}.`;
    setStatusText(mensaje);
    hablar(mensaje);
  };

  const generar_reporte = (modulo) => {
    const modClean = modulo.toLowerCase().trim();
    let menuTarget = null;
    let spokenResponse = "";

    if (modClean.includes("cita")) {
      if ([1, 2, 4].includes(Number(userRolId))) {
        menuTarget = "Reporte Citas";
        spokenResponse = "Generando reporte de citas";
      } else {
        spokenResponse = "No tiene permisos para acceder al reporte de citas";
      }
    } else if (modClean.includes("paciente")) {
      if (Number(userRolId) === 1) {
        menuTarget = "Reporte Pacientes";
        spokenResponse = "Generando reporte de pacientes";
      } else {
        spokenResponse = "Acceso denegado al reporte de pacientes";
      }
    } else if (modClean.includes("finanza") || modClean.includes("financiero") || modClean.includes("dinero") || modClean.includes("pago")) {
      if (Number(userRolId) === 1) {
        menuTarget = "Reporte Finanzas";
        spokenResponse = "Generando reporte financiero";
      } else {
        spokenResponse = "Acceso denegado al reporte financiero";
      }
    } else if (modClean.includes("inventario") || modClean.includes("logistica") || modClean.includes("material")) {
      if (Number(userRolId) === 1) {
        menuTarget = "Reporte Inventario";
        spokenResponse = "Generando reporte de inventario";
      } else {
        spokenResponse = "Acceso denegado al reporte de inventario";
      }
    } else if (modClean.includes("administracion") || modClean.includes("administrativo") || modClean.includes("sala") || modClean.includes("servicio")) {
      if (Number(userRolId) === 1) {
        menuTarget = "Reporte Administración";
        spokenResponse = "Generando reporte administrativo";
      } else {
        spokenResponse = "Acceso denegado al reporte administrativo";
      }
    }

    if (menuTarget) {
      setStatusText(spokenResponse);
      hablar(spokenResponse);
      setActiveMenu(menuTarget);
    } else if (spokenResponse) {
      setStatusText(spokenResponse);
      hablar(spokenResponse);
    } else {
      const errorMsg = `No se reconoció el reporte ${modulo}. Diga: Listar reportes, para conocer las opciones.`;
      setStatusText(errorMsg);
      hablar(errorMsg);
    }
  };

  const iniciarReconocimiento = () => {
    if (!recognition) {
      setStatusText("Reconocimiento de voz no soportado en este navegador.");
      return;
    }

    setListening(true);
    setStatusText("Escuchando... Hable ahora");
    
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setStatusText(`Escuché: "${transcript}"`);
      
      const transcriptLower = transcript.toLowerCase();

      if (transcriptLower.includes("listar reportes") || transcriptLower.includes("qué reportes") || transcriptLower.includes("que reportes")) {
        listar_reportes();
      } else if (transcriptLower.includes("generame reportes de") || transcriptLower.includes("generarme reportes de") || transcriptLower.includes("genera reporte de") || transcriptLower.includes("generar reporte de")) {
        // Extract the module name
        const match = transcriptLower.match(/(?:generame reportes de|generarme reportes de|genera reporte de|generar reporte de)\s+(.+)/);
        if (match && match[1]) {
          generar_reporte(match[1]);
        } else {
          hablar("Por favor especifique qué reporte desea generar.");
        }
      } else {
        // Fallback search for report keywords
        if (transcriptLower.includes("cita")) {
          generar_reporte("citas");
        } else if (transcriptLower.includes("paciente")) {
          generar_reporte("pacientes");
        } else if (transcriptLower.includes("finanza") || transcriptLower.includes("financiero")) {
          generar_reporte("finanzas");
        } else if (transcriptLower.includes("inventario")) {
          generar_reporte("inventario");
        } else if (transcriptLower.includes("administracion") || transcriptLower.includes("administrativo")) {
          generar_reporte("administracion");
        } else {
          hablar("Comando no reconocido. Diga: Generame reportes de, seguido del módulo.");
        }
      }
    };

    recognition.onerror = (event) => {
      console.error(event.error);
      setStatusText(`Error de voz: ${event.error}`);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };
  };

  if (!supported) {
    return null;
  }

  return (
    <div className="flex flex-col items-end gap-2 text-xs font-semibold print:hidden">
      <div className="flex items-center gap-2">
        {statusText && (
          <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 max-w-xs truncate">
            {statusText}
          </span>
        )}
        <button
          onClick={iniciarReconocimiento}
          disabled={listening}
          className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all border shadow-sm cursor-pointer ${
            listening
              ? "bg-red-50 text-red-500 border-red-200 animate-pulse"
              : "bg-emerald-50 text-[#148F77] border-emerald-100 hover:bg-emerald-100"
          }`}
        >
          {listening ? "Escuchando..." : "Comando por Voz"}
        </button>
      </div>
    </div>
  );
}

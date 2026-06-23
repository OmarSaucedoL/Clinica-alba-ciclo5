import { useState } from "react";
import Dientes from "./Dientes";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloOdontograma() {

  // ================= STATES =================
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [paciente, setPaciente] = useState(null);
  const [pacienteNombre, setPacienteNombre] = useState("");
  const [data, setData] = useState([]);
  const [dienteSeleccionado, setDienteSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);

  const [modo, setModo] = useState(null);
  const [eventoActual, setEventoActual] = useState(null);

  const [formulario, setFormulario] = useState({
    id_servicio: "",
    descripcion: "",
  });

  // ================= MODAL =================
  const [modal, setModal] = useState(null);
  // modal: { type: 'alert'|'confirm', variant: 'error'|'warning'|'info',
  //          title, message, onConfirm? }

  const showAlert = (message, title = "Atención", variant = "error") =>
    new Promise((resolve) => {
      setModal({
        type: "alert",
        variant,
        title,
        message,
        onConfirm: () => { setModal(null); resolve(); },
      });
    });

  const showConfirm = (message, title = "¿Confirmar acción?", variant = "warning") =>
    new Promise((resolve) => {
      setModal({
        type: "confirm",
        variant,
        title,
        message,
        onConfirm: () => { setModal(null); resolve(true);  },
        onCancel:  () => { setModal(null); resolve(false); },
      });
    });

  const MODAL_ICONS = { error: "❌", warning: "⚠️", info: "ℹ️" };

  // ================= HEADERS =================
  const getHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  });

  // ================= HELPERS =================
  const getTipoDiente = (n) => {
    if ([11,12,21,22,31,32,41,42].includes(n)) return "incisivo";
    if ([13,23,33,43].includes(n)) return "canino";
    return "molar";
  };

  const getArcPosition = (i, total, radius = 40) => {
    const mid = (total - 1) / 2;
    const t = (i - mid) / mid;
    return {
      x: (i - mid) * 23,
      y: Math.pow(t, 2) * radius,
    };
  };

  // ================= API =================
  const buscarPacientes = async (texto) => {
    setBusqueda(texto);
    if (!texto.trim()) return setPacientes([]);

    const res = await fetch(`${API_URL}/pacientes?nombre=${texto}`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    setPacientes(json.data || []);
  };

  const cargarOdontograma = async (id, nombre) => {
    setLoading(true);
    setPaciente(id);
    setPacienteNombre(nombre || "");
    setPacientes([]);
    setBusqueda("");

    const res = await fetch(`${API_URL}/pacientes/${id}/odontograma`, {
      headers: getHeaders(),
    });
    const json = await res.json();
    setData(json.data || []);
    setDienteSeleccionado(null);
    setLoading(false);
  };

  const agregarEvento = async () => {
    if (!paciente || !dienteSeleccionado) return;

    const res = await fetch(`${API_URL}/pacientes/${paciente}/odontograma`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({
        id_servicio: formulario.id_servicio,
        descripcion: formulario.descripcion,
        codigo_diente: dienteSeleccionado,
      }),
    });
    const json = await res.json();

    if (json.success) {
      await cargarOdontograma(paciente, pacienteNombre);
      setFormulario({ id_servicio: "", descripcion: "" });
      setModo(null);
    } else {
      await showAlert(json.message, "No se pudo agregar", "error");
    }
  };

  const editarEvento = async () => {
    if (!eventoActual) return;

    const res = await fetch(`${API_URL}/odontograma/${eventoActual.id_odontograma}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({
        descripcion: formulario.descripcion,
        codigo_diente: dienteSeleccionado,
      }),
    });
    const json = await res.json();

    if (json.success) {
      await cargarOdontograma(paciente, pacienteNombre);
      setModo(null);
      setEventoActual(null);
    } else {
      await showAlert(json.message, "No se pudo editar", "error");
    }
  };

  const eliminarEvento = async (id) => {
    const confirmado = await showConfirm(
      "Esta acción no se puede deshacer. ¿Deseas eliminar este registro?",
      "Eliminar evento",
      "warning"
    );
    if (!confirmado) return;

    const res = await fetch(`${API_URL}/odontograma/${id}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    const json = await res.json();

    if (json.success) {
      await cargarOdontograma(paciente, pacienteNombre);
    } else {
      await showAlert(json.message, "No se pudo eliminar", "error");
    }
  };

  const teeth = (data || []).reduce((acc, item) => {
    const key = item?.codigo_diente;
    if (!key) return acc;
    acc[key] = acc[key] || [];
    acc[key].push(item);
    return acc;
  }, {});

  const arcadaSuperior = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
  const arcadaInferior = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

  const renderDiente = (n) => (
    <div
      key={n}
      style={{
        outline: dienteSeleccionado === n ? "2px solid #0EA5E9" : "none",
        outlineOffset: 2,
        borderRadius: 6,
        transition: "outline 0.15s",
      }}
    >
      <Dientes
        number={n}
        type={getTipoDiente(n)}
        events={teeth[n] || []}
        onClick={(num) => setDienteSeleccionado(num)}
      />
    </div>
  );

  const eventosDiente = dienteSeleccionado
    ? (teeth[dienteSeleccionado] || [])
    : [];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        .odo-page *, .odo-page *::before, .odo-page *::after {
          box-sizing: border-box;
        }
        .odo-modal-overlay *, .odo-modal-overlay *::before, .odo-modal-overlay *::after {
          box-sizing: border-box;
        }

        .odo-page {
          font-family: 'Inter', sans-serif;
          background: #F0F4F8;
          min-height: 100vh;
          padding: 20px 16px 40px;
        }

        /* ── HEADER ── */
        .odo-header {
          background: linear-gradient(135deg, #1E3A5F 0%, #1a5276 100%);
          border-radius: 16px;
          padding: 20px 24px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 16px;
          color: white;
          box-shadow: 0 4px 20px rgba(30,58,95,0.3);
        }
        .odo-header-icon {
          width: 48px; height: 48px;
          background: rgba(255,255,255,0.15);
          border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          flex-shrink: 0;
        }
        .odo-header h1 {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.3px;
        }
        .odo-header-sub {
          font-size: 13px;
          opacity: 0.7;
          margin-top: 2px;
        }
        .odo-patient-badge {
          margin-left: auto;
          background: rgba(14,165,233,0.25);
          border: 1px solid rgba(14,165,233,0.5);
          color: #7dd3fc;
          font-size: 12px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 999px;
          white-space: nowrap;
        }

        /* ── CARD ── */
        .odo-card {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 16px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.06);
        }

        /* ── BUSCADOR ── */
        .odo-search-wrap { position: relative; }
        .odo-search-icon {
          position: absolute;
          left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 16px;
          pointer-events: none;
        }
        .odo-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .odo-input:focus {
          border-color: #0EA5E9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }
        .odo-suggestions {
          margin-top: 8px;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.08);
        }
        .odo-suggestion-item {
          padding: 13px 16px;
          cursor: pointer;
          font-size: 14px;
          color: #1e293b;
          transition: background 0.12s;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .odo-suggestion-item:not(:last-child) {
          border-bottom: 1px solid #f1f5f9;
        }
        .odo-suggestion-item:hover { background: #f8fafc; }
        .odo-suggestion-item b { font-weight: 600; }
        .odo-suggestion-ci {
          font-size: 12px;
          color: #94a3b8;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 999px;
        }

        /* ── ODONTOGRAMA ── */
        .odo-chart-section { }
        .odo-chart-label {
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          text-align: center;
          margin-bottom: 4px;
        }
        .odo-arcada-container {
          width: 100%;
          display: flex;
          justify-content: center;
          overflow-x: auto;
          padding: 4px 0;
        }
        .odo-arcada {
          position: relative;
          width: 500px;
          height: 160px;
          flex-shrink: 0;
        }
        .odo-jaw-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }
        .odo-jaw-line {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        }
        .odo-jaw-text {
          font-size: 11px;
          color: #cbd5e1;
          font-weight: 500;
          white-space: nowrap;
        }

        /* ── DIENTE SELECCIONADO INFO ── */
        .odo-selected-info {
          background: linear-gradient(135deg, #eff6ff, #f0f9ff);
          border: 1.5px solid #bae6fd;
          border-radius: 12px;
          padding: 12px 16px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .odo-selected-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: #0EA5E9;
          flex-shrink: 0;
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.3); }
        }
        .odo-selected-text {
          font-size: 13px;
          color: #0369a1;
          font-weight: 500;
        }
        .odo-no-selected {
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
          padding: 20px 0 4px;
        }

        /* ── BOTÓN AGREGAR ── */
        .odo-btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #0EA5E9, #0284c7);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
          box-shadow: 0 2px 8px rgba(14,165,233,0.35);
        }
        .odo-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(14,165,233,0.4);
        }
        .odo-btn-primary:active { transform: translateY(0); }
        .odo-btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .odo-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background 0.12s;
        }
        .odo-btn-ghost:hover { background: #e2e8f0; }

        .odo-btn-danger {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
          border-radius: 8px;
          padding: 7px 12px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background 0.12s;
        }
        .odo-btn-danger:hover { background: #fee2e2; }

        /* ── TABLA ── */
        .odo-table-section { margin-top: 20px; }
        .odo-table-title {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .odo-table-count {
          background: #f1f5f9;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .odo-table {
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          overflow: hidden;
        }
        .odo-table-header {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr 1fr;
          background: #1E3A5F;
          color: white;
          padding: 11px 16px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .odo-table-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1.5fr 1fr;
          padding: 13px 16px;
          font-size: 13px;
          color: #374151;
          align-items: center;
          transition: background 0.1s;
        }
        .odo-table-row:not(:last-child) {
          border-bottom: 1px solid #f1f5f9;
        }
        .odo-table-row:hover { background: #f8fafc; }
        .odo-cell-actions { display: flex; gap: 6px; flex-wrap: wrap; }
        .odo-date { font-size: 12px; color: #64748b; }
        .odo-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          background: linear-gradient(135deg, #0EA5E9, #0284c7);
          color: white;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        .odo-table-empty {
          padding: 32px 16px;
          text-align: center;
          color: #94a3b8;
          font-size: 13px;
        }

        /* ── FORMULARIO ── */
        .odo-form {
          margin-top: 16px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 14px;
          padding: 20px;
          animation: slideDown 0.18s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .odo-form-title {
          font-size: 15px;
          font-weight: 700;
          color: #1e293b;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .odo-form-icon {
          width: 28px; height: 28px;
          background: linear-gradient(135deg, #0EA5E9, #0284c7);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          color: white;
          font-size: 14px;
        }
        .odo-form-field { margin-bottom: 14px; }
        .odo-form-label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .odo-form-input {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
          background: white;
          transition: border-color 0.15s, box-shadow 0.15s;
          outline: none;
        }
        .odo-form-input:focus {
          border-color: #0EA5E9;
          box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
        }
        .odo-form-textarea {
          resize: vertical;
          min-height: 90px;
        }
        .odo-form-actions {
          display: flex;
          gap: 10px;
          margin-top: 18px;
          flex-wrap: wrap;
        }

        .odo-btn-save {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, #1E3A5F, #1a5276);
          color: white;
          border: none;
          border-radius: 10px;
          padding: 11px 20px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
          box-shadow: 0 2px 8px rgba(30,58,95,0.3);
        }
        .odo-btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(30,58,95,0.35);
        }
        .odo-btn-cancel {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: white;
          color: #64748b;
          border: 1.5px solid #e2e8f0;
          border-radius: 10px;
          padding: 11px 18px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background 0.12s;
        }
        .odo-btn-cancel:hover { background: #f1f5f9; }

        /* ── EMPTY STATE ── */
        .odo-empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #94a3b8;
        }
        .odo-empty-icon {
          font-size: 48px;
          margin-bottom: 16px;
          opacity: 0.4;
        }
        .odo-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #64748b;
          margin-bottom: 6px;
        }
        .odo-empty-sub { font-size: 13px; }

        /* ── LOADING ── */
        .odo-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
          color: #64748b;
        }
        .odo-spinner {
          width: 36px; height: 36px;
          border: 3px solid #e2e8f0;
          border-top-color: #0EA5E9;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── MODAL ── */
        .odo-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 16px;
          animation: odo-fade-in 0.15s ease;
        }
        @keyframes odo-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .odo-modal {
          background: white;
          border-radius: 18px;
          padding: 28px 24px 24px;
          width: 100%;
          max-width: 400px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.2);
          animation: odo-slide-up 0.18s ease;
        }
        @keyframes odo-slide-up {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
        .odo-modal-icon-wrap {
          width: 52px; height: 52px;
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          font-size: 24px;
          margin: 0 auto 16px;
        }
        .odo-modal-icon-wrap.error   { background: #fef2f2; }
        .odo-modal-icon-wrap.warning { background: #fffbeb; }
        .odo-modal-icon-wrap.info    { background: #eff6ff; }
        .odo-modal-title {
          font-size: 17px;
          font-weight: 700;
          color: #0f172a;
          text-align: center;
          margin-bottom: 8px;
        }
        .odo-modal-message {
          font-size: 14px;
          color: #64748b;
          text-align: center;
          line-height: 1.55;
          margin-bottom: 24px;
        }
        .odo-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .odo-modal-btn-confirm {
          flex: 1;
          padding: 11px 0;
          border: none;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: transform 0.12s, box-shadow 0.12s;
        }
        .odo-modal-btn-confirm.danger {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 2px 8px rgba(239,68,68,0.3);
        }
        .odo-modal-btn-confirm.danger:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(239,68,68,0.35);
        }
        .odo-modal-btn-confirm.primary {
          background: linear-gradient(135deg, #0EA5E9, #0284c7);
          color: white;
          box-shadow: 0 2px 8px rgba(14,165,233,0.3);
        }
        .odo-modal-btn-confirm.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 14px rgba(14,165,233,0.35);
        }
        .odo-modal-btn-cancel {
          flex: 1;
          padding: 11px 0;
          background: #f1f5f9;
          color: #475569;
          border: none;
          border-radius: 11px;
          font-size: 14px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          transition: background 0.12s;
        }
        .odo-modal-btn-cancel:hover { background: #e2e8f0; }

        /* ── RESPONSIVE ── */
        @media (max-width: 640px) {
          .odo-header { flex-wrap: wrap; gap: 10px; }
          .odo-patient-badge { margin-left: 0; }
          .odo-table-header,
          .odo-table-row {
            grid-template-columns: 1fr 1fr;
            row-gap: 6px;
          }
          .odo-table-header div:nth-child(n+3),
          .odo-table-row div:nth-child(n+3) {
            grid-column: span 1;
          }
          .odo-form-actions { flex-direction: column; }
          .odo-btn-save, .odo-btn-cancel { width: 100%; justify-content: center; }
        }
      `}</style>

      <div className="odo-page">

        {/* ── HEADER ── */}
        <div className="odo-header">
          <div className="odo-header-icon">🦷</div>
          <div>
            <h1>Odontograma Clínico</h1>
            <p className="odo-header-sub">Registro dental del paciente</p>
          </div>
          {paciente && (
            <div className="odo-patient-badge">
              {pacienteNombre || `ID ${paciente}`}
            </div>
          )}
        </div>

        {/* ── BUSCADOR ── */}
        <div className="odo-card">
          <div className="odo-search-wrap">
            <span className="odo-search-icon">🔍</span>
            <input
              className="odo-input"
              placeholder="Buscar paciente por nombre o CI..."
              value={busqueda}
              onChange={(e) => buscarPacientes(e.target.value)}
            />
          </div>

          {pacientes.length > 0 && (
            <div className="odo-suggestions">
              {pacientes.map((p) => (
                <div
                  key={p.id || p.id_paciente}
                  className="odo-suggestion-item"
                  onClick={() =>
                    cargarOdontograma(
                      p.id || p.id_paciente,
                      p.nombre
                    )
                  }
                >
                  <span style={{ fontSize: 16 }}>👤</span>
                  <b>{p.nombre}</b>
                  <span className="odo-suggestion-ci">{p.ci}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── ODONTOGRAMA ── */}
        {!paciente ? (
          <div className="odo-card">
            <div className="odo-empty-state">
              <div className="odo-empty-icon">🦷</div>
              <div className="odo-empty-title">Sin paciente seleccionado</div>
              <div className="odo-empty-sub">
                Busca un paciente para visualizar su odontograma
              </div>
            </div>
          </div>
        ) : loading ? (
          <div className="odo-card">
            <div className="odo-loading">
              <div className="odo-spinner" />
              <span>Cargando odontograma...</span>
            </div>
          </div>
        ) : (
          <div className="odo-card">

            {/* ARCADA SUPERIOR */}
            <div className="odo-chart-label">Arcada Superior</div>
            <div className="odo-arcada-container">
              <div className="odo-arcada">
                {arcadaSuperior.map((n, i) => {
                  const pos = getArcPosition(i, arcadaSuperior.length);
                  return (
                    <div
                      key={n}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "60px",
                        transform: `translateX(${pos.x}px) translateY(${-pos.y}px) scaleY(-1)`,
                      }}
                    >
                      {renderDiente(n)}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SEPARADOR */}
            <div className="odo-jaw-divider">
              <div className="odo-jaw-line" />
              <span className="odo-jaw-text">línea media</span>
              <div className="odo-jaw-line" />
            </div>

            {/* ARCADA INFERIOR */}
            <div className="odo-arcada-container">
              <div className="odo-arcada">
                {arcadaInferior.map((n, i) => {
                  const pos = getArcPosition(i, arcadaInferior.length);
                  return (
                    <div
                      key={n}
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "0px",
                        transform: `translateX(${pos.x}px) translateY(${pos.y}px)`,
                      }}
                    >
                      {renderDiente(n)}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="odo-chart-label" style={{ marginTop: 4 }}>Arcada Inferior</div>

            {/* INFO DIENTE */}
            {dienteSeleccionado ? (
              <div className="odo-selected-info">
                <div className="odo-selected-dot" />
                <span className="odo-selected-text">
                  Diente <strong>{dienteSeleccionado}</strong> seleccionado
                  {eventosDiente.length > 0
                    ? ` — ${eventosDiente.length} evento${eventosDiente.length > 1 ? "s" : ""} registrado${eventosDiente.length > 1 ? "s" : ""}`
                    : " — sin eventos"}
                </span>
              </div>
            ) : (
              <p className="odo-no-selected">
                Selecciona un diente para ver o agregar eventos
              </p>
            )}

            {/* BOTÓN AGREGAR */}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                className="odo-btn-primary"
                onClick={() => {
                  setModo("agregar");
                  setFormulario({ id_servicio: "", descripcion: "" });
                }}
                disabled={!dienteSeleccionado}
              >
                <span>＋</span> Agregar evento
              </button>
            </div>

            {/* TABLA */}
            {dienteSeleccionado && (
              <div className="odo-table-section">
                <div className="odo-table-title">
                  Historial del diente {dienteSeleccionado}
                  <span className="odo-table-count">{eventosDiente.length}</span>
                </div>
                <div className="odo-table">
                  <div className="odo-table-header">
                    <div>Acciones</div>
                    <div>Fecha</div>
                    <div>Evento</div>
                    <div>Descripción</div>
                  </div>

                  {eventosDiente.length === 0 ? (
                    <div className="odo-table-empty">
                      Sin eventos registrados para este diente
                    </div>
                  ) : (
                    eventosDiente.map((e, i) => (
                      <div key={i} className="odo-table-row">
                        <div className="odo-cell-actions">
                          {e.editable && (
                            <>
                              <button
                                className="odo-btn-ghost"
                                onClick={() => {
                                  setModo("editar");
                                  setEventoActual(e);
                                  setFormulario({
                                    id_servicio: "",
                                    descripcion: e.descripcion,
                                  });
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                className="odo-btn-danger"
                                onClick={() => eliminarEvento(e.id_odontograma)}
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
                        <div className="odo-date">{e.fecha}</div>
                        <div>
                          <span className="odo-badge">{e.tipo_evento}</span>
                        </div>
                        <div style={{ fontSize: 13, color: "#374151" }}>
                          {e.descripcion}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* FORMULARIO */}
            {modo && (
              <div className="odo-form">
                <div className="odo-form-title">
                  <div className="odo-form-icon">
                    {modo === "agregar" ? "＋" : "✏️"}
                  </div>
                  {modo === "agregar" ? "Nuevo evento" : "Editar evento"}
                </div>

                {modo === "agregar" && (
                  <div className="odo-form-field">
                    <label className="odo-form-label">ID Servicio</label>
                    <input
                      className="odo-form-input"
                      placeholder="Ej. 001"
                      value={formulario.id_servicio}
                      onChange={(e) =>
                        setFormulario({ ...formulario, id_servicio: e.target.value })
                      }
                    />
                  </div>
                )}

                <div className="odo-form-field">
                  <label className="odo-form-label">Descripción</label>
                  <textarea
                    className="odo-form-input odo-form-textarea"
                    placeholder="Describe el procedimiento o hallazgo..."
                    value={formulario.descripcion}
                    onChange={(e) =>
                      setFormulario({ ...formulario, descripcion: e.target.value })
                    }
                  />
                </div>

                <div className="odo-form-actions">
                  <button
                    className="odo-btn-save"
                    onClick={() => {
                      modo === "agregar" ? agregarEvento() : editarEvento();
                    }}
                  >
                    ✔ Guardar
                  </button>
                  <button className="odo-btn-cancel" onClick={() => setModo(null)}>
                    Cancelar
                  </button>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal && (
        <div
          className="odo-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              modal.onCancel ? modal.onCancel() : modal.onConfirm();
            }
          }}
        >
          <div className="odo-modal">
            <div className={`odo-modal-icon-wrap ${modal.variant}`}>
              {MODAL_ICONS[modal.variant]}
            </div>
            <div className="odo-modal-title">{modal.title}</div>
            <div className="odo-modal-message">{modal.message}</div>
            <div className="odo-modal-actions">
              {modal.type === "confirm" && (
                <button
                  className="odo-modal-btn-cancel"
                  onClick={modal.onCancel}
                >
                  Cancelar
                </button>
              )}
              <button
                className={`odo-modal-btn-confirm ${modal.type === "confirm" ? "danger" : "primary"}`}
                onClick={modal.onConfirm}
              >
                {modal.type === "confirm" ? "Sí, eliminar" : "Entendido"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
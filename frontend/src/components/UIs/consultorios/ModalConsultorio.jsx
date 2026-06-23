import React, { useState } from "react";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalConsultorio({ onClose, onSuccess, consultorioToEdit }) {
  const [nombre, setNombre] = useState(consultorioToEdit ? consultorioToEdit.nombre : "");
  const [tipoSala, setTipoSala] = useState(consultorioToEdit ? consultorioToEdit.tipo_sala : "GENERAL");
  const [estadoSala, setEstadoSala] = useState(consultorioToEdit ? consultorioToEdit.estado_sala : "ACTIVA");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const isEdit = !!consultorioToEdit;
      const url = isEdit 
        ? `${API_URL}/consultorios/${consultorioToEdit.id_sala}`
        : `${API_URL}/consultorios`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          nombre,
          tipo_sala: tipoSala,
          estado_sala: estadoSala,
          id_usuario: user?.id_usuario,
          id_sesion: user?.id_sesion,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      onSuccess();
    } catch (err) {
      setError(err.message || "Error al procesar el consultorio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col transform transition-all animate-fade-in-up">
        {/* ENCABEZADO */}
        <div className="bg-[#148F77] p-8 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
          >
            ✕
          </button>
          <h2 className="text-2xl font-black text-white italic tracking-tight">
            {consultorioToEdit ? "Editar Consultorio" : "Nuevo Consultorio"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-6">
          {error && (
            <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm font-bold border border-red-100 text-center animate-shake">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Nombre de la Sala
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Consultorio 1"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Tipo de Sala
            </label>
            <select
              value={tipoSala}
              onChange={(e) => setTipoSala(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:bg-white transition-all"
            >
              <option value="GENERAL">GENERAL</option>
              <option value="CIRUGIA">CIRUGÍA</option>
              <option value="RADIOLOGIA">RADIOLOGÍA</option>
              <option value="OTRO">OTRO</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
              Estado
            </label>
            <select
              value={estadoSala}
              onChange={(e) => setEstadoSala(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:bg-white transition-all"
            >
              <option value="ACTIVA">ACTIVA</option>
              <option value="INACTIVA">INACTIVA</option>
              <option value="MANTENIMIENTO">MANTENIMIENTO</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#148F77] hover:bg-[#0f6b59] text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform hover:-translate-y-0.5 mt-2 disabled:opacity-50"
          >
            {loading ? "PROCESANDO..." : consultorioToEdit ? "ACTUALIZAR" : "GUARDAR CONSULTORIO"}
          </button>
        </form>
      </div>
    </div>
  );
}

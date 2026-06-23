import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalProcedimiento({ procedure, onClose, onSuccess }) {
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const user = useAuthStore((state) => state.user);

  const isEdit = !!procedure;

  useEffect(() => {
    if (procedure) {
      setDescripcion(procedure.descripcion || "");
      setPrecio(procedure.precio !== undefined ? procedure.precio : "");
    }
  }, [procedure]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!descripcion.trim()) {
      setError("La descripción del procedimiento es obligatoria.");
      return;
    }
    if (precio === "" || isNaN(precio) || parseFloat(precio) < 0) {
      setError("El precio debe ser un número válido y no negativo.");
      return;
    }

    setLoading(true);
    setError(null);

    const url = isEdit ? `${API_URL}/procedimientos/${procedure.id}` : `${API_URL}/procedimientos`;
    const method = isEdit ? "PUT" : "POST";

    try {
      // 1. Guardar el procedimiento
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          descripcion: descripcion.trim(),
          precio: parseFloat(precio),
          id_usuario: user?.id_usuario,
          id_sesion: user?.id_sesion,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Error al guardar el procedimiento.");
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col transform transition-all">
        {/* HEADER */}
        <div className="bg-emerald-50 px-6 py-5 border-b border-emerald-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-[#148F77]">
              {isEdit ? "Modificar Procedimiento" : "Nuevo Procedimiento"}
            </h2>
            <p className="text-xs text-emerald-600/70 font-bold mt-1">
              {isEdit ? "Actualice la descripción y precio sugerido." : "Complete el formulario para dar de alta el procedimiento."}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-emerald-300 hover:text-emerald-500 transition-colors p-2 rounded-full hover:bg-emerald-100/50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-[#148F77] uppercase tracking-widest mb-1.5 ml-1">
                Descripción
              </label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Ej. Limpieza Dental, Extracción..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:border-[#148F77] transition-all font-semibold text-gray-700"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-black text-[#148F77] uppercase tracking-widest mb-1.5 ml-1">
                Precio (Bs)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
                placeholder="Ej. 200.00"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:border-[#148F77] transition-all font-semibold text-gray-700"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="mt-8 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-bold rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-[#148F77] hover:bg-[#0f6b59] text-white text-sm font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

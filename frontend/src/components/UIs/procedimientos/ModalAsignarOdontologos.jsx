import React, { useState, useEffect } from "react";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModalAsignarOdontologos({
  procedure,
  odontologos,
  onClose,
  onSuccess,
}) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const fetchAssigned = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_URL}/citas/odontologos-por-procedimiento/${procedure.id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const data = await res.json();
        if (data.success) {
          const ids = (data.data || []).map((o) => o.id_personal);
          setSelectedIds(ids);
        } else {
          throw new Error(
            data.message || "Error al obtener odontólogos asignados.",
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAssigned();
  }, [procedure]);

  const handleToggle = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(odontologos.map((doc) => doc.id));
  };

  const handleClearAll = () => {
    setSelectedIds([]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/procedimientos/${procedure.id}/odontologos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            odontologos_ids: selectedIds,
            id_usuario: user?.id_usuario,
            id_sesion: user?.id_sesion,
          }),
        },
      );

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Error al guardar asignaciones.");
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col transform transition-all max-h-[85vh]">
        {/* HEADER */}
        <div className="bg-emerald-50 px-6 py-5 border-b border-emerald-100 flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-xl font-black text-[#148F77]">
              Asignar Odontólogos
            </h2>
            <p className="text-xs text-emerald-600/70 font-bold mt-1">
              Procedimiento:{" "}
              <span className="text-[#2A5C4D]">{procedure.descripcion}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="text-emerald-300 hover:text-emerald-500 transition-colors p-2 rounded-full hover:bg-emerald-100/50"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2 shrink-0">
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12 text-[#148F77] font-bold text-sm">
              <svg
                className="animate-spin h-5 w-5 mr-3 text-[#148F77]"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Cargando odontólogos asignados...
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-2 shrink-0">
                <label className="block text-[11px] font-black text-[#148F77] uppercase tracking-widest ml-1">
                  Seleccionar Profesionales
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-[10px] font-black text-[#148F77] uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    Asignar a todos
                  </button>
                  <span className="text-gray-300 text-[10px]">|</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[10px] font-black text-red-500 uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    Remover a todos
                  </button>
                </div>
              </div>
              {odontologos.length > 0 ? (
                <div className="space-y-2 border border-gray-100 rounded-2xl p-4 bg-gray-50/20 max-h-60 overflow-y-auto">
                  {odontologos.map((doc) => {
                    const isChecked = selectedIds.includes(doc.id);
                    return (
                      <label
                        key={doc.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                          isChecked
                            ? "bg-emerald-50/30 border-emerald-100 text-[#2A5C4D]"
                            : "bg-white border-gray-100 hover:border-emerald-50 text-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggle(doc.id)}
                          className="w-4 h-4 text-[#148F77] focus:ring-[#148F77] border-gray-300 rounded cursor-pointer"
                        />
                        <span className="text-sm font-bold">{doc.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-400 font-medium italic p-4 text-center">
                  No hay odontólogos registrados en el sistema.
                </p>
              )}
            </div>
          )}
        </div>

        {/* ACTIONS */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-bold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 px-4 py-3 bg-[#148F77] hover:bg-[#0f6b59] text-white text-sm font-bold rounded-xl shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Guardando...
              </>
            ) : (
              "Guardar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

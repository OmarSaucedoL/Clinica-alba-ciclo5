import React, { useState, useEffect } from "react";
import ModalConsultorio from "./ModalConsultorio";
import DetallesConsultorio from "./DetallesConsultorio";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloConsultorios({ dataMaster, onRefresh }) {
  const [consultorios, setConsultorios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedConsultorio, setSelectedConsultorio] = useState(null);
  const [showDetallesModal, setShowDetallesModal] = useState(false);
  const [showNoPermissionModal, setShowNoPermissionModal] = useState(false);
  const [noPermissionMessage, setNoPermissionMessage] = useState("");

  const user = useAuthStore((state) => state.user);

  const fetchConsultorios = async () => {
    try {
      const res = await fetch(`${API_URL}/consultorios`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setConsultorios(data.data);
      }
    } catch (error) {
      console.error("Error fetching consultorios", error);
    }
  };

  useEffect(() => {
    fetchConsultorios();
  }, []);

  const filteredConsultorios = consultorios.filter((c) =>
    c.nombre?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleSuccess = () => {
    setShowAddModal(false);
    fetchConsultorios();
    if (onRefresh) onRefresh();
  };

  const handleDetallesSuccess = () => {
    setShowDetallesModal(false);
    setSelectedConsultorio(null);
    fetchConsultorios();
    if (onRefresh) onRefresh();
  };

  if (showDetallesModal && selectedConsultorio) {
    return (
      <DetallesConsultorio
        consultorio={selectedConsultorio}
        onClose={() => {
          setShowDetallesModal(false);
          setSelectedConsultorio(null);
        }}
        onRefresh={handleDetallesSuccess}
      />
    );
  }

  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-emerald-50 relative h-full animate-fade-in-up">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-[#2A5C4D]">
            Consultorios / Salas
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Gestión de salas y consultorios de la clínica
          </p>
        </div>

        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar consultorio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:border-[#148F77] transition-all shadow-sm placeholder-gray-300"
            />
          </div>
          <button
            onClick={() => {
              setShowAddModal(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#148F77] text-white text-sm font-bold rounded-xl hover:bg-[#0f6b59] transition-all shadow-sm"
          >
            Agregar Consultorio
          </button>
        </div>
      </div>

      <div className="p-6 lg:p-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-50">
            <thead className="bg-emerald-50/50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                >
                  ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                >
                  Tipo
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-4 text-right text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredConsultorios.length > 0 ? (
                filteredConsultorios.map((c, index) => (
                  <tr
                    key={c.id_sala}
                    className={`hover:bg-emerald-50/30 transition-colors ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-500">
                      {c.id_sala}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#2A5C4D]">
                      {c.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded font-semibold text-xs">
                        {c.tipo_sala}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 py-1 rounded font-semibold text-xs ${
                          c.estado_sala === "ACTIVA"
                            ? "bg-green-50 text-green-600"
                            : c.estado_sala === "MANTENIMIENTO"
                              ? "bg-orange-50 text-orange-600"
                              : "bg-red-50 text-red-600"
                        }`}
                      >
                        {c.estado_sala}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedConsultorio(c);
                          setShowDetallesModal(true);
                        }}
                        className="text-[#148F77] hover:text-white font-bold px-4 py-2 rounded-xl hover:bg-[#148F77] border border-[#148F77] transition-all shadow-sm"
                      >
                        Gestionar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan="5"
                    className="px-6 py-16 text-center text-gray-400 text-sm font-medium"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span>No se encontraron consultorios.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAddModal && (
        <ModalConsultorio
          onClose={() => setShowAddModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {showNoPermissionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">Aviso</h3>
              <p className="text-sm text-gray-500 font-medium">
                {noPermissionMessage}
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => {
                  setShowNoPermissionModal(false);
                  setNoPermissionMessage("");
                }}
                className="flex-1 py-3 bg-[#148F77] hover:bg-[#0f6b59] text-white text-sm font-bold rounded-xl shadow-md transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

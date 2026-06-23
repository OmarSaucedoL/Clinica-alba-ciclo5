import React, { useState, useEffect } from "react";
import ModalServicio from "./ModalServicio";
import { useAuthStore } from "../../../store/auth_store";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloServicios() {
  const [servicios, setServicios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  
  const [showNoPermissionModal, setShowNoPermissionModal] = useState(false);
  const [noPermissionMessage, setNoPermissionMessage] = useState("");
  
  const user = useAuthStore((state) => state.user);

  const fetchServicios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/servicios`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      const data = await res.json();
      if (data.success) {
        setServicios(data.data || []);
      } else {
        throw new Error(data.message || "Error al obtener los servicios.");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServicios();
  }, []);

  const handleOpenAdd = () => {
    setSelectedService(null);
    setShowAddEditModal(true);
  };

  const handleOpenEdit = (service) => {
    setSelectedService(service);
    setShowAddEditModal(true);
  };

  const handleSuccess = () => {
    setShowAddEditModal(false);
    setSelectedService(null);
    fetchServicios();
  };

  const confirmDelete = async () => {
    if (!serviceToDelete) return;
    try {
      const res = await fetch(`${API_URL}/servicios/${serviceToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_usuario: user?.id_usuario,
          id_sesion: user?.id_sesion,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      setServiceToDelete(null);
      fetchServicios();
    } catch (err) {
      setServiceToDelete(null);
      setNoPermissionMessage(
        err.message || "No tienes los permisos necesarios para realizar esta acción. Por favor, contacta al administrador."
      );
      setShowNoPermissionModal(true);
    }
  };

  const filteredServicios = servicios.filter((s) =>
    s.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.detalle?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col bg-white rounded-3xl shadow-sm border border-emerald-50 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 p-6 lg:p-8 border-b border-gray-50 bg-gray-50/30 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-[#2A5C4D]">
            Gestión de Servicios
          </h2>
          <p className="text-xs text-gray-400 mt-1 font-medium tracking-wide">
            Catálogo y tarifas de servicios dentales ofrecidos
          </p>
        </div>

        {/* Buscador y Botón */}
        <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar servicio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2.5 bg-white border border-emerald-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#148F77]/20 focus:border-[#148F77] transition-all shadow-sm placeholder-gray-300"
            />
          </div>
          <button
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#148F77] text-white text-sm font-bold rounded-xl hover:bg-[#0f6b59] transition-all shadow-sm"
          >
            Agregar servicio
          </button>
        </div>
      </div>

      {error && (
        <div className="m-6 lg:m-8 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Contenedor de la tabla*/}
      <div className="p-6 lg:p-8 pt-0 lg:pt-0">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[#148F77] font-bold text-sm">
              <svg className="animate-spin h-5 w-5 mr-3 text-[#148F77]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Cargando servicios...
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-50">
              <thead className="bg-emerald-50/50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                  >
                    Nombre del Servicio
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest"
                  >
                    Detalle
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-left text-[10px] font-black text-[#148F77] uppercase tracking-widest w-px whitespace-nowrap"
                  >
                    Precio
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-4 text-center text-[10px] font-black text-[#148F77] uppercase tracking-widest w-px whitespace-nowrap"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredServicios.length > 0 ? (
                  filteredServicios.map((s, index) => (
                    <tr
                      key={s.id}
                      className={`hover:bg-emerald-50/30 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#2A5C4D]">
                        {s.nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-semibold max-w-xs truncate">
                        {s.detalle || <span className="text-gray-300 italic font-normal">Sin detalle</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-[#148F77] w-px">
                        {s.precio} Bs
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2 w-px">
                        <button
                          onClick={() => handleOpenEdit(s)}
                          className="text-[#148F77] hover:text-[#0f6b59] font-bold px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                        >
                          Modificar
                        </button>
                        <button
                          onClick={() => setServiceToDelete(s)}
                          className="text-red-400 hover:text-red-600 font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-16 text-center text-gray-400 text-sm font-medium"
                    >
                      <div className="flex flex-col items-center justify-center gap-2">
                        <span>No se encontraron servicios registrados.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* MODAL CREAR / EDITAR SERVICIO */}
      {showAddEditModal && (
        <ModalServicio
          service={selectedService}
          onClose={() => setShowAddEditModal(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* MODAL CONFIRMAR ELIMINACIÓN */}
      {serviceToDelete && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col transform transition-all">
            <div className="p-6 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4">
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
              <h3 className="text-xl font-black text-gray-800 mb-2">
                ¿Eliminar Servicio?
              </h3>
              <p className="text-sm text-gray-500 font-medium">
                Estás a punto de eliminar el servicio{" "}
                <span className="font-bold text-gray-700">
                  "{serviceToDelete.nombre}"
                </span>
                . Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setServiceToDelete(null)}
                className="flex-1 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-bold rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-md transition-colors"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NO TIENE PERMISOS O ERROR DE FK */}
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
              <h3 className="text-xl font-black text-gray-800 mb-2">
                Operación Restringida
              </h3>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
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

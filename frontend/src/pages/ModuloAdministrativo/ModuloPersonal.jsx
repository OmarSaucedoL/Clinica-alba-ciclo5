import { useEffect, useState } from "react";

import FormPersonal from "./FormCrearPersonal";
import FormEditPersonal from "./FormEditPersonal";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloPersonal({ defaultPersonal, onClearDefaultPersonal }) {

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const [personal, setPersonal] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [contratos, setContratos] = useState([]);

  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState(null);

  const [search, setSearch] = useState("");

  // =========================================
  // PERSONAL
  // =========================================

  const fetchPersonal = async () => {
    try {

      const res = await fetch(
        `${API_URL}/personal`,
        { headers }
      );

      const data = await res.json();

      setPersonal(data.data || []);

    } catch (err) {

      console.error(err);

    } finally {

      setLoading(false);

    }
  };

  // =========================================
  // CARGOS
  // =========================================

  const fetchCargos = async () => {
    try {

      const res = await fetch(
        `${API_URL}/cargos`,
        { headers }
      );

      const data = await res.json();

      setCargos(data.data || []);

    } catch (err) {

      console.error(err);

    }
  };

  // =========================================
  // CONTRATOS
  // =========================================

  const fetchContratos = async () => {
    try {

      const res = await fetch(
        `${API_URL}/contratos`,
        { headers }
      );

      const data = await res.json();

      setContratos(data.data || []);

    } catch (err) {

      console.error(err);

    }
  };

  useEffect(() => {

    fetchPersonal();
    fetchCargos();
    fetchContratos();

  }, []);

  useEffect(() => {
    if (defaultPersonal) {
      const found = personal.find(
        (p) =>
          p.id_personal === defaultPersonal.id_personal ||
          p.id === defaultPersonal.id_personal
      );
      if (found) {
        setSelectedPersonal(found);
        setShowEdit(true);
      } else {
        setSelectedPersonal(defaultPersonal);
        setShowEdit(true);
      }
      if (onClearDefaultPersonal) {
        onClearDefaultPersonal();
      }
    }
  }, [defaultPersonal, personal]);

  // =========================================
  // FILTRO
  // =========================================

  const filtered = personal.filter((p) => {

    return (
      (p.nombre || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||

      String(p.ci || "")
        .includes(search)
    );

  });

  return (
    <div className="w-full p-4 md:p-8 space-y-8 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight italic">
            Gestión de Personal
          </h2>
          <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
            Directorio y administración del personal clínico
          </p>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto bg-[#148F77] hover:bg-[#0f6b59] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 cursor-pointer flex items-center justify-center gap-2"
        >
          <span className="text-base font-light">+</span> Nuevo Personal
        </button>
      </div>

      {/* FILTRO */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-4 md:p-6 flex items-center gap-4">
        <div className="text-[#148F77] opacity-60">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o cédula de identidad (CI)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent border-0 outline-none text-sm font-bold text-gray-700 placeholder-gray-400 focus:ring-0 focus:outline-none"
        />
      </div>

      {/* LISTA DE PERSONAL */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 opacity-60">
          <div className="w-8 h-8 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black uppercase tracking-widest text-[#148F77]">
            Cargando Directorio...
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm opacity-60 space-y-2">
          <div className="text-3xl">👥</div>
          <p className="text-sm font-black text-[#2A5C4D] uppercase tracking-wider">No se encontraron registros</p>
          <p className="text-xs text-gray-400">Pruebe ajustando el filtro de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((p) => {
            const initials = p.nombre
              ? p.nombre
                  .split(" ")
                  .slice(0, 2)
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
              : "P";
            const isDoc = p.cargo?.toLowerCase().includes("odont") || Number(p.id_cargo) === 2;
            const isAdmin = p.cargo?.toLowerCase().includes("admin") || Number(p.id_cargo) === 1;
            const cargoBg = isDoc
              ? "bg-emerald-50 text-[#148F77] border-emerald-100/55"
              : isAdmin
              ? "bg-orange-50 text-orange-600 border-orange-100/55"
              : "bg-blue-50 text-blue-600 border-blue-100/55";

            return (
              <div
                key={p.id_personal}
                className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-300 flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm shadow-inner transition-colors duration-300 ${
                        isDoc
                          ? "bg-emerald-50 text-[#148F77]"
                          : isAdmin
                          ? "bg-orange-50 text-orange-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {initials}
                    </div>
                    <div>
                      <h3 className="font-black text-[#2A5C4D] text-base leading-tight group-hover:text-[#148F77] transition-colors duration-300">
                        {p.nombre}
                      </h3>
                      <span
                        className={`inline-block text-[8px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg border mt-2 ${cargoBg}`}
                      >
                        {p.cargo || "Personal"}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-gray-50 pt-4 text-xs font-bold text-gray-500">
                    <div className="flex justify-between">
                      <span className="text-gray-400">CI / Identificación:</span>
                      <span className="text-gray-700">{p.ci}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Especialidad:</span>
                      <span className="text-gray-700">
                        {p.especialidad || "General / No asignada"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <button
                    onClick={() => {
                      setSelectedPersonal(p);
                      setShowEdit(true);
                    }}
                    className="w-full text-center py-2.5 bg-emerald-50 hover:bg-[#148F77] text-[#148F77] hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 border border-emerald-100/50 shadow-sm active:scale-95 cursor-pointer"
                  >
                    Editar Perfil
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CREAR */}
      {showCreate && (
        <FormPersonal
          cargos={cargos}
          contratos={contratos}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchPersonal();
          }}
        />
      )}

      {/* MODAL EDITAR */}
      {showEdit && selectedPersonal && (
        <FormEditPersonal
          personal={selectedPersonal}
          cargos={cargos}
          contratos={contratos}
          onClose={() => {
            setShowEdit(false);
            setSelectedPersonal(null);
          }}
          onSuccess={() => {
            setShowEdit(false);
            setSelectedPersonal(null);
            fetchPersonal();
          }}
        />
      )}
    </div>
  );
}
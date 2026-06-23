import { useEffect, useState } from "react";

import FormPersonal from "./FormCrearPersonal";
import FormEditPersonal from "./FormEditPersonal";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloPersonal() {

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

    <div className="w-full p-3 md:p-6">

      {/* HEADER */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

        <div>

          <h2 className="text-2xl md:text-3xl font-black text-[#2A5C4D]">
            Gestión de Personal
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Administración del personal de la clínica
          </p>

        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="
            w-full sm:w-auto
            bg-[#148F77]
            hover:bg-[#0E6B59]
            transition-all
            text-white
            px-5 py-3
            rounded-2xl
            font-bold
            shadow-md
          "
        >
          + Nuevo Personal
        </button>

      </div>

      {/* FILTRO */}

      <div
        className="
          bg-white
          rounded-3xl
          shadow-sm
          border border-gray-100
          p-4 md:p-5
          mb-6
        "
      >

        <input
          type="text"
          placeholder="Buscar por nombre o CI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full
            border border-gray-200
            rounded-2xl
            px-4 py-3
            outline-none
            focus:border-[#148F77]
          "
        />

      </div>

      {/* LISTA */}

      {loading ? (

        <div className="text-center py-10 text-gray-400 font-semibold">
          Cargando personal...
        </div>

      ) : filtered.length === 0 ? (

        <div
          className="
            bg-white
            rounded-3xl
            p-10
            text-center
            border border-gray-100
            shadow-sm
          "
        >
          <p className="text-gray-400 font-semibold">
            No se encontró personal registrado
          </p>
        </div>

      ) : (

        <div className="space-y-4">

          {filtered.map((p) => (

            <div
              key={p.id_personal}
              className="
                bg-white
                border border-gray-100
                rounded-3xl
                shadow-sm
                p-4 md:p-5
                hover:shadow-md
                transition-all
              "
            >

              <div className="flex flex-col lg:flex-row lg:justify-between gap-4">

                <div>

                  <h3 className="font-black text-[#2A5C4D] text-lg">
                    {p.nombre}
                  </h3>

                  <p className="text-sm text-gray-500 mt-1">
                    CI: {p.ci}
                  </p>

                  <p className="text-sm text-gray-500">
                    Especialidad: {p.especialidad || "No registrada"}
                  </p>

                  <p className="text-sm text-gray-500">
                    Cargo: {p.cargo}
                  </p>
                 <div className="mt-4">
  <button
    onClick={() => {
      setSelectedPersonal(p);
      setShowEdit(true);
    }}
    className="
      px-4 py-2
      rounded-xl
      bg-blue-500
      hover:bg-blue-600
      text-white
      font-bold
    "
  >
    Editar
  </button>
</div>
                </div>

              </div>

            </div>

          ))}

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
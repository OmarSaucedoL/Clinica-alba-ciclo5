import { useEffect, useState } from "react";

import FormUsuarioModal from "./FormUsuario";
import FormPermisosUsuarioModal from "./FormPermisos";
import FormEditUsuarioModal from "./FormEditUsuario";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloUsuarios() {

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // MODALES
  // =========================

  const [showCreate, setShowCreate] = useState(false);
  const [userPermisos, setUserPermisos] = useState(null);
  const [userEdit, setUserEdit] = useState(null);

  const [roles, setRoles] = useState([]);

  // =========================
  // FILTROS
  // =========================

  const [search, setSearch] = useState("");
  const [filterRol, setFilterRol] = useState("");
  const [filterEstado, setFilterEstado] = useState("");

  // =========================
  // FETCH USUARIOS
  // =========================

  const fetchUsuarios = async () => {

    try {

      const res = await fetch(`${API_URL}/usuarios`, {
        headers
      });

      const data = await res.json();

      setUsuarios(data.data || []);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  // =========================
  // FETCH ROLES
  // =========================

  const fetchRoles = async () => {

    try {

      const res = await fetch(`${API_URL}/roles`, {
        headers
      });

      const data = await res.json();

      setRoles(data.data || []);

    } catch (err) {

      console.log(err);

    }
  };

  useEffect(() => {

    fetchUsuarios();
    fetchRoles();

  }, []);

  // =========================
  // HABILITAR / DESHABILITAR
  // =========================

  const toggleEstado = async (u) => {

    await fetch(`${API_URL}/usuarios/${u.id_usuario}`, {
      method: "DELETE",
      headers
    });

    fetchUsuarios();
  };

  // =========================
  // FILTROS
  // =========================

  const filtered = usuarios.filter((u) => {

    const matchSearch =
      (u.nombre_usuario || u.usuario || "")
        .toLowerCase()
        .includes(search.toLowerCase()) ||

      (u.correo || "")
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchRol =
      filterRol
        ? u.rol === filterRol
        : true;

    const matchEstado =
      filterEstado === ""
        ? true
        : filterEstado === "activo"
          ? u.estado !== false
          : u.estado === false;

    return matchSearch && matchRol && matchEstado;
  });

  return (

    <div className="w-full p-3 md:p-6">

      {/* =========================
          HEADER
      ========================= */}

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">

        <div>

          <h2 className="text-2xl md:text-3xl font-black text-[#2A5C4D]">
            Gestión de Usuarios
          </h2>

          <p className="text-sm text-gray-400 mt-1">
            Administración completa de usuarios y permisos
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
          + Nuevo Usuario
        </button>

      </div>

      {/* =========================
          FILTROS
      ========================= */}

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

          <input
            type="text"
            placeholder="Buscar usuario o correo..."
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

          <select
            value={filterRol}
            onChange={(e) => setFilterRol(e.target.value)}
            className="
              w-full
              border border-gray-200
              rounded-2xl
              px-4 py-3
              outline-none
              focus:border-[#148F77]
              bg-white
            "
          >
            <option value="">
              Todos los roles
            </option>

            {roles.map((r) => (
              <option
                key={r.id_rol}
                value={r.rol}
              >
                {r.rol}
              </option>
            ))}
          </select>

          <select
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
            className="
              w-full
              border border-gray-200
              rounded-2xl
              px-4 py-3
              outline-none
              focus:border-[#148F77]
              bg-white
            "
          >
            <option value="">
              Todos los estados
            </option>

            <option value="activo">
              Activos
            </option>

            <option value="inactivo">
              Inactivos
            </option>

          </select>

        </div>

      </div>

      {/* =========================
          LISTA
      ========================= */}

      {loading ? (

        <div className="text-center py-10 text-gray-400 font-semibold">
          Cargando usuarios...
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
            No se encontraron usuarios
          </p>
        </div>

      ) : (

        <div className="space-y-4">

          {filtered.map((u) => (

            <div
              key={u.id_usuario}
              className={`
                w-full
                bg-white
                border border-gray-100
                rounded-3xl
                shadow-sm
                p-4 md:p-5
                transition-all
                hover:shadow-md
                ${
                  u.estado === false
                    ? "opacity-60 bg-gray-50"
                    : ""
                }
              `}
            >

              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">

                {/* INFO */}
                <div className="min-w-0 flex-1">

                  <h3 className="font-black text-[#2A5C4D] text-lg truncate">
                    {u.usuario}
                  </h3>

                  <p className="text-sm text-gray-500 truncate mt-1">
                    {u.correo}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-3">

                    <span
                      className="
                        bg-emerald-50
                        text-[#148F77]
                        text-xs
                        font-bold
                        px-3 py-1
                        rounded-full
                      "
                    >
                      {u.rol}
                    </span>

                    <span
                      className={`
                        text-xs
                        font-bold
                        px-3 py-1
                        rounded-full
                        ${
                          u.estado === false
                            ? "bg-red-50 text-red-500"
                            : "bg-blue-50 text-blue-500"
                        }
                      `}
                    >
                      {u.estado === false
                        ? "INACTIVO"
                        : "ACTIVO"}
                    </span>

                  </div>

                </div>

                {/* BOTONES */}
                <div
                  className="
                    grid
                    grid-cols-1
                    sm:grid-cols-3
                    gap-2
                    w-full
                    xl:w-auto
                  "
                >

                  <button
                    onClick={() => setUserPermisos(u)}
                    className="
                      bg-blue-500
                      hover:bg-blue-600
                      transition-all
                      text-white
                      px-4 py-3
                      rounded-2xl
                      text-sm
                      font-bold
                    "
                  >
                    Permisos
                  </button>

                  <button
                    onClick={() => setUserEdit(u)}
                    className="
                      bg-gray-800
                      hover:bg-black
                      transition-all
                      text-white
                      px-4 py-3
                      rounded-2xl
                      text-sm
                      font-bold
                    "
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => toggleEstado(u)}
                    className={`
                      px-4 py-3
                      rounded-2xl
                      text-sm
                      font-bold
                      text-white
                      transition-all
                      ${
                        u.estado === false
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }
                    `}
                  >
                    {u.estado === false
                      ? "Habilitar"
                      : "Deshabilitar"}
                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}

      {/* =========================
          MODALES
      ========================= */}

      {showCreate && (
        <FormUsuarioModal
          roles={roles}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            fetchUsuarios();
          }}
        />
      )}

      {userPermisos && (
        <FormPermisosUsuarioModal
          user={userPermisos}
          onClose={() => setUserPermisos(null)}
        />
      )}

      {userEdit && (
        <FormEditUsuarioModal
          user={userEdit}
          roles={roles}
          onClose={() => setUserEdit(null)}
          onSuccess={() => {
            setUserEdit(null);
            fetchUsuarios();
          }}
        />
      )}

    </div>
  );
}
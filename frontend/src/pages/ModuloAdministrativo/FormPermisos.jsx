import { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function FormPermisosUsuarioModal({ user, onClose }) {

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState("activos");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState(null);

  // =========================
  // FETCH
  // =========================

  const fetchPermisos = async () => {

    try {

      setLoading(true);

      const res = await fetch(
        `${API_URL}/usuarios/${user.id_usuario}/permisos`,
        { headers }
      );

      const data = await res.json();

      setPermisos(data.data || []);

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {

    if (user) {
      fetchPermisos();
    }

  }, [user]);

  // =========================
  // ACTIONS
  // =========================

  const activar = async (p) => {

    await fetch(`${API_URL}/usuarios/permisos`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        id_usuario: user.id_usuario,
        id_permiso: p.id_permiso
      })
    });

    fetchPermisos();
  };

  const quitar = async (p) => {

    await fetch(`${API_URL}/usuarios/permisos`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({
        id_usuario: user.id_usuario,
        id_permiso: p.id_permiso
      })
    });

    setConfirm(null);

    fetchPermisos();
  };

  // =========================
  // FILTERS
  // =========================

  const activos = permisos.filter(p => p.habilitado);

  const disponibles = permisos.filter(p => !p.habilitado);

  const disponiblesFiltrados = useMemo(() => {

    return disponibles.filter(p =>
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.modulo || "").toLowerCase().includes(search.toLowerCase())
    );

  }, [search, disponibles]);

  // =========================
  // GROUP
  // =========================

  const groupByModulo = (list) => {

    return list.reduce((acc, p) => {

      const key = p.modulo || "SIN MÓDULO";

      if (!acc[key]) {
        acc[key] = [];
      }

      acc[key].push(p);

      return acc;

    }, {});
  };

  const activosGroup = groupByModulo(activos);

  const disponiblesGroup = groupByModulo(disponiblesFiltrados);

  // =========================
  // CARD
  // =========================

  const Card = ({ p, action, label, color }) => (

    <div className="
      flex flex-col sm:flex-row
      sm:items-center sm:justify-between
      gap-3
      bg-gray-50
      border border-gray-100
      p-3 rounded-2xl
    ">

      <div className="min-w-0">

        <p className="font-bold text-sm text-[#2A5C4D] break-words">
          {p.nombre}
        </p>

        <p className="text-xs text-gray-400 break-words">
          {p.modulo}
        </p>

      </div>

      <button
        onClick={() => action(p)}
        className={`
          w-full sm:w-auto
          px-4 py-2
          rounded-xl
          text-xs font-bold text-white
          ${color}
        `}
      >
        {label}
      </button>

    </div>
  );

  return (

    <div className="
      fixed inset-0 z-50
      bg-black/60
      flex items-center justify-center
      p-2 md:p-4
    ">

      {/* MODAL */}
      <div className="
        w-full max-w-5xl
        bg-white
        rounded-3xl
        shadow-2xl
        flex flex-col
        max-h-[95vh]
        overflow-hidden
      ">

        {/* HEADER */}
        <div className="
          p-4 md:p-6
          border-b
          flex items-start justify-between gap-4
        ">

          <div className="min-w-0">

            <h2 className="font-black text-xl md:text-2xl text-[#2A5C4D] break-words">
              {user.usuario}
            </h2>

            <p className="text-sm text-gray-500 mt-1">
              Rol: {user.rol}
            </p>

          </div>

          <button
            onClick={onClose}
            className="
              w-10 h-10
              rounded-xl
              bg-gray-100
              hover:bg-red-50
              text-gray-500
              hover:text-red-500
              flex items-center justify-center
              text-xl
              transition-all
              flex-shrink-0
            "
          >
            ✕
          </button>

        </div>

        {/* TABS */}
        <div className="
          grid grid-cols-2
          border-b
        ">

          <button
            onClick={() => setTab("activos")}
            className={`
              py-3 md:py-4
              text-sm font-black
              transition-all
              ${
                tab === "activos"
                  ? "bg-[#148F77] text-white"
                  : "bg-gray-100 text-gray-500"
              }
            `}
          >
            Activos ({activos.length})
          </button>

          <button
            onClick={() => setTab("add")}
            className={`
              py-3 md:py-4
              text-sm font-black
              transition-all
              ${
                tab === "add"
                  ? "bg-[#148F77] text-white"
                  : "bg-gray-100 text-gray-500"
              }
            `}
          >
            Añadir ({disponibles.length})
          </button>

        </div>

        {/* SEARCH */}
        {tab === "add" && (

          <div className="p-4 border-b">

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar permiso o módulo..."
              className="
                w-full
                p-3
                border border-gray-200
                rounded-2xl
                outline-none
                focus:ring-2
                focus:ring-[#148F77]
              "
            />

          </div>

        )}

        {/* BODY */}
        <div className="
          flex-1
          overflow-y-auto
          p-4 md:p-6
          space-y-6
          bg-[#F8FBFB]
        ">

          {loading ? (

            <div className="text-center py-10 text-gray-500">
              Cargando permisos...
            </div>

          ) : tab === "activos" ? (

            Object.keys(activosGroup).length === 0 ? (

              <div className="text-center py-10 text-gray-400">
                No existen permisos activos
              </div>

            ) : (

              Object.keys(activosGroup).map(mod => (

                <div key={mod} className="space-y-3">

                  <h3 className="
                    font-black
                    text-sm
                    uppercase
                    tracking-widest
                    text-[#148F77]
                  ">
                    {mod}
                  </h3>

                  <div className="space-y-3">

                    {activosGroup[mod].map(p => (

                      <Card
                        key={p.id_permiso}
                        p={p}
                        label="Quitar"
                        color="bg-red-500 hover:bg-red-600"
                        action={(p) => setConfirm(p)}
                      />

                    ))}

                  </div>

                </div>

              ))

            )

          ) : (

            Object.keys(disponiblesGroup).length === 0 ? (

              <div className="text-center py-10 text-gray-400">
                Sin permisos disponibles
              </div>

            ) : (

              Object.keys(disponiblesGroup).map(mod => (

                <div key={mod} className="space-y-3">

                  <h3 className="
                    font-black
                    text-sm
                    uppercase
                    tracking-widest
                    text-[#148F77]
                  ">
                    {mod}
                  </h3>

                  <div className="space-y-3">

                    {disponiblesGroup[mod].map(p => (

                      <Card
                        key={p.id_permiso}
                        p={p}
                        label="Activar"
                        color="bg-green-600 hover:bg-green-700"
                        action={activar}
                      />

                    ))}

                  </div>

                </div>

              ))

            )

          )}

        </div>

        {/* FOOTER */}
        <div className="
          p-4
          border-t
          bg-white
        ">

          <button
            onClick={onClose}
            className="
              w-full
              py-3
              rounded-2xl
              bg-gray-200
              hover:bg-gray-300
              font-black
              transition-all
            "
          >
            Cerrar
          </button>

        </div>

      </div>

      {/* CONFIRM */}
      {confirm && (

        <div className="
          fixed inset-0 z-[60]
          bg-black/70
          flex items-center justify-center
          p-4
        ">

          <div className="
            bg-white
            rounded-3xl
            p-6
            w-full max-w-sm
            shadow-2xl
          ">

            <p className="text-center text-sm md:text-base mb-6">
              ¿Quitar el permiso{" "}
              <span className="font-black">
                {confirm.nombre}
              </span>
              ?
            </p>

            <div className="flex flex-col sm:flex-row gap-3">

              <button
                onClick={() => quitar(confirm)}
                className="
                  flex-1
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  py-3
                  rounded-2xl
                  font-bold
                "
              >
                Sí
              </button>

              <button
                onClick={() => setConfirm(null)}
                className="
                  flex-1
                  bg-gray-200
                  hover:bg-gray-300
                  py-3
                  rounded-2xl
                  font-bold
                "
              >
                No
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}
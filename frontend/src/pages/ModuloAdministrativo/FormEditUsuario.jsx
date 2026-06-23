import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function FormEditUsuarioModal({
  user,
  onClose,
  onSuccess
}) {

  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const [form, setForm] = useState({
    user: "",
    correo: "",
    id_rol: ""
  });

  const [roles, setRoles] = useState([]);

  const [loading, setLoading] = useState(false);

  const [warning, setWarning] = useState(false);

  // =========================
  // LOAD USER
  // =========================

  useEffect(() => {

    if (user) {

      setForm({
        user: user.usuario || "",
        correo: user.correo || "",
        id_rol: user.id_rol || ""
      });

    }

  }, [user]);

  // =========================
  // ROLES
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

    fetchRoles();

  }, []);

  // =========================
  // INPUTS
  // =========================

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  const handleRolChange = (e) => {

    setWarning(true);

    setForm({
      ...form,
      id_rol: e.target.value
    });

  };

  // =========================
  // SAVE
  // =========================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);

    try {

      const resRol = await fetch(
        `${API_URL}/usuarios/asignar-rol`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            id_usuario: user.id_usuario,
            id_rol: form.id_rol
          })
        }
      );

      const dataRol = await resRol.json();

      if (!resRol.ok || !dataRol.success) {

        throw new Error(
          dataRol.message || "Error al asignar rol"
        );

      }

      onSuccess?.();

      onClose?.();

    } catch (err) {

      console.log(err);

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="
      fixed inset-0 z-50
      bg-black/60
      flex items-center justify-center
      p-3 md:p-5
    ">

      {/* MODAL */}
      <div className="
        w-full max-w-lg
        bg-white
        rounded-3xl
        shadow-2xl
        overflow-hidden
      ">

        {/* HEADER */}
        <div className="
          flex items-center justify-between
          p-5 md:p-6
          border-b border-gray-100
        ">

          <div>

            <h2 className="
              text-xl md:text-2xl
              font-black
              text-[#2A5C4D]
            ">
              Editar Usuario
            </h2>

            <p className="text-xs text-gray-400 mt-1">
              Gestión de roles y permisos
            </p>

          </div>

          <button
            onClick={onClose}
            className="
              w-10 h-10
              rounded-xl
              bg-gray-100
              hover:bg-red-50
              hover:text-red-500
              transition-all
              text-xl
              flex items-center justify-center
            "
          >
            ✕
          </button>

        </div>

        {/* BODY */}
        <div className="p-5 md:p-6">

          {/* WARNING */}
          {warning && (

            <div className="
              mb-5
              p-4
              rounded-2xl
              bg-yellow-50
              border border-yellow-200
              text-yellow-800
              text-sm
              leading-relaxed
            ">
              ⚠ Al cambiar el rol, los permisos del usuario
              se reiniciarán y sincronizarán automáticamente.
            </div>

          )}

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >

            {/* USER */}
            <div>

              <label className="
                block mb-2
                text-xs font-black
                uppercase tracking-widest
                text-gray-400
              ">
                Usuario
              </label>

              <input
                name="user"
                value={form.user}
                disabled
                className="
                  w-full
                  p-3 md:p-4
                  rounded-2xl
                  border border-gray-200
                  bg-gray-100
                  text-gray-500
                "
              />

            </div>

            {/* EMAIL */}
            <div>

              <label className="
                block mb-2
                text-xs font-black
                uppercase tracking-widest
                text-gray-400
              ">
                Correo
              </label>

              <input
                name="correo"
                value={form.correo}
                disabled
                className="
                  w-full
                  p-3 md:p-4
                  rounded-2xl
                  border border-gray-200
                  bg-gray-100
                  text-gray-500
                "
              />

            </div>

            {/* ROLE */}
            <div>

              <label className="
                block mb-2
                text-xs font-black
                uppercase tracking-widest
                text-gray-400
              ">
                Rol
              </label>

              <select
                value={form.id_rol}
                onChange={handleRolChange}
                className="
                  w-full
                  p-3 md:p-4
                  rounded-2xl
                  border border-gray-200
                  outline-none
                  focus:ring-2
                  focus:ring-[#148F77]
                  bg-white
                "
              >

                <option value="">
                  Seleccionar rol
                </option>

                {roles.map(r => (

                  <option
                    key={r.id_rol}
                    value={r.id_rol}
                  >
                    {r.rol}
                  </option>

                ))}

              </select>

            </div>

            {/* BUTTONS */}
            <div className="
              flex flex-col sm:flex-row
              gap-3
              pt-2
            ">

              <button
                type="submit"
                disabled={loading}
                className="
                  flex-1
                  bg-[#148F77]
                  hover:bg-[#0f6b59]
                  text-white
                  py-3 md:py-4
                  rounded-2xl
                  font-black
                  transition-all
                "
              >
                {loading
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="
                  flex-1
                  bg-gray-200
                  hover:bg-gray-300
                  py-3 md:py-4
                  rounded-2xl
                  font-black
                  transition-all
                "
              >
                Cancelar
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function FormUsuarioModal({
  roles = [],
  onClose,
  onSuccess
}) {

  const [form, setForm] = useState({
    user: "",
    ci: "",
    name: "",
    mail: "",
    number: "",
    birth: "",
    dir: "",
    password: "",
    id_rol: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("token");

  // =========================
  // CHANGE
  // =========================

  const handleChange = (e) => {

    setForm({
      ...form,
      [e.target.name]: e.target.value
    });

  };

  // =========================
  // SUBMIT
  // =========================

  const handleSubmit = async (e) => {

    e.preventDefault();

    setLoading(true);
    setError("");

    try {

      const res = await fetch(`${API_URL}/usuarios`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.message || "Error al crear usuario"
        );
      }

      onSuccess?.();
      onClose?.();

    } catch (err) {

      setError(err.message);

    } finally {

      setLoading(false);

    }
  };

  // =========================
  // INPUT STYLE
  // =========================

  const inputStyle = `
    w-full
    px-4 py-3
    rounded-2xl
    border border-gray-200
    bg-gray-50
    outline-none
    transition-all
    focus:border-[#148F77]
    focus:ring-2
    focus:ring-[#148F77]/20
  `;

  return (

    <div
      className="
        fixed inset-0 z-50
        bg-black/50
        backdrop-blur-sm
        flex items-center justify-center
        p-3 md:p-6
      "
    >

      <div
        className="
          relative
          w-full
          max-w-4xl
          max-h-[95vh]
          overflow-y-auto
          bg-white
          rounded-3xl
          shadow-2xl
          animate-fadeIn
        "
      >

        {/* HEADER */}
        <div
          className="
            sticky top-0 z-10
            bg-white
            border-b border-gray-100
            px-5 md:px-8 py-5
            rounded-t-3xl
            flex items-center justify-between
          "
        >

          <div>

            <h2 className="text-2xl md:text-3xl font-black text-[#2A5C4D]">
              Nuevo Usuario
            </h2>

            <p className="text-sm text-gray-400 mt-1">
              Registro de nuevos usuarios del sistema
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
              font-black
              text-gray-500
            "
          >
            ✕
          </button>

        </div>

        {/* BODY */}
        <div className="p-5 md:p-8">

          {/* ERROR */}
          {error && (
            <div
              className="
                mb-5
                bg-red-50
                border border-red-100
                text-red-600
                px-4 py-3
                rounded-2xl
                text-sm
                font-bold
              "
            >
              {error}
            </div>
          )}

          {/* FORM */}
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* GRID */}
            <div
              className="
                grid
                grid-cols-1
                md:grid-cols-2
                gap-4
              "
            >

              {/* USUARIO */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Usuario
                </label>

                <input
                  name="user"
                  placeholder="Ingrese usuario"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* CI */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Carnet de Identidad
                </label>

                <input
                  name="ci"
                  placeholder="Ingrese CI"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* NOMBRE */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Nombre Completo
                </label>

                <input
                  name="name"
                  placeholder="Ingrese nombre completo"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* CORREO */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Correo Electrónico
                </label>

                <input
                  type="email"
                  name="mail"
                  placeholder="Ingrese correo"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* FECHA */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Fecha de Nacimiento
                </label>

                <input
                  type="date"
                  name="birth"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* TELEFONO */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Teléfono
                </label>

                <input
                  name="number"
                  placeholder="Ingrese teléfono"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* DIRECCION */}
              <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Dirección
                </label>

                <input
                  name="dir"
                  placeholder="Ingrese dirección"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Contraseña
                </label>

                <input
                  type="password"
                  name="password"
                  placeholder="Ingrese contraseña"
                  onChange={handleChange}
                  className={inputStyle}
                />
              </div>

              {/* ROL */}
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">
                  Rol
                </label>

                <select
                  name="id_rol"
                  onChange={handleChange}
                  className={inputStyle}
                >
                  <option value="">
                    Seleccionar rol
                  </option>

                  {roles.map((r) => (
                    <option
                      key={r.id_rol}
                      value={r.id_rol}
                    >
                      {r.rol}
                    </option>
                  ))}

                </select>
              </div>

            </div>

            {/* BUTTONS */}
            <div
              className="
                flex flex-col-reverse
                sm:flex-row
                gap-3
                pt-3
              "
            >

              <button
                type="button"
                onClick={onClose}
                className="
                  w-full
                  sm:w-auto
                  px-6 py-3
                  rounded-2xl
                  bg-gray-100
                  hover:bg-gray-200
                  transition-all
                  font-bold
                "
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full
                  sm:flex-1
                  px-6 py-3
                  rounded-2xl
                  bg-[#148F77]
                  hover:bg-[#0F6B59]
                  transition-all
                  text-white
                  font-black
                  shadow-lg
                  disabled:opacity-60
                "
              >
                {loading
                  ? "Creando usuario..."
                  : "Crear Usuario"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
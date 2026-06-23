import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function FormPersonal({
  cargos = [],
  contratos = [],
  onClose,
  onSuccess,
}) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    fecha_nacimiento: "",
    direccion: "",
    ci: "",
    descripcion: "",
    especialidad: "",
    id_cargo: "",
    id_contrato: "",
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/personal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Error al registrar personal"
        );
      }

      onSuccess();

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        bg-black/40
        flex items-center justify-center
        p-4
      "
    >
      <div
        className="
          bg-white
          rounded-3xl
          shadow-xl
          w-full
          max-w-5xl
          max-h-[90vh]
          overflow-y-auto
        "
      >
        {/* HEADER */}

        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-black text-[#2A5C4D]">
            Registrar Personal
          </h2>

          <p className="text-gray-500 mt-1">
            Complete la información del personal
          </p>
        </div>

        {/* FORM */}

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-8"
        >
          {/* DATOS PERSONALES */}

          <div>
            <h3 className="text-lg font-bold text-[#2A5C4D] mb-4">
              Información Personal
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre Completo *
                </label>

                <input
                  type="text"
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  CI *
                </label>

                <input
                  type="number"
                  name="ci"
                  value={form.ci}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Teléfono
                </label>

                <input
                  type="number"
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Fecha de Nacimiento *
                </label>

                <input
                  type="date"
                  name="fecha_nacimiento"
                  value={form.fecha_nacimiento}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">
                  Dirección
                </label>

                <input
                  type="text"
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2">
                  Descripción
                </label>

                <textarea
                  rows="3"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>
            </div>
          </div>

          {/* DATOS LABORALES */}

          <div>
            <h3 className="text-lg font-bold text-[#2A5C4D] mb-4">
              Información Laboral
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Especialidad
                </label>

                <input
                  type="text"
                  name="especialidad"
                  value={form.especialidad}
                  onChange={handleChange}
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    outline-none
                    focus:border-[#148F77]
                  "
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Cargo *
                </label>

                <select
                  name="id_cargo"
                  value={form.id_cargo}
                  onChange={handleChange}
                  required
                  className="
                    w-full
                    border border-gray-300
                    rounded-2xl
                    px-4 py-3
                    bg-white
                  "
                >
                  <option value="">
                    Seleccione un cargo
                  </option>

                    {cargos.map((cargo) => (
  <option
    key={cargo.id_cargo}
    value={cargo.id_cargo}
  >
    {cargo.cargo}
  </option>
))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">
                  Contrato *
                </label>

                <select
  name="id_contrato"
  value={form.id_contrato}
  onChange={handleChange}
  required
  className="
    w-full
    border border-gray-300
    rounded-2xl
    px-4 py-3
    bg-white
  "
>
  <option value="">
    Seleccione un contrato
  </option>

  <option value="1">
    TEMPORAL
  </option>

  <option value="2">
    INDEFINIDO
  </option>
</select>
              </div>
            </div>
          </div>

          {/* BOTONES */}

          <div
            className="
              flex flex-col-reverse
              sm:flex-row
              justify-end
              gap-3
              pt-4
              border-t
            "
          >
            <button
              type="button"
              onClick={onClose}
              className="
                px-5 py-3
                rounded-2xl
                bg-gray-200
                hover:bg-gray-300
                font-bold
              "
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={loading}
              className="
                px-5 py-3
                rounded-2xl
                bg-[#148F77]
                hover:bg-[#0E6B59]
                text-white
                font-bold
                disabled:opacity-50
              "
            >
              {loading
                ? "Guardando..."
                : "Registrar Personal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";


const API_URL = import.meta.env.VITE_API_URL;

export default function FormEditPersonal({
  personal,
  cargos = [],
  contratos = [],
  onClose,
  onSuccess,
}) {
  const token = localStorage.getItem("token");

  const [loading, setLoading] = useState(false);
  

  const [form, setForm] = useState({
    nombre: personal?.nombre || "",
    telefono: personal?.telefono || "",
    fecha_nacimiento: personal?.fecha_nacimiento
      ? personal.fecha_nacimiento.slice(0, 10)
      : "",
    direccion: personal?.direccion || "",
    ci: personal?.ci || "",
    descripcion: personal?.descripcion || "",
    especialidad: personal?.especialidad || "",
    id_cargo: personal?.id_cargo || "",
    estado:
      personal?.estado === undefined
        ? true
        : personal.estado,
  });
useEffect(() => {
  if (personal) {
    setForm({
      nombre: personal.nombre || "",
      telefono: personal.telefono || "",
      fecha_nacimiento: personal.fecha_nacimiento
        ? new Date(personal.fecha_nacimiento)
            .toISOString()
            .split("T")[0]
        : "",
      direccion: personal.direccion || "",
      ci: personal.ci || "",
      descripcion: personal.descripcion || "",
      especialidad: personal.especialidad || "",

      estado: personal.estado,
    });
  }
}, [personal]);
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);

    try {
      const res = await fetch(
        `${API_URL}/personal/${personal.id_personal}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.message || "Error al actualizar personal"
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
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-black text-[#2A5C4D]">
            Editar Personal
          </h2>

          <p className="text-gray-500 mt-1">
            Modifique la información del personal
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-6 space-y-8"
        >
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

              

              <div className="md:col-span-3">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="estado"
                    checked={form.estado}
                    onChange={handleChange}
                  />

                  <span className="font-semibold">
                    Personal activo
                  </span>
                </label>
              </div>

            </div>
          </div>

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
                : "Actualizar Personal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
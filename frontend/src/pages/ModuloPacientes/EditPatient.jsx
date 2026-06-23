import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function EditPatient({
  paciente,
  onSuccess,
  onClose
}) {

  const [formData, setFormData] = useState({
    nombre: '',
    ci: '',
    fecha_nacimiento: '',
    direccion: '',
    telefono: ''
  });

  const [loading, setLoading] = useState(false);

  // MENSAJES VISUALES
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  // ERRORES
  const [errors, setErrors] = useState({});

  useEffect(() => {

    if (paciente) {

      setFormData({
        nombre: paciente.nombre || '',
        ci: paciente.ci || '',
        fecha_nacimiento:
          paciente.fecha_nacimiento || '',
        direccion: paciente.direccion || '',
        telefono: paciente.telefono || ''
      });

    }

  }, [paciente]);

  const handleChange = (e) => {

    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    // LIMPIAR ERROR
    setErrors((prev) => ({
      ...prev,
      [name]: ''
    }));

  };

  const validate = () => {

    const nuevosErrores = {};

    // NOMBRE
    if (
      formData.nombre &&
      formData.nombre.trim().split(' ').length < 2
    ) {

      nuevosErrores.nombre =
        'Debe ingresar nombre y apellido';

    }

    // CI
    if (
      formData.ci &&
      isNaN(Number(formData.ci))
    ) {

      nuevosErrores.ci =
        'El CI debe ser numérico';

    }

    // TELÉFONO
    if (
      formData.telefono &&
      isNaN(Number(formData.telefono))
    ) {

      nuevosErrores.telefono =
        'El teléfono debe ser numérico';

    }

    // FECHA
    if (formData.fecha_nacimiento) {

      const fechaNacimiento =
        new Date(formData.fecha_nacimiento);

      const hoy = new Date();

      // FUTURA
      if (fechaNacimiento > hoy) {

        nuevosErrores.fecha_nacimiento =
          'La fecha no puede ser futura';

      }

      // MUY ANTIGUA
      const anio = fechaNacimiento.getFullYear();

      if (anio < 1900) {

        nuevosErrores.fecha_nacimiento =
          'Ingrese una fecha válida';

      }

      // EDAD NEGATIVA O IRREAL
      const edad =
        hoy.getFullYear() - anio;

      if (edad > 120) {

        nuevosErrores.fecha_nacimiento =
          'Edad no válida';

      }

    }

    setErrors(nuevosErrores);

    return Object.keys(nuevosErrores).length === 0;

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    setMensaje('');
    setTipoMensaje('');

    if (!validate()) return;

    try {

      setLoading(true);

      // SOLO CAMPOS MODIFICADOS
      const cambios = {};

      if (formData.nombre !== paciente.nombre) {
        cambios.nombre = formData.nombre;
      }

      if (
        String(formData.ci) !==
        String(paciente.ci)
      ) {

        cambios.ci = formData.ci;

      }

      if (
        formData.fecha_nacimiento !==
        paciente.fecha_nacimiento
      ) {

        cambios.fecha_nacimiento =
          formData.fecha_nacimiento;

      }

      if (
        formData.direccion !==
        paciente.direccion
      ) {

        cambios.direccion =
          formData.direccion;

      }

      if (
        String(formData.telefono) !==
        String(paciente.telefono)
      ) {

        cambios.telefono =
          formData.telefono;

      }

      // SI NO HAY CAMBIOS
      if (
        Object.keys(cambios).length === 0
      ) {

        setTipoMensaje('error');

        setMensaje(
          'No se realizaron cambios'
        );

        setLoading(false);

        return;

      }

      const res = await fetch(
        `${API_URL}/pacientes/${paciente.id}`,
        {
          method: 'PUT',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify(cambios)
        }
      );

      const data = await res.json();

      if (
        !res.ok ||
        data.success === false
      ) {

        throw new Error(
          data.message ||
          'Error al modificar paciente'
        );

      }

      setTipoMensaje('success');

      setMensaje(
        'Paciente modificado correctamente'
      );

      setTimeout(() => {

        onSuccess();

      }, 1200);

    } catch (err) {

      setTipoMensaje('error');

      setMensaje(
        err.message ||
        'Ocurrió un error inesperado'
      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="
      bg-white
      rounded-3xl
      shadow-2xl
      p-5
      sm:p-8
      w-full
    ">

      {/* HEADER */}
      <div className="mb-6">

        <h2 className="
          text-2xl
          sm:text-3xl
          font-black
          text-[#2A5C4D]
        ">
          Editar Paciente
        </h2>

        <p className="
          text-gray-500
          mt-1
        ">
          Modifique los datos necesarios
        </p>

      </div>

      {/* MENSAJES */}
      {mensaje && (

        <div
          className={`
            mb-5
            p-4
            rounded-xl
            font-semibold
            border
            ${
              tipoMensaje === 'error'
                ? 'bg-red-100 text-red-700 border-red-300'
                : 'bg-green-100 text-green-700 border-green-300'
            }
          `}
        >

          {mensaje}

        </div>

      )}

      {/* FORMULARIO */}
      <form
        onSubmit={handleSubmit}
        className="space-y-5"
      >

        {/* NOMBRE */}
        <div>

          <label className="
            block
            font-semibold
            text-gray-700
            mb-2
          ">
            Nombre Completo
          </label>

          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

          {errors.nombre && (

            <p className="
              text-red-500
              text-sm
              mt-1
              font-medium
            ">
              {errors.nombre}
            </p>

          )}

        </div>

        {/* CI */}
        <div>

          <label className="
            block
            font-semibold
            text-gray-700
            mb-2
          ">
            CI
          </label>

          <input
            type="text"
            name="ci"
            value={formData.ci}
            onChange={handleChange}
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

          {errors.ci && (

            <p className="
              text-red-500
              text-sm
              mt-1
              font-medium
            ">
              {errors.ci}
            </p>

          )}

        </div>

        {/* FECHA */}
        <div>

          <label className="
            block
            font-semibold
            text-gray-700
            mb-2
          ">
            Fecha de Nacimiento
          </label>

          <input
            type="date"
            name="fecha_nacimiento"
            value={formData.fecha_nacimiento}
            onChange={handleChange}
            max={new Date().toISOString().split('T')[0]}
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

          {errors.fecha_nacimiento && (

            <p className="
              text-red-500
              text-sm
              mt-1
              font-medium
            ">
              {errors.fecha_nacimiento}
            </p>

          )}

        </div>

        {/* DIRECCIÓN */}
        <div>

          <label className="
            block
            font-semibold
            text-gray-700
            mb-2
          ">
            Dirección
          </label>

          <input
            type="text"
            name="direccion"
            value={formData.direccion}
            onChange={handleChange}
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

        </div>

        {/* TELÉFONO */}
        <div>

          <label className="
            block
            font-semibold
            text-gray-700
            mb-2
          ">
            Teléfono
          </label>

          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            className="
              w-full
              border
              border-gray-300
              rounded-xl
              px-4
              py-3
              outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

          {errors.telefono && (

            <p className="
              text-red-500
              text-sm
              mt-1
              font-medium
            ">
              {errors.telefono}
            </p>

          )}

        </div>

        {/* BOTONES */}
        <div className="
          flex
          flex-col
          sm:flex-row
          gap-3
          pt-4
        ">

          <button
            type="button"
            onClick={onClose}
            className="
              flex-1
              bg-gray-200
              hover:bg-gray-300
              text-gray-700
              py-3
              rounded-xl
              font-bold
              transition
            "
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={loading}
            className="
              flex-1
              bg-[#148F77]
              hover:bg-[#0f6b59]
              disabled:opacity-50
              text-white
              py-3
              rounded-xl
              font-bold
              transition
            "
          >
            {loading
              ? 'Guardando...'
              : 'Guardar Cambios'}
          </button>

        </div>

      </form>

    </div>

  );
}
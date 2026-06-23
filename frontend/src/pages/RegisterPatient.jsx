import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

export default function FormularioPaciente({
  onClose,
  onSuccess
}) {

  const token = localStorage.getItem('token');

  const [formData, setFormData] = useState({
    nombre: '',
    ci: '',
    fecha_nacimiento: '',
    direccion: '',
    telefono: ''
  });

  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);

  // MENSAJE VISUAL
  const [mensaje, setMensaje] = useState('');

  const [tipoMensaje, setTipoMensaje] =
    useState('');

  const handleChange = (e) => {

    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    // LIMPIAR ERROR
    setErrors({
      ...errors,
      [e.target.name]: ''
    });

    // LIMPIAR MENSAJES
    setMensaje('');
    setTipoMensaje('');

  };

  const validate = () => {

    const newErrors = {};

    // NOMBRE
    if (
      formData.nombre &&
      formData.nombre.trim().split(' ').length < 2
    ) {

      newErrors.nombre =
        'Debe ingresar nombre y apellido';

    }

    // CI
    if (
      formData.ci &&
      isNaN(Number(formData.ci))
    ) {

      newErrors.ci =
        'El CI debe ser numérico';

    }

    // TELÉFONO
    if (
      formData.telefono &&
      isNaN(Number(formData.telefono))
    ) {

      newErrors.telefono =
        'El teléfono debe ser numérico';

    }

    // FECHA
    if (formData.fecha_nacimiento) {

      const fechaNacimiento =
        new Date(formData.fecha_nacimiento);

      const hoy = new Date();

      // FECHA FUTURA
      if (fechaNacimiento > hoy) {

        newErrors.fecha_nacimiento =
          'La fecha no puede ser futura';

      }

      // FECHA MUY ANTIGUA
      const anio =
        fechaNacimiento.getFullYear();

      if (anio < 1900) {

        newErrors.fecha_nacimiento =
          'Ingrese una fecha válida';

      }

      // EDAD IRREAL
      const edad =
        hoy.getFullYear() - anio;

      if (edad > 120) {

        newErrors.fecha_nacimiento =
          'Edad no válida';

      }

    }

    setErrors(newErrors);

    return (
      Object.keys(newErrors).length === 0
    );

  };

  const traducirError = (mensaje) => {

    const texto = mensaje.toLowerCase();

    // CI DUPLICADO
    if (
      texto.includes('ci') &&
      (
        texto.includes('duplicate') ||
        texto.includes('duplicado') ||
        texto.includes('unique') ||
        texto.includes('existe')
      )
    ) {

      return 'El CI ya se encuentra registrado';

    }

    // TELÉFONO DUPLICADO
    if (
      texto.includes('telefono') &&
      (
        texto.includes('duplicate') ||
        texto.includes('duplicado') ||
        texto.includes('unique') ||
        texto.includes('existe')
      )
    ) {

      return 'El teléfono ya se encuentra registrado';

    }

    // NOMBRE
    if (
      texto.includes('nombre')
    ) {

      return 'Nombre inválido';

    }

    return 'Ocurrió un error al registrar el paciente';

  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    setMensaje('');
    setTipoMensaje('');

    if (!validate()) return;

    setLoading(true);

    try {

      const res = await fetch(
        `${API_URL}/pacientes`,
        {
          method: 'POST',

          headers: {
            'Content-Type': 'application/json',

            ...(token && {
              Authorization: `Bearer ${token}`
            })
          },

          body: JSON.stringify(formData)
        }
      );

      const data = await res.json();

      if (
        !res.ok ||
        data.success === false
      ) {

        throw new Error(
          data.message ||
          'Error al registrar paciente'
        );

      }

      setTipoMensaje('success');

      setMensaje(
        'Paciente registrado correctamente'
      );

      setTimeout(() => {

        onSuccess?.();

        onClose?.();

      }, 1000);

    } catch (error) {

      setTipoMensaje('error');

      setMensaje(
        traducirError(
          error.message ||
          'Error de conexión'
        )
      );

    } finally {

      setLoading(false);

    }
  };

  return (

    <div className="
      bg-white
      p-5
      sm:p-8
      rounded-[2rem]
      shadow-xl
      w-full
      max-w-2xl
      mx-auto
      relative
    ">

      {/* BOTÓN CERRAR */}
      <button
        onClick={onClose}
        className="
          absolute
          top-4
          right-4
          text-gray-500
          hover:text-red-500
          text-xl
          font-black
        "
      >
        ✕
      </button>

      <h3 className="
        text-2xl
        font-black
        mb-6
        text-[#2A5C4D]
      ">
        Registrar Paciente
      </h3>

      {/* MENSAJES */}
      {mensaje && (

        <div
          className={`
            mb-5
            p-4
            rounded-2xl
            border
            font-semibold
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

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >

        {/* NOMBRE */}
        <div>

          <input
            name="nombre"
            placeholder="Nombre completo"
            value={formData.nombre}
            onChange={handleChange}
            required
            className="
              w-full
              p-3
              bg-gray-50
              rounded-xl
              border
              border-gray-200
              focus:outline-none
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

          <input
            name="ci"
            placeholder="CI"
            value={formData.ci}
            onChange={handleChange}
            required
            className="
              w-full
              p-3
              bg-gray-50
              rounded-xl
              border
              border-gray-200
              focus:outline-none
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

          <input
            type="date"
            name="fecha_nacimiento"
            value={formData.fecha_nacimiento}
            onChange={handleChange}
            required
            max={
              new Date()
                .toISOString()
                .split('T')[0]
            }
            className="
              w-full
              p-3
              bg-gray-50
              rounded-xl
              border
              border-gray-200
              focus:outline-none
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

          <input
            name="direccion"
            placeholder="Dirección"
            value={formData.direccion}
            onChange={handleChange}
            className="
              w-full
              p-3
              bg-gray-50
              rounded-xl
              border
              border-gray-200
              focus:outline-none
              focus:ring-2
              focus:ring-[#148F77]
            "
          />

        </div>

        {/* TELÉFONO */}
        <div>

          <input
            name="telefono"
            placeholder="Teléfono"
            value={formData.telefono}
            onChange={handleChange}
            className="
              w-full
              p-3
              bg-gray-50
              rounded-xl
              border
              border-gray-200
              focus:outline-none
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

        {/* BOTÓN */}
        <button
          type="submit"
          disabled={loading}
          className="
            w-full
            bg-[#148F77]
            hover:bg-[#0f6b59]
            text-white
            py-3
            rounded-xl
            font-bold
            transition
            disabled:opacity-60
          "
        >

          {loading
            ? 'Guardando...'
            : 'Registrar'}

        </button>

      </form>

    </div>

  );
}
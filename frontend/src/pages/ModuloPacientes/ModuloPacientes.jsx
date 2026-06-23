import { useState, useEffect } from 'react';

import FormularioPaciente from '../../pages/RegisterPatient';
import EditPatient from './EditPatient';

import HistorialClinico from './HistorialClinico';

const API_URL = import.meta.env.VITE_API_URL;


export default function ModuloPacientes() {

  const [pacientes, setPacientes] = useState([]);

  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };


  // MENSAJES VISUALES
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('');

  // MODALES
  const [showForm, setShowForm] = useState(false);

  const [showEditForm, setShowEditForm] = useState(false);

  const [showDeleteModal, setShowDeleteModal] =
    useState(false);

  const [busqueda, setBusqueda] = useState('');

  const [editandoPaciente, setEditandoPaciente] =
    useState(null);

  const [pacienteEliminar, setPacienteEliminar] =
    useState(null);
const [showHistorial, setShowHistorial] =
  useState(false);

const [pacienteHistorial, setPacienteHistorial] =
  useState(null);

const [historialPaciente, setHistorialPaciente] =
  useState(null);
const verHistorial = async (paciente) => {

  try {

    const res = await fetch(
  `${API_URL}/pacientes/${paciente.id}/historial`,
  {
    headers
  }
);

    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(
        data.message || 'Error al obtener historial'
      );
    }

    setPacienteHistorial(paciente);

    setHistorialPaciente(data.data);

    setShowHistorial(true);

  } catch (err) {

    setTipoMensaje('error');

    setMensaje(
      err.message || 'Error al obtener historial'
    );

  }

};
const recargarHistorial = async (idPaciente) => {

  try {

    const res = await fetch(
  `${API_URL}/pacientes/${idPaciente}/historial`,
  {
    headers
  }
);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(
        data.message || "Error al actualizar historial"
      );
    }

    setHistorialPaciente(data.data);

  } catch (err) {

    setTipoMensaje("error");

    setMensaje(
      err.message || "Error al actualizar historial"
    );

  }

};
  const fetchPacientes = async (nombre = '') => {

    try {

      setLoading(true);

      setMensaje('');
      setTipoMensaje('');

      let url = `${API_URL}/pacientes`;

      if (nombre.trim()) {
        url += `?nombre=${encodeURIComponent(nombre)}`;
      }

      const res = await fetch(url, {
  headers
});

      const data = await res.json();

      if (!res.ok || data.success === false) {

        throw new Error(
          data.message || 'Error al obtener pacientes'
        );

      }

      setPacientes(data.data || []);

    } catch (err) {

      setTipoMensaje('error');

      setMensaje(
        err.message || 'Ocurrió un error inesperado'
      );

    } finally {

      setLoading(false);

    }
  };

  useEffect(() => {
    fetchPacientes();
  }, []);

  const eliminarPaciente = async () => {

    if (!pacienteEliminar) return;

    try {

      setMensaje('');
      setTipoMensaje('');

      const res = await fetch(
  `${API_URL}/pacientes/${pacienteEliminar.id}`,
  {
    method: 'DELETE',
    headers
  }
);
      const data = await res.json();

      if (!res.ok || data.success === false) {

        throw new Error(
          data.message || 'Error al inhabilitar paciente'
        );

      }

      setTipoMensaje('success');

      setMensaje(
        'Paciente inhabilitado correctamente'
      );

      setShowDeleteModal(false);

      setPacienteEliminar(null);

      fetchPacientes(busqueda);

    } catch (err) {

      setTipoMensaje('error');

      setMensaje(
        err.message || 'Ocurrió un error inesperado'
      );

    }
  };

  return (

    <div className="w-full p-3 sm:p-5 md:p-6">

      {/* HEADER */}
      <div className="
        flex
        flex-col
        lg:flex-row
        lg:items-center
        lg:justify-between
        gap-4
        mb-6
      ">

        <div>

          <h2 className="
            text-2xl
            sm:text-3xl
            font-black
            text-[#2A5C4D]
          ">
            Pacientes
          </h2>

          <p className="
            text-gray-500
            text-sm
            sm:text-base
          ">
            Gestión de pacientes registrados
          </p>

        </div>

        <button
          onClick={() => {
            setShowForm(true);
          }}
          className="
            bg-[#148F77]
            hover:bg-[#0f6b59]
            text-white
            px-4
            sm:px-5
            py-3
            rounded-xl
            font-bold
            transition
            w-full
            sm:w-auto
          "
        >
          + Registrar Nuevo Paciente
        </button>

      </div>

      {/* MENSAJES */}
      {mensaje && (

        <div
          className={`
            mb-6
            p-4
            rounded-2xl
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

      {/* BUSCADOR */}
      <div className="
        bg-white
        rounded-2xl
        shadow
        p-4
        mb-6
      ">

        <div className="
          flex
          flex-col
          md:flex-row
          gap-3
        ">

          <input
            type="text"
            placeholder="Buscar paciente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="
              flex-1
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

          <button
            onClick={() => fetchPacientes(busqueda)}
            className="
              bg-[#2A5C4D]
              hover:bg-[#21473b]
              text-white
              px-6
              py-3
              rounded-xl
              font-bold
              transition
            "
          >
            Buscar
          </button>

        </div>

      </div>

      {/* LOADING */}
      {loading && (

        <div className="
          bg-white
          rounded-2xl
          shadow
          p-6
          text-center
        ">

          <p className="
            text-gray-500
            font-semibold
          ">
            Cargando pacientes...
          </p>

        </div>

      )}

      {/* SIN DATOS */}
      {!loading && pacientes.length === 0 && (

        <div className="
          bg-white
          rounded-2xl
          shadow
          p-6
          text-center
        ">

          <p className="
            text-gray-500
            font-semibold
          ">
            No hay pacientes registrados
          </p>

        </div>

      )}

{/* TABLA PACIENTES */}
{!loading && pacientes.length > 0 && (

  <div className="
    bg-white
    rounded-2xl
    shadow
    overflow-hidden
  ">

    <div className="overflow-x-auto">

      <table className="w-full">

        <thead>

          <tr className="bg-[#148F77] text-white">

            <th className="px-4 py-4 text-left">
              ID
            </th>

            <th className="px-4 py-4 text-left">
              Nombre
            </th>

            <th className="px-4 py-4 text-left">
              CI
            </th>

            <th className="px-4 py-4 text-left">
              Fecha Nacimiento
            </th>

            <th className="px-4 py-4 text-left">
              Teléfono
            </th>

            <th className="px-4 py-4 text-left">
              Dirección
            </th>

            <th className="px-4 py-4 text-center">
              Acciones
            </th>

          </tr>

        </thead>

        <tbody>

          {pacientes.map((p) => (

            <tr
              key={p.id}
              className="
                border-b
                hover:bg-gray-50
                transition
              "
            >

              <td className="px-4 py-4">
                {p.id}
              </td>

              <td className="px-4 py-4 font-semibold text-[#2A5C4D]">
                {p.nombre}
              </td>

              <td className="px-4 py-4">
                {p.ci}
              </td>

              <td className="px-4 py-4">
                {p.fecha_nacimiento}
              </td>

              <td className="px-4 py-4">
                {p.telefono || "-"}
              </td>

              <td className="px-4 py-4">
                {p.direccion || "-"}
              </td>

             <td className="px-4 py-4">

  <div className="flex gap-2 justify-center">

    <button
      onClick={() => verHistorial(p)}
      className="
        bg-green-500
        hover:bg-green-600
        text-white
        px-4
        py-2
        rounded-xl
        font-bold
      "
    >
      Historial
    </button>

    <button
      onClick={() => {
        setEditandoPaciente(p);
        setShowEditForm(true);
      }}
      className="
        bg-blue-500
        hover:bg-blue-600
        text-white
        px-4
        py-2
        rounded-xl
        font-bold
      "
    >
      Editar
    </button>

    <button
      onClick={() => {
        setPacienteEliminar(p);
        setShowDeleteModal(true);
      }}
      className="
        bg-red-500
        hover:bg-red-600
        text-white
        px-4
        py-2
        rounded-xl
        font-bold
      "
    >
      Inhabilitar
    </button>

  </div>

</td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  </div>

)}

      {/* MODAL REGISTRAR */}
      {showForm && (

        <div className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          z-50
          p-2
          sm:p-4
        ">

          <div className="
            relative
            w-full
            max-w-3xl
            max-h-[95vh]
            overflow-y-auto
          ">

            <button
              onClick={() => {
                setShowForm(false);
              }}
              className="
                absolute
                top-3
                right-3
                w-10
                h-10
                flex
                items-center
                justify-center
                rounded-full
                bg-white
                hover:bg-red-100
                text-gray-600
                hover:text-red-500
                font-bold
                shadow
                z-10
              "
            >
              ✕
            </button>

            <FormularioPaciente
              onClose={() => {
                setShowForm(false);
              }}

              onSuccess={() => {

                setShowForm(false);

                fetchPacientes(busqueda);

              }}
            />

          </div>

        </div>

      )}

      {/* MODAL EDITAR */}
      {showEditForm && (

        <div className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          z-50
          p-2
          sm:p-4
        ">

          <div className="
            relative
            w-full
            max-w-3xl
            max-h-[95vh]
            overflow-y-auto
          ">

            <button
              onClick={() => {

                setShowEditForm(false);

                setEditandoPaciente(null);

              }}
              className="
                absolute
                top-3
                right-3
                w-10
                h-10
                flex
                items-center
                justify-center
                rounded-full
                bg-white
                hover:bg-red-100
                text-gray-600
                hover:text-red-500
                font-bold
                shadow
                z-10
              "
            >
              ✕
            </button>

            <EditPatient

              paciente={editandoPaciente}

              onClose={() => {

                setShowEditForm(false);

                setEditandoPaciente(null);

              }}

              onSuccess={() => {

                setShowEditForm(false);

                setEditandoPaciente(null);

                fetchPacientes(busqueda);

              }}

            />

          </div>

        </div>

      )}
      {showHistorial && (

  <div
    className="
      fixed
      inset-0
      bg-black/50
      flex
      items-center
      justify-center
      z-50
      p-4
    "
  >

    <div
      className="
        relative
        w-full
        max-w-5xl
        max-h-[95vh]
        overflow-y-auto
      "
    >

      <button
        onClick={() => {

          setShowHistorial(false);

          setPacienteHistorial(null);

          setHistorialPaciente(null);

        }}
        className="
          absolute
          top-3
          right-3
          w-10
          h-10
          rounded-full
          bg-white
          shadow
          font-bold
          z-10
        "
      >
        ✕
      </button>

      <HistorialClinico
        paciente={pacienteHistorial}
        historial={historialPaciente}
          onActualizado={() =>
    recargarHistorial(pacienteHistorial.id)
  }
      />

    </div>

  </div>

)}

      {/* MODAL ELIMINAR */}
      {showDeleteModal && (

        <div className="
          fixed
          inset-0
          bg-black/50
          flex
          items-center
          justify-center
          z-50
          p-4
        ">

          <div className="
            bg-white
            rounded-3xl
            shadow-2xl
            w-full
            max-w-md
            p-6
          ">

            <h2 className="
              text-2xl
              font-black
              text-[#2A5C4D]
              mb-3
            ">
              Inhabilitar Paciente
            </h2>

            <p className="
              text-gray-600
              mb-6
            ">
              ¿Desea inhabilitar este paciente?
            </p>

            <div className="
              flex
              flex-col
              sm:flex-row
              gap-3
            ">

              <button
                onClick={() => {

                  setShowDeleteModal(false);

                  setPacienteEliminar(null);

                }}
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
                onClick={eliminarPaciente}
                className="
                  flex-1
                  bg-red-500
                  hover:bg-red-600
                  text-white
                  py-3
                  rounded-xl
                  font-bold
                  transition
                "
              >
                Inhabilitar
              </button>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}
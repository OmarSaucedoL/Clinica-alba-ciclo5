import { useState, useEffect } from "react";

const API_URL = import.meta.env.VITE_API_URL;

export default function HistorialClinico({
  paciente,
  historial,
}) {

  const [editando, setEditando] = useState(!historial);

  const [alergia, setAlergia] = useState(false);

  const [afectacionMedica, setAfectacionMedica] =
    useState(false);

  const [descripcion, setDescripcion] =
    useState("");

  const [guardando, setGuardando] =
    useState(false);

  useEffect(() => {

    if (historial) {

      setAlergia(historial.alergia);

      setAfectacionMedica(
        historial.afectacion_medica
      );

      setDescripcion(
        historial.descripcion || ""
      );

    }

  }, [historial]);

  const guardarHistorial = async () => {

    try {

      setGuardando(true);

      const body = {
        alergia,
        afectacion_medica: afectacionMedica,
        descripcion,
      };

      const res = await fetch(
        `${API_URL}/pacientes/${paciente.id}/historial`,
        {
          method: historial ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok || data.success === false) {

        throw new Error(
          data.message ||
          "Error al guardar historial"
        );

      }

      alert(
        historial
          ? "Historial actualizado"
          : "Historial registrado"
      );

      window.location.reload();

    } catch (err) {

      alert(
        err.message ||
        "Error al guardar historial"
      );

    } finally {

      setGuardando(false);

    }

  };

  if (!paciente) {

    return (
      <div className="p-6">
        <div className="bg-white rounded-3xl shadow-sm p-8 text-center">
          <p className="text-gray-500 font-semibold">
            No se seleccionó ningún paciente
          </p>
        </div>
      </div>
    );

  }

  return (

    <div className="w-full p-3 md:p-6">

      {/* HEADER */}

      <div className="mb-6">

        <h2 className="text-3xl font-black text-[#2A5C4D]">
          Historial Clínico
        </h2>

        <p className="text-gray-500 mt-1">
          Información médica registrada del paciente
        </p>

      </div>

      {/* PACIENTE */}

      <div
        className="
          bg-white
          rounded-3xl
          shadow-sm
          border
          border-gray-100
          p-6
          mb-6
        "
      >

        <div className="grid md:grid-cols-2 gap-4">

          <div>

            <p className="text-xs font-bold text-gray-400 uppercase">
              Paciente
            </p>

            <p className="text-xl font-black text-[#2A5C4D]">
              {paciente.nombre}
            </p>

          </div>

          <div>

            <p className="text-xs font-bold text-gray-400 uppercase">
              CI
            </p>

            <p className="text-xl font-black text-[#2A5C4D]">
              {paciente.ci}
            </p>

          </div>

        </div>

      </div>

      {/* HISTORIAL */}

      <div
        className="
          bg-white
          rounded-3xl
          shadow-sm
          border
          border-gray-100
          p-6
        "
      >

        <div className="flex justify-between items-center mb-5">

          <h3 className="text-xl font-black text-[#2A5C4D]">
            Historial Clínico
          </h3>

          {historial && !editando && (

            <button
              onClick={() => setEditando(true)}
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
              Editar Historial
            </button>

          )}

        </div>

        {!historial || editando ? (

          <div className="space-y-5">

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                checked={alergia}
                onChange={(e) =>
                  setAlergia(e.target.checked)
                }
              />

              <span>Alergias</span>

            </label>

            <label className="flex items-center gap-3">

              <input
                type="checkbox"
                checked={afectacionMedica}
                onChange={(e) =>
                  setAfectacionMedica(
                    e.target.checked
                  )
                }
              />

              <span>Afectación Médica</span>

            </label>

            <div>

              <p className="font-semibold mb-2">
                Descripción
              </p>

              <textarea
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }
                rows={5}
                className="
                  w-full
                  border
                  border-gray-300
                  rounded-xl
                  p-3
                "
              />

            </div>

            <button
              onClick={guardarHistorial}
              disabled={guardando}
              className="
                bg-[#148F77]
                hover:bg-[#0f6b59]
                text-white
                px-6
                py-3
                rounded-xl
                font-bold
              "
            >
              {guardando
                ? "Guardando..."
                : historial
                ? "Actualizar Historial"
                : "Registrar Historial"}
            </button>

          </div>

        ) : (

          <div className="space-y-5">

            <div>

              <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                Alergias
              </p>

              <p className="font-semibold">
                {historial.alergia
                  ? "Sí"
                  : "No"}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                Afectación Médica
              </p>

              <p className="font-semibold">
                {historial.afectacion_medica
                  ? "Sí"
                  : "No"}
              </p>

            </div>

            <div>

              <p className="text-xs font-bold text-gray-400 uppercase mb-1">
                Descripción
              </p>

              <p className="text-gray-700">
                {historial.descripcion ||
                  "Sin descripción"}
              </p>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}
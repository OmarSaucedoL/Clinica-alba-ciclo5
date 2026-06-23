import { useState, useEffect } from "react";
import AgendaPersonal from "./AgendaPersonal";

export default function ModuloCitas({
  openModal,
  openAgendaModal,
  dataMaster,
  user,
  onVerDetalles,
  defaultShowAgendaPersonal = false,
  onCloseAgendaPersonal,
}) {
  const [showAgendaPersonal, setShowAgendaPersonal] = useState(defaultShowAgendaPersonal);

  useEffect(() => {
    setShowAgendaPersonal(defaultShowAgendaPersonal);
  }, [defaultShowAgendaPersonal]);

  const actions = [
    {
      title: "Registrar Cita",
      description: "Programar una nueva cita para un paciente.",
      action: "registrar",
    },
    {
      title: "Consultar Cita",
      description: "Ver el calendario y buscar citas existentes.",
      action: "consultar",
    },
  ];

  return (
    <div className="animate-fade-in-up w-full relative">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight italic">
            Gestor de Citas
          </h2>
          <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
            Seleccione una operación a realizar
          </p>
        </div>

        <button
          onClick={() => setShowAgendaPersonal(true)}
          className="bg-[#148F77] text-white px-5 py-2 rounded-xl font-bold hover:bg-[#0f6b59] transition shadow-md"
        >
          Agenda de citas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {actions.map((item, index) => (
          <button
            key={index}
            onClick={() => {
              if (item.action === "registrar" && openModal) {
                openModal();
              } else if (item.action === "consultar" && openAgendaModal) {
                openAgendaModal();
              } else {
                console.log("Acción seleccionada:", item.action);
              }
            }}
            className="bg-[#148F77] text-white p-12 rounded-[3rem] shadow-xl cursor-pointer hover:bg-[#0f6b59] transition-all flex justify-between items-center w-full focus:outline-none transform hover:-translate-y-1 group"
          >
            <div className="text-left">
              <h3 className="text-2xl font-black italic mb-2">{item.title}</h3>
              <p className="opacity-70 text-sm font-medium">
                {item.description}
              </p>
            </div>
            <span className="text-5xl font-light opacity-80 group-hover:scale-110 transition-transform">
              {item.symbol}
            </span>
          </button>
        ))}
      </div>

      {showAgendaPersonal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl p-6">
            <button
              onClick={() => {
                setShowAgendaPersonal(false);
                if (onCloseAgendaPersonal) onCloseAgendaPersonal();
              }}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-500 font-bold z-10 transition-colors"
            >
              ✕
            </button>
            <AgendaPersonal
              onClose={() => {
                setShowAgendaPersonal(false);
                if (onCloseAgendaPersonal) onCloseAgendaPersonal();
              }}
              dataMaster={dataMaster}
              user={user}
              onVerDetalles={(cita) => {
                setShowAgendaPersonal(false);
                onVerDetalles(cita, true);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

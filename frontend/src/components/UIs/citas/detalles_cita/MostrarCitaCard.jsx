import {
  ESTADO_CITA,
  ESTADO_CITA_LABELS,
  ESTADO_CITA_COLORS,
} from "../../../../constants/enums";

export default function MostrarCitaCard({
  cita,
  saveError,
  saving,
  handleStatusUpdate,
  handleReprogramar,
  setIsEditing,
  onClose,
}) {
  if (!cita) return null;

  return (
    <div className="space-y-6 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
      {saveError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase animate-shake">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Paciente
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.nombre_paciente}
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Especialista
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.nombre_personal}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">
            Fecha Agendada
          </p>
          <div className="text-xl font-black text-[#2A5C4D]">
            {cita.fecha_agendamiento || "Cargando..."}
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Sala
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.nombre_sala}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Fecha de Registro
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.fecha_registro || "N/A"}
          </p>
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Fecha de Finalización
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.fecha_finalizacion || (
              <span className="italic opacity-50">Pendiente</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Estado Actual
          </p>
          {(() => {
            const colors =
              ESTADO_CITA_COLORS[cita.id_estado_cita] ||
              ESTADO_CITA_COLORS[ESTADO_CITA.PROGRAMADA];
            const label =
              cita.nombre_estado ||
              ESTADO_CITA_LABELS[cita.id_estado_cita] ||
              `Estado ${cita.id_estado_cita}`;
            return (
              <span
                className={`px-3 py-1 mt-1 inline-block rounded-full text-[10px] font-black uppercase tracking-wider ${colors.badge}`}
              >
                {label}
              </span>
            );
          })()}
        </div>
        <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
            Tratamiento / Procedimiento
          </p>
          <p className="text-sm font-bold text-gray-800">
            {cita.nombre_procedimiento || (
              <span className="italic opacity-50">
                Sin tratamiento asignado
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
          Observaciones
        </p>
        <p className="text-sm font-medium text-gray-600">
          {cita.cita_obs || (
            <span className="italic opacity-50">
              Sin observaciones registradas.
            </span>
          )}
        </p>
      </div>

      <div className="pt-6 border-t border-gray-100 space-y-4">
        <div className="flex gap-3">
          <button
            onClick={() => handleStatusUpdate("FINALIZADA")}
            disabled={saving}
            className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? "..." : "Finalizar"}
          </button>
          <button
            onClick={() => handleStatusUpdate("CANCELADA")}
            disabled={saving}
            className="flex-1 py-3 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? "..." : "Cancelar"}
          </button>
          <button
            onClick={handleReprogramar}
            disabled={saving}
            className="flex-1 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? "..." : "Reprogramar"}
          </button>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setIsEditing(true)}
            className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all cursor-pointer"
          >
            Modificar Cita
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
          >
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}

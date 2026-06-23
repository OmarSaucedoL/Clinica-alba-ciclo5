import { ESTADO_CITA } from "../../../../constants/enums";

export default function EditarCitaForm({
  formData,
  setFormData,
  pacientesResult,
  dataMaster,
  loadingSlots,
  slotsDisponibles,
  saving,
  saveError,
  handleSave,
  setIsEditing,
}) {
  return (
    <div className="space-y-6 bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
      {saveError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Paciente
          </label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
            value={formData.id_paciente}
            onChange={(e) =>
              setFormData({
                ...formData,
                id_paciente: e.target.value,
              })
            }
          >
            <option value="">Seleccione Paciente</option>
            {pacientesResult.map((p) => (
              <option
                key={p.id_persona || p.id_usuario || p.id}
                value={p.id_persona || p.id_usuario || p.id}
              >
                {p.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Especialista
          </label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
            value={formData.id_personal}
            onChange={(e) =>
              setFormData({
                ...formData,
                id_personal: e.target.value,
                hora_seleccionada: "",
              })
            }
          >
            <option value="">Seleccione Especialista</option>
            {dataMaster?.odontologos?.map((o) => (
              <option
                key={o.id_usuario || o.id_persona || o.id}
                value={o.id_usuario || o.id_persona || o.id}
              >
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Sala
          </label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
            value={formData.id_sala}
            onChange={(e) =>
              setFormData({
                ...formData,
                id_sala: e.target.value,
                hora_seleccionada: "",
              })
            }
          >
            <option value="">Seleccione Sala</option>
            {(dataMaster?.salas || [])
              .filter(
                (s) =>
                  s.estado_sala === "ACTIVA" ||
                  s.estado_sala === "DISPONIBLE" ||
                  s.id_sala == formData.id_sala,
              )
              .map((s) => (
                <option key={s.id_sala} value={s.id_sala}>
                  {s.nombre}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Fecha
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              placeholder="DD/MM/AA"
              value={
                formData.fecha_base
                  ? (() => {
                      const [y, m, d] = formData.fecha_base.split("-");
                      return `${d}/${m}/${y.slice(-2)}`;
                    })()
                  : ""
              }
              className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 cursor-pointer"
              onClick={(e) => e.target.nextSibling.showPicker()}
            />
            <input
              type="date"
              className="absolute opacity-0 inset-0 pointer-events-none"
              value={formData.fecha_base}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fecha_base: e.target.value,
                  hora_seleccionada: "",
                })
              }
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-[2rem] p-6 border border-dashed border-gray-200 min-h-[130px]">
        <p className="text-[9px] font-black text-gray-400 uppercase mb-4 tracking-widest">
          Horarios Disponibles:
        </p>
        {loadingSlots ? (
          <div className="flex justify-center py-4 space-x-2">
            <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-[#148F77] rounded-full animate-bounce delay-150"></div>
          </div>
        ) : slotsDisponibles.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {slotsDisponibles.map((slot, index) => {
              const horaValue = slot.inicio.slice(0, 5);
              return (
                <button
                  key={index}
                  type="button"
                  className={`p-2 rounded-xl text-xs font-bold transition-all ${
                    formData.hora_seleccionada === horaValue
                      ? "bg-[#148F77] text-white shadow-md transform scale-105"
                      : "bg-white text-gray-600 hover:bg-emerald-50 hover:text-[#148F77]"
                  }`}
                  onClick={() =>
                    setFormData({
                      ...formData,
                      hora_seleccionada: horaValue,
                    })
                  }
                >
                  {horaValue}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-gray-400 text-xs italic py-4">
            {!formData.id_personal ||
            !formData.id_sala ||
            !formData.fecha_base
              ? "Seleccione Odontólogo, Sala y Fecha para ver horarios"
              : "No hay horarios disponibles"}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Estado
          </label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
            value={formData.estado_cita}
            onChange={(e) =>
              setFormData({
                ...formData,
                estado_cita: e.target.value,
              })
            }
          >
            <option value={ESTADO_CITA.PROGRAMADA}>Programada</option>
            <option value={ESTADO_CITA.COMPLETADA}>Completada</option>
            <option value={ESTADO_CITA.CANCELADA}>Cancelada</option>
            <option value={ESTADO_CITA.REPROGRAMADA}>Reprogramada</option>
            <option value={ESTADO_CITA.NO_ASISTIO}>No Asistió</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
            Tratamiento / Procedimiento
          </label>
          <select
            className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
            value={formData.id_procedimiento || ""}
            onChange={(e) =>
              setFormData({
                ...formData,
                id_procedimiento: e.target.value,
              })
            }
          >
            <option value="">Cualquier servicio...</option>
            {(dataMaster?.procedimientos || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.descripcion}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
          Observaciones
        </label>
        <textarea
          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-medium border-none outline-none focus:ring-4 focus:ring-emerald-50 resize-none h-24"
          value={formData.cita_obs}
          onChange={(e) =>
            setFormData({ ...formData, cita_obs: e.target.value })
          }
          placeholder="Detalles adicionales..."
        ></textarea>
      </div>

      <div className="pt-4 flex gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Guardando..." : "Guardar Cambios"}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          disabled={saving}
          className="flex-1 py-4 bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

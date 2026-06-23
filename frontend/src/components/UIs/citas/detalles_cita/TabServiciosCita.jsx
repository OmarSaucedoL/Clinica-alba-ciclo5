export default function TabServiciosCita({
  isCitaTerminada,
  servicesError,
  loadingServicios,
  serviciosCita,
  catalogoServicios,
  selectedServicioId,
  setSelectedServicioId,
  customPrecio,
  setCustomPrecio,
  addingServicio,
  handleAddServicio,
  handleDeleteServicio,
}) {
  return (
    <>
      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
        <div>
          <h4 className="text-lg font-black text-[#2A5C4D] italic tracking-tight">
            Servicios Realizados
          </h4>
          <p className="text-[9px] text-[#148F77] font-black uppercase tracking-widest mt-0.5">
            Cargos aplicados
          </p>
        </div>
      </div>

      {servicesError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl">
          {servicesError}
        </div>
      )}

      {loadingServicios ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : serviciosCita.length === 0 ? (
        <p className="text-center text-gray-400 text-xs italic py-6">
          No se han registrado servicios en esta cita.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {serviciosCita.map((serv) => (
              <div
                key={serv.id_cita_servicio}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-emerald-50/10 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-gray-700">
                    {serv.nombre}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium">
                    Registrado: {serv.fecha_creacion}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#2A5C4D]">
                    Bs {serv.precio.toFixed(2)}
                  </span>
                  {!isCitaTerminada && (
                    <button
                      onClick={() =>
                        handleDeleteServicio(serv.id_cita_servicio)
                      }
                      className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-xs transition-colors focus:outline-none cursor-pointer"
                      title="Remover de la cita"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between items-center px-2">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Total Servicios:
            </span>
            <span className="text-xl font-black text-[#2A5C4D]">
              Bs{" "}
              {serviciosCita
                .reduce((acc, curr) => acc + curr.precio, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Formulario para agregar servicios */}
      {!isCitaTerminada && (
        <form
          onSubmit={handleAddServicio}
          className="border-t border-gray-100 pt-6 space-y-4"
        >
          <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest">
            Agregar Servicio a la Cita
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Servicio
              </label>
              <select
                required
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                value={selectedServicioId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedServicioId(val);
                  // Pre-llenar el precio sugerido
                  const selected = catalogoServicios.find(
                    (s) => String(s.id) === String(val),
                  );
                  if (selected) {
                    setCustomPrecio(selected.precio);
                  } else {
                    setCustomPrecio("");
                  }
                }}
              >
                <option value="">Seleccione un servicio...</option>
                {catalogoServicios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre} (Bs {s.precio.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Precio Cobrado (Bs)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                value={customPrecio}
                onChange={(e) => setCustomPrecio(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={addingServicio || !selectedServicioId}
              className="w-full py-4 bg-[#148F77] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#0f6b59] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {addingServicio ? "Agregando..." : "+ Agregar Servicio"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

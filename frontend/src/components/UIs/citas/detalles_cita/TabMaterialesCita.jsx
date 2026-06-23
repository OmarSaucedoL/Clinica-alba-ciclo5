export default function TabMaterialesCita({
  isCitaTerminada,
  materialsError,
  loadingMateriales,
  materialesCita,
  catalogoMateriales,
  lotesMaterial,
  selectedMaterialId,
  setSelectedMaterialId,
  selectedLoteId,
  setSelectedLoteId,
  cantidadMaterial,
  setCantidadMaterial,
  selectedServicioIdForMaterial,
  setSelectedServicioIdForMaterial,
  selectedDienteCodigo,
  setSelectedDienteCodigo,
  materialObservacion,
  setMaterialObservacion,
  serviciosCita,
  catalogoDientes,
  addingMaterial,
  handleAddMaterial,
  handleDeleteMaterial,
  fetchLotesMaterial,
}) {
  return (
    <>
      <div className="flex justify-between items-center border-b border-gray-50 pb-4">
        <div>
          <h4 className="text-lg font-black text-[#2A5C4D] italic tracking-tight">
            Materiales Consumidos
          </h4>
          <p className="text-[9px] text-[#148F77] font-black uppercase tracking-widest mt-0.5">
            Insumos clínicos utilizados
          </p>
        </div>
      </div>

      {materialsError && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl">
          {materialsError}
        </div>
      )}

      {loadingMateriales ? (
        <div className="flex justify-center py-6">
          <div className="w-6 h-6 border-2 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : materialesCita.length === 0 ? (
        <p className="text-center text-gray-400 text-xs italic py-6">
          No se han registrado materiales en esta cita.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {materialesCita.map((mat) => (
              <div
                key={mat.id_movimiento}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:bg-emerald-50/10 transition-colors"
              >
                <div>
                  <p className="text-xs font-bold text-gray-700">
                    {mat.nombre_material}
                  </p>
                  <p className="text-[9px] text-gray-400 font-medium">
                    Lote: #{mat.id_lote} | Cantidad: {mat.cantidad} u
                  </p>
                  {(mat.nombre_servicio || mat.codigo_diente || mat.observacion) && (
                    <div className="mt-1.5 space-y-0.5 border-t border-gray-100 pt-1">
                      {mat.nombre_servicio && (
                        <p className="text-[9px] text-emerald-700 font-semibold flex items-center gap-1">
                          <span className="font-bold">Servicio:</span> {mat.nombre_servicio}
                        </p>
                      )}
                      {mat.codigo_diente && (
                        <p className="text-[9px] text-[#2A5C4D] font-semibold flex items-center gap-1">
                          <span className="font-bold">Diente:</span> {mat.codigo_diente} - {mat.nombre_diente}
                        </p>
                      )}
                      {mat.observacion && (
                        <p className="text-[9px] text-gray-500 font-medium italic flex items-center gap-1">
                          <span className="font-bold">Obs:</span> {mat.observacion}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#2A5C4D]">
                    Bs {mat.subtotal.toFixed(2)}
                  </span>
                  {!isCitaTerminada && (
                    <button
                      onClick={() =>
                        handleDeleteMaterial(mat.id_movimiento)
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
              Total Materiales:
            </span>
            <span className="text-xl font-black text-[#2A5C4D]">
              Bs{" "}
              {materialesCita
                .reduce((acc, curr) => acc + curr.subtotal, 0)
                .toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Formulario para agregar materiales */}
      {!isCitaTerminada && (
        <form
          onSubmit={handleAddMaterial}
          className="border-t border-gray-100 pt-6 space-y-4"
        >
          <p className="text-[10px] font-black text-[#148F77] uppercase tracking-widest">
            Registrar Consumo de Material
          </p>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Material
              </label>
              <select
                required
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                value={selectedMaterialId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedMaterialId(val);
                  setSelectedLoteId("");
                  fetchLotesMaterial(val);
                }}
              >
                <option value="">Seleccione un material...</option>
                {catalogoMateriales.map((m) => (
                  <option key={m.id_material} value={m.id_material}>
                    {m.nombre_material} (Bs {m.precio_venta.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Lote de Inventario (Stock Disponible)
              </label>
              <select
                required
                disabled={!selectedMaterialId}
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                value={selectedLoteId}
                onChange={(e) => setSelectedLoteId(e.target.value)}
              >
                <option value="">Seleccione un lote...</option>
                {lotesMaterial.map((l) => (
                  <option key={l.id_lote} value={l.id_lote}>
                    Lote #{l.id_lote} (Stock: {l.cantidad_disponible} u) {l.fecha_caducidad ? `| Vence: ${l.fecha_caducidad}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Cantidad a Consumir
              </label>
              <input
                type="number"
                min="1"
                required
                placeholder="0"
                disabled={!selectedLoteId}
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                value={cantidadMaterial}
                onChange={(e) => setCantidadMaterial(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest whitespace-nowrap">
                  Servicio (Opcional)
                </label>
                <select
                  disabled={!selectedLoteId}
                  className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                  value={selectedServicioIdForMaterial}
                  onChange={(e) => setSelectedServicioIdForMaterial(e.target.value)}
                >
                  <option value="">Ninguno...</option>
                  {serviciosCita.map((s) => (
                    <option key={s.id_cita_servicio} value={s.id_servicio}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest whitespace-nowrap">
                  Diente (Opcional)
                </label>
                <select
                  disabled={!selectedLoteId}
                  className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                  value={selectedDienteCodigo}
                  onChange={(e) => setSelectedDienteCodigo(e.target.value)}
                >
                  <option value="">Ninguno...</option>
                  {catalogoDientes.map((d) => (
                    <option key={d.codigo} value={d.codigo}>
                      {d.codigo} - {d.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase ml-2 tracking-widest">
                Observación (Opcional)
              </label>
              <input
                type="text"
                maxLength="250"
                placeholder="Notas u observaciones sobre el uso de este material..."
                disabled={!selectedLoteId}
                className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50 disabled:opacity-50"
                value={materialObservacion}
                onChange={(e) => setMaterialObservacion(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={addingMaterial || !selectedLoteId || !cantidadMaterial}
              className="w-full py-4 bg-[#148F77] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#0f6b59] active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              {addingMaterial ? "Registrando..." : "+ Registrar Consumo"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

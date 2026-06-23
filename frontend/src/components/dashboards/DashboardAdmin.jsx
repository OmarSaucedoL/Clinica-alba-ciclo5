export default function DashboardAdmin({ setView }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
      {/* TARJETA ESTADO DEL SISTEMA */}
      <div className="bg-[#2A5C4D] text-white p-12 rounded-[3rem] shadow-xl relative overflow-hidden group">
        <div className="relative z-10">
          <h2 className="text-3xl font-black mb-2 italic">Estado del Sistema</h2>
          <p className="opacity-70 text-xs uppercase tracking-widest mb-8">Administración</p>
          <div className="flex gap-4">
            <div className="bg-white/10 p-4 rounded-2xl text-center flex-1 backdrop-blur-sm border border-white/5">
              <p className="text-2xl font-black">100%</p>
              <p className="text-[8px] uppercase font-bold opacity-50 mt-1 tracking-widest">DISPONIBILIDAD</p>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl text-center flex-1 backdrop-blur-sm border border-white/5">
              <p className="text-2xl font-black">ONLINE</p>
              <p className="text-[8px] uppercase font-bold opacity-50 mt-1 tracking-widest">CLÍNICA ALBA</p>
            </div>
          </div>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-500"></div>
      </div>

      {/* TARJETA DE AUDITORÍA (INTERACTIVA) */}
      <button 
        onClick={() => setView('bitacora')}
        className="bg-orange-500 text-white p-12 rounded-[3rem] shadow-xl flex flex-col justify-center text-left relative overflow-hidden group active:scale-95 transition-all hover:bg-orange-600"
      >
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-black italic">AUDITORÍA</h3>
            <span className="text-2xl opacity-50 group-hover:translate-x-2 transition-transform duration-300">→</span>
          </div>
          <p className="text-sm opacity-90 leading-relaxed mb-6 max-w-[280px]">
            Registro de actividades y eventos importantes. Control de acceso y modificaciones realizadas.
          </p>
          <div className="inline-block px-4 py-2 bg-white/20 rounded-xl text-[9px] font-black uppercase tracking-widest">
            Ver Registros Recientes
          </div>
        </div>
        {/* Decoración de fondo */}
        <div className="absolute -right-5 -top-5 w-32 h-32 bg-black/10 rounded-full blur-2xl group-hover:scale-125 transition-all duration-700"></div>
      </button>
    </div>
  );
}
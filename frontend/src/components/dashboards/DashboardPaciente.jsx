export default function DashboardPaciente({ openModal }) {
  return (
      <div className="animate-fade-in">
          <div onClick={openModal} className="bg-gradient-to-br from-[#148F77] to-[#2A5C4D] text-white p-12 rounded-[3rem] shadow-2xl cursor-pointer hover:scale-[1.01] transition-transform">
              <h2 className="text-4xl font-black mb-3 tracking-tighter italic">Cuidamos tu Sonrisa, queremos que seas la mejor versión de ti</h2>
              <p className="opacity-80 text-sm mb-10 leading-relaxed max-w-md">Agenda tu cita hoy mismo con nuestros especialistas. Horarios: Lun-Vie (08:00-19:00) y Sáb (09:00-13:00).</p>
              <div className="bg-white/20 inline-block px-10 py-4 rounded-full font-black text-xs uppercase tracking-widest shadow-sm">
                  AGENDAR CITA ➔
              </div>
          </div>
      </div>
  );
}
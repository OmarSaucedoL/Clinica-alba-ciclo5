export default function DashboardRecepcionista({ openModal }) {
  return (
      <div onClick={openModal} className="bg-[#148F77] text-white p-12 rounded-[3rem] shadow-xl cursor-pointer hover:bg-[#0f6b59] transition-all flex justify-between items-center animate-fade-in">
          <div>
              <h2 className="text-3xl font-black italic mb-2">Agenda Clínica</h2>
              <p className="opacity-70 text-sm">Registrar atención presencial o nueva cita</p>
          </div>
          <span className="text-5xl font-light">＋</span>
      </div>
  );
}
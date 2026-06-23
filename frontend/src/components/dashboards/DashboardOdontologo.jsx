export default function DashboardOdontologo({ openModal }) {
  return (
      <div onClick={openModal} className="bg-[#148F77] text-white p-12 rounded-[3rem] shadow-xl cursor-pointer hover:bg-[#0f6b59] transition-all flex justify-between items-center animate-fade-in">
          <div>
              <h2 className="text-3xl font-black italic mb-2">Operaciones Clínicas</h2>
              <p className="opacity-70 text-sm">Registrar atención presencial o cirugía</p>
          </div>
          <span className="text-5xl font-light">＋</span>
      </div>
  );
}
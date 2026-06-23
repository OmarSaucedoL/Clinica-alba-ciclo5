import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import logo from '../assets/LOGO.png'; 
import dent from '../assets/dent.jpg';
import fondoWelcome from '../assets/Fondo_Welcome.jpg'; 
import exodoncia from '../assets/exodoncia.jpg';
import endodoncia from '../assets/endodoncia.jpeg';
import protesis_fija from '../assets/protesis_fija.jpg';
import protesis_removible from '../assets/protesis_removible.jpg';
import periodoncia from '../assets/periodoncia.jpg';
import odontopediatria from '../assets/odontopediatria.jpg';

// Base de datos local con la info de cada tratamiento
const infoTratamientos = {
  'exodoncia': {
    titulo: 'Exodoncia',
    descripcion: 'Procedimientos especializados para la extracción segura de piezas dentales, incluyendo muelas del juicio. Nos enfocamos en una técnica de mínima invasión para garantizar una recuperación rápida y sin dolor.',
    imagen: exodoncia
  },
  'endodoncia': {
    titulo: 'Endodoncia',
    descripcion: 'Tratamiento de conductos diseñado para salvar piezas dentales dañadas o profundamente infectadas. Eliminamos el dolor desde la raíz preservando la estructura natural de tu sonrisa.',
    imagen: endodoncia
  },
  'protesis-fija': {
    titulo: 'Prótesis Fija',
    descripcion: 'Restauración estética mediante coronas, puentes o carillas fijas de alta resistencia. Devolvemos la funcionalidad y la belleza total a tu boca con materiales biocompatibles de primera calidad.',
    imagen: protesis_fija
  },
  'protesis-removible': {
    titulo: 'Prótesis Removible',
    descripcion: 'Soluciones personalizadas y cómodas para la reposición de piezas faltantes. Diseñadas a medida para ajustarse perfectamente, devolviéndote la confianza al hablar y comer.',
    imagen: protesis_removible
  },
  'periodoncia': {
    titulo: 'Periodoncia',
    descripcion: 'Especialidad dedicada a la salud de las encías y los tejidos que soportan tus dientes. Prevenimos y tratamos la inflamación o infección para evitar la pérdida de piezas dentales.',
    imagen: periodoncia
  },
  'odontopediatria': {
    titulo: 'Odontopediatría',
    descripcion: 'Cuidado dental integral especializado para los más pequeños de la casa. Creamos un ambiente amigable, seguro y libre de estrés para que su primera visita sea una experiencia positiva.',
    imagen: odontopediatria
  }
};

export default function Especialidad() {
  const { id } = useParams(); 
  const especialidad = infoTratamientos[id];
  const [menuOpen, setMenuOpen] = useState(false);

  // Lista para el menú desplegable
  const especialidadesList = [
    { name: 'Exodoncia', path: 'exodoncia' },
    { name: 'Endodoncia', path: 'endodoncia' },
    { name: 'Prótesis Fija', path: 'protesis-fija' },
    { name: 'Prótesis Removible', path: 'protesis-removible' },
    { name: 'Periodoncia', path: 'periodoncia' },
    { name: 'Odontopediatría', path: 'odontopediatria' },
  ];

  if (!especialidad) {
    return <div className="min-h-screen flex items-center justify-center text-2xl font-bold text-[#2A5C4D]">Especialidad no encontrada</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans antialiased">
      
      {/* NAVBAR UNIFICADO (Transparente y blanco con Menú Desplegable) */}
      <nav className="absolute w-full z-50 bg-transparent py-5">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          
          {/* Logo a la izquierda */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="Clínica Alba" className="h-14 drop-shadow-lg bg-white/80 rounded p-1" />
            <div className="flex flex-col text-white drop-shadow-md">
              <span className="text-xl font-black tracking-tight leading-none">Clínica Alba</span>
              <span className="text-[10px] font-bold uppercase tracking-widest mt-0.5">Odontología Integral</span>
            </div>
          </Link>
          
          {/* Controles a la derecha */}
          <div className="flex items-center gap-4 sm:gap-8">
            
            {/* Menú Desplegable de Especialidades — funciona en desktop (hover) y móvil (click) */}
            <div className="relative py-2">
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 hover:text-[#148F77] text-white font-bold text-sm transition-colors outline-none drop-shadow-md"
              >
                <span className="hidden sm:inline">Otras Especialidades</span>
                <span className="sm:hidden">Especialidades</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                  className={`w-3 h-3 mt-0.5 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              
              {menuOpen && (
                <div className="absolute top-full right-0 w-60 bg-white shadow-2xl rounded-xl flex flex-col py-3 border border-gray-100 overflow-hidden z-50">
                  {especialidadesList.map((item) => (
                    <Link 
                      key={item.path} 
                      to={`/especialidad/${item.path}`}
                      onClick={() => setMenuOpen(false)}
                      className={`px-6 py-3 text-sm font-semibold transition-colors ${
                        item.path === id 
                          ? 'text-[#148F77] bg-gray-50' 
                          : 'text-gray-700 hover:bg-[#148F77] hover:text-white'
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Volver al Inicio */}
            <Link to="/" className="text-white font-bold text-sm hover:text-[#148F77] transition-colors flex items-center gap-1.5 drop-shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
              </svg>
              <span className="hidden sm:inline">Inicio</span>
            </Link>
            
          </div>
        </div>
      </nav>

      {/* ==========================================
          MINI HERO (Da continuidad al diseño de Welcome)
          ========================================== */}
      <section className="relative h-[45vh] min-h-[550px] flex items-center justify-center">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${dent})` }}></div>
        <div className="absolute inset-0 bg-[#2A5C4D]/70 mix-blend-multiply"></div>
        {/* Degradado inferior para fusionarse con el fondo gris de abajo */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50/90"></div>

        <div className="relative z-10 text-center px-4 mt-2">
          <span className="animate-text-fast inline-block py-1 px-3 border border-white/30 rounded-full text-white/90 text-xs font-bold tracking-[0.2em] uppercase mb-4 shadow-sm backdrop-blur-sm">
            Tratamiento Especializado
          </span>
          <h1 className="animate-text-fast delay-100 text-5xl md:text-6xl font-black text-white tracking-tight drop-shadow-lg">
            {especialidad.titulo}
          </h1>
        </div>
      </section>

      {/* ==========================================
          TARJETA DE CONTENIDO (OVERLAP Y ALTURA FIJA)
          ========================================== */}
      <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 -mt-50 mb-20 animate-text-fast delay-200">
        {/* CAMBIO: Se agregó md:h-[450px] para fijar la altura en computadoras */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col md:flex-row md:h-[450px]">
          
          {/* Imagen Lateral */}
          {/* CAMBIO: Cambiamos md:h-auto por md:h-full para que ocupe siempre toda la altura de la tarjeta */}
          <div className="w-full md:w-1/2 h-[300px] md:h-full overflow-hidden relative">
            <img 
              src={especialidad.imagen} 
              alt={especialidad.titulo} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" 
            />
            {/* Sombra interna suave */}
            <div className="absolute inset-0 ring-1 ring-inset ring-black/5"></div>
          </div>

          {/* Información y Acción */}
          {/* CAMBIO: Se ajustó el padding (p-8 md:p-12) para que el texto respire bien dentro del alto fijo */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <h2 className="text-3xl md:text-4xl font-black text-[#2A5C4D] mb-4">
              Soluciones a medida.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8">
              {especialidad.descripcion}
            </p>
            
            <div>
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center gap-2 bg-[#148F77] hover:bg-[#0f6b59] w-full sm:w-auto text-white text-base font-bold py-4 px-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 active:scale-95"
              >
                Agendar Cita Ahora
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>

        </div>
      </div>
      
    </div>
  );
}
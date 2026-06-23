import { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../../assets/LOGO.png';
import fondoWelcome from '../../assets/Fondo_Welcome.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch(`${API_URL}/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (data.success) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#148F77] focus:border-transparent outline-none bg-gray-50 text-sm transition-all shadow-inner";
  const labelClass = "block text-[11px] font-bold text-[#2A5C4D] uppercase tracking-wider mb-1.5";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-10 font-sans antialiased">
      <div className="absolute inset-0 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${fondoWelcome})` }}></div>
      <div className="absolute inset-0 bg-[#2A5C4D]/70 mix-blend-multiply"></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-md border border-white/50 relative z-10 animate-fade-in-up">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#148F77] to-[#2A5C4D]"></div>
        
        <Link to="/login" className="absolute top-6 left-6 text-gray-400 hover:text-[#148F77] transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Volver
        </Link>

        <div className="text-center mb-8 mt-4">
          <img src={logo} alt="Logo" className="h-14 w-auto mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[#2A5C4D]">RECUPERAR CONTRASEÑA</h2>
          <p className="text-[#148F77] text-[12px] font-bold uppercase mt-1 tracking-widest">Te enviaremos un enlace para crear una nueva contraseña. Ingresa tu correo y revisa tu bandeja de entrada.</p>                     
        </div>

        {message.text && (
          <div className={`px-4 py-3 rounded-lg mb-6 text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className={labelClass}>Correo Electrónico</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ejemplo@correo.com" />
          </div>

          <button type="submit" disabled={loading} className={`w-full py-4 rounded-xl font-bold text-white shadow-xl transition-all ${loading ? 'bg-gray-400' : 'bg-[#148F77] hover:bg-[#0f6b59]'}`}>
            {loading ? "..." : "ENVIAR ENLACE"}
          </button>
        </form>
      </div>
    </div>
  );
}
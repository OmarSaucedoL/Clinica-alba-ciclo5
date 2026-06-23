import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import logo from '../assets/LOGO.png';
import fondoWelcome from '../assets/Fondo_Welcome.jpg';

const API_URL = import.meta.env.VITE_API_URL;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const token = searchParams.get('token');
  const userId = searchParams.get('id');

  // 1. VALIDACIÓN INICIAL DEL ENLACE
  useEffect(() => {
    const verifyToken = async () => {
      setError(''); // <--- IMPORTANTE: Limpiamos cualquier error previo
      try {
        const res = await fetch(`${API_URL}/validate-token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: userId, token: token }),
        });
        
        // Verificamos si la respuesta es JSON para no caer en el catch de forma genérica
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
           throw new Error("El servidor devolvió una respuesta no válida.");
        }

        const data = await res.json();
        
        if (res.ok && data.success) {
          setIsTokenValid(true);
          setError(''); // Doble seguridad: limpiamos si es válido
        } else {
          setError(data.message || 'El enlace no es válido o ha expirado.');
          setIsTokenValid(false);
        }
      } catch (err) {
        console.error("Error en la validación:", err);
        setError('Error de conexión. Reintente en unos momentos.');
        setIsTokenValid(false);
      } finally {
        setIsVerifying(false);
      }
    };

    if (token && userId) {
      verifyToken();
    } else {
      setError('Enlace inválido. Solicite uno nuevo.');
      setIsVerifying(false);
    }
  }, [token, userId]);

  // 2. CAMBIO DE CONTRASEÑA
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
        return setError('Las contraseñas no coinciden.');
    }
    
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, token: token, password: password }),
      });
      
      const data = await res.json();
      
      if (res.ok && data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 3000);
      } else {
        setError(data.message || 'No se pudo actualizar la contraseña.');
      }
    } catch (err) {
      setError('Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#2A5C4D] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-cover bg-center blur-sm" style={{ backgroundImage: `url(${fondoWelcome})` }}></div>
      <div className="absolute inset-0 bg-[#2A5C4D]/70 mix-blend-multiply"></div>

      <div className="bg-white/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#148F77] to-[#2A5C4D]"></div>
        
        <div className="text-center mb-8">
          <img src={logo} alt="Logo" className="h-14 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[#2A5C4D]">
            {success ? "¡Todo listo!" : "NUEVA CONTRASEÑA"}
          </h2>
        </div>

        {success ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-[#2A5C4D] font-bold text-lg">Contraseña actualizada</p>
            <p className="text-gray-500 text-sm">Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          !isTokenValid ? (
            <div className="text-center space-y-6">
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 font-bold text-sm">
                {error}
              </div>
              <Link to="/forgot-password" m className="block w-full py-4 bg-[#148F77] text-white rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-[#0f6b59] transition-all">
                Solicitar Nuevo Enlace
              </Link>
            </div>
          ) : (
            <>
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-xs font-bold animate-shake">{error}</div>}
              <form onSubmit={handleReset} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#2A5C4D] uppercase ml-1">Contraseña Nueva</label>
                  <input 
                    type="password" 
                    required 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#148F77] bg-gray-50 shadow-inner" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#2A5C4D] uppercase ml-1">Confirmar Contraseña</label>
                  <input 
                    type="password" 
                    required 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#148F77] bg-gray-50 shadow-inner" 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
                
                <button 
                  type="submit" 
                  disabled={loading} 
                  className={`w-full py-4 mt-4 text-white rounded-xl font-bold transition-all shadow-lg ${
                    loading ? 'bg-gray-400' : 'bg-[#148F77] hover:bg-[#0f6b59] active:scale-95'
                  }`}
                >
                  {loading ? "..." : "ACTUALIZAR CONTRASEÑA"}
                </button>
              </form>
            </>
          )
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/LOGO.png';
import fondoWelcome from '../assets/Fondo_Welcome.jpg';
import { useAuthStore } from '../store/auth_store';

const API_URL = import.meta.env.VITE_API_URL;

const sanitizarError = (errorMsg) => {
  if (!errorMsg) return "Error desconocido. Intente nuevamente.";
  
  if (errorMsg.includes("CONTEXT:")) {
    let cleanMsg = errorMsg.split("CONTEXT:")[0].trim();
    cleanMsg = cleanMsg.replace("Error interno:", "").trim();
    return cleanMsg;
  }
  
  return errorMsg;
};
// ---------------------------------------------------------------

export default function Login() {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuthStore();
  const loggedInUser = useAuthStore((state) => state.user);

  useEffect(() => {
    if (loggedInUser) {
      navigate('/panel', { replace: true });
    }
  }, [loggedInUser, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_input: user.trim(),
          password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Error ${res.status}`);
      }

      if (data.success) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        login(data.user);
        navigate('/panel');
      } else {
        throw new Error(data.message || 'Credenciales incorrectas');
      }
    } catch (err) {
      setError(sanitizarError(err.message));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:ring-2 focus:ring-[#148F77]";

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4">
      <div
        className="absolute inset-0 bg-cover bg-center blur-sm"
        style={{ backgroundImage: `url(${fondoWelcome})` }}
      />
      <div className="absolute inset-0 bg-[#2A5C4D]/70" />

      <div className="relative z-10 w-full max-w-md bg-white/95 rounded-2xl shadow-2xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#148F77] to-[#2A5C4D]" />

        <div className="p-6 sm:p-8">
          <Link to="/" className="text-xs font-bold text-gray-400 hover:text-[#148F77]">
            ← Volver
          </Link>

          <div className="text-center my-6">
            <img src={logo} className="h-14 mx-auto mb-3" />
            <h2 className="text-2xl font-black text-[#2A5C4D]">BIENVENIDO</h2>
            <p className="text-xs text-[#148F77] font-bold uppercase">Clínica Alba</p>
          </div>

          {error && (
            <div className="mb-4 text-xs font-bold text-red-600 bg-red-50 p-3 rounded-lg">
               {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                className={inputClass}
                placeholder="Usuario o correo"
                value={user}
                onChange={(e) => setUser(e.target.value)}
              />
            </div>

            <div>
              <input
                type="password"
                className={inputClass}
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <div className="text-right mt-1">
                <Link 
                  to="/forgot-password" 
                  className="text-[10px] font-bold text-[#148F77] hover:underline"
                >
                  ¿OLVIDASTE TU CONTRASEÑA?
                </Link>
              </div>
            </div>

            <button
              disabled={loading}
              className={`w-full py-3 rounded-xl font-bold text-white transition ${
                loading ? 'bg-gray-400' : 'bg-[#148F77] hover:bg-[#0f6b59]'
              }`}
            >
              {loading ? "AUTENTICANDO..." : "INGRESAR"}
            </button>
          </form>

          <p className="text-center text-xs mt-5 text-gray-500">
            ¿No tienes cuenta?{" "}
            <Link className="text-[#148F77] font-bold" to="/register">
              REGÍSTRATE
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
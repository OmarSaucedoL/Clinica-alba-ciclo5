import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../assets/LOGO.png'; 
import fondoWelcome from '../assets/Fondo_Welcome.jpg'; 

const API_URL = import.meta.env.VITE_API_URL;

// --- NUEVO: Función para limpiar el texto de la base de datos ---
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

export default function Register() {
  const navigate = useNavigate();

  // ESTADOS DEL FORMULARIO
  const [userName, setUserName] = useState('');
  const [documentoIdentidad, setDocumentoIdentidad] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(''); 
  const [direccion, setDireccion] = useState(''); 
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // ESTADOS DE UX Y SEGURIDAD
  const [error, setError] = useState('');
  const [info, setInfo] = useState(''); 
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyingCI, setVerifyingCI] = useState(false);
  const [isExisting, setIsExisting] = useState(false); 

  const fechaHoy = new Date().toISOString().split("T")[0];


  // 1. VERIFICACIÓN DE CI Y DATA MASKING
  const handleVerifyCI = async () => {
    if (!documentoIdentidad || documentoIdentidad.length < 5) {
      setIsExisting(false);
      setInfo('');
      return;
    }
    setVerifyingCI(true);
    setError('');
    setInfo('');
    setIsExisting(false);

    try {
      const url = API_URL.endsWith('/api') 
        ? `${API_URL}/verify-ci/${documentoIdentidad}` 
        : `${API_URL}/api/verify-ci/${documentoIdentidad}`;

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok || !data.success) {
        // --- NUEVO: Aplicamos sanitizarError aquí también ---
        setError(sanitizarError(data.message || 'Error al verificar el CI.'));
        setNombre(''); 
        return;
      }

      if (data.exists && data.data) {
        setNombre(data.data.masked_name || '');      
        setFechaNacimiento('');        
        setIsExisting(true); 
        setInfo(data.message); 
      }
    } catch (err) {
      console.error("Error validando identidad:", err);
    } finally {
      setVerifyingCI(false);
    }
  };

  // REGISTRO FINAL (NUEVOS Y ANTIGUOS)
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    // --- NUEVA VALIDACIÓN DE SEGURIDAD (Obs 2) ---
    const regexPassword = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
    if (!regexPassword.test(password)) {
      setError('La contraseña debe tener al menos 8 caracteres, una mayúscula y un símbolo especial.');
      return;
    }
    // ---------------------------------------------

    const anioIngresado = parseInt(fechaNacimiento.split('-')[0]);
    const anioActual = new Date().getFullYear();
    
    if (anioIngresado < 1900 || anioIngresado > anioActual) {
      setError('Por favor, ingresa un año de nacimiento válido.');
      return;
    }

    setLoading(true);
    
    try {
      const url = API_URL.endsWith('/api') 
        ? `${API_URL}/register` 
        : `${API_URL}/api/register`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user: userName,
          ci: documentoIdentidad,
          name: nombre, // Si es existente mandará "O*** S******", pero el backend lo ignorará
          mail: correo,
          number: telefono,
          birth: fechaNacimiento,
          dir: direccion,
          password: password 
        }),
      });

      const data = await response.json();

      if (!data.success || !response.ok) {
        throw new Error(data.message || 'Error al procesar el registro.');
      }

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000); 
      
    } catch (err) {
      // --- NUEVO: Aplicamos sanitizarError en el catch ---
      setError(sanitizarError(err.message));
    } finally {
      setLoading(false);
    }
  };

  // ESTILOS REUTILIZABLES (TAILWIND)
  const inputClass = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-[#148F77] focus:border-transparent outline-none text-sm transition-all shadow-inner";
  const labelClass = "block text-[11px] font-bold text-[#2A5C4D] uppercase tracking-wider mb-1";

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 py-10 font-sans antialiased">
      {/* FONDO */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat blur-sm" style={{ backgroundImage: `url(${fondoWelcome})` }}></div>
      <div className="absolute inset-0 bg-[#2A5C4D]/70 mix-blend-multiply"></div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="bg-white/95 backdrop-blur-xl p-8 md:p-10 rounded-2xl shadow-2xl w-full max-w-2xl border border-white/50 relative overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#148F77] to-[#2A5C4D]"></div>

        {/* BOTÓN VOLVER */}
        <Link to="/" className="absolute top-6 left-6 text-gray-400 hover:text-[#148F77] transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest z-20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg> Volver
        </Link>
        
        {/* ENCABEZADO */}
        <div className="text-center mb-6">
          <Link to="/"><img src={logo} alt="Logo Clínica Alba" className="h-16 w-auto object-contain mx-auto mb-3 drop-shadow-md hover:scale-105 transition-transform" /></Link>
          <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight">REGISTRO</h2>
        </div>

        {/* ALERTAS */}
        {error && (
          <div className="bg-red-50/90 border border-red-200 text-red-600 px-4 py-3.5 rounded-lg mb-5 text-sm flex items-center shadow-sm">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium tracking-wide">{error}</span>
          </div>
        )}

        {info && (
          <div className="bg-blue-50/90 border border-blue-200 text-blue-700 px-4 py-3.5 rounded-lg mb-5 text-sm flex items-center shadow-sm">
            <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium tracking-wide">{info}</span>
          </div>
        )}

        {success && (
          <div className="bg-[#E8F4F8] border border-[#148F77]/30 text-[#2A5C4D] px-4 py-3.5 rounded-lg mb-5 text-sm flex items-center shadow-sm">
             <svg className="w-5 h-5 mr-3 flex-shrink-0 text-[#148F77]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="font-medium tracking-wide">Cuenta creada exitosamente. Se redirigirá en breve...</span>
          </div>
        )}

        {/* FORMULARIO */}
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Nombre de Usuario *</label>
              <input type="text" required value={userName} onChange={(e) => setUserName(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} placeholder=" nombre de usuario" />
            </div>
            
            <div className="relative">
              <label className={labelClass}>CI / NIT *</label>
              <input 
                type="number" 
                required 
                value={documentoIdentidad} 
                onChange={(e) => setDocumentoIdentidad(e.target.value)} 
                onBlur={handleVerifyCI} /* ESTE EVENTO ES LA CLAVE DE TODO */
                className={`${inputClass} bg-gray-50 border-gray-200`} 
                placeholder="Ingresa tu documento de identidad" 
              />
              {verifyingCI && (
                <div className="absolute right-3 top-[34px]">
                  <svg className="animate-spin h-5 w-5 text-[#148F77]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelClass}>Nombre Completo *</label>
            <input 
              type="text" 
              required 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)} 
              disabled={isExisting} 
              placeholder="Nombre y Apellidos"
              className={`${inputClass} ${isExisting ? 'bg-gray-200 text-gray-500 cursor-not-allowed border-gray-300 font-bold tracking-widest' : 'bg-gray-50 border-gray-200'}`} 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Fecha de Nacimiento *</label>
              <input 
                type="date" 
                required 
                value={fechaNacimiento} 
                onChange={(e) => setFechaNacimiento(e.target.value)} 
                min="1900-01-01" max={fechaHoy} 
                className={`${inputClass} ${isExisting ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-400/50 text-yellow-900 shadow-yellow-100' : 'bg-gray-50 border-gray-200'}`} 
              />
              {isExisting && <span className="text-[10px] text-yellow-600 font-bold mt-1.5 block">Requerido para validar identidad</span>}
            </div>
            <div>
              <label className={labelClass}>Correo Electrónico *</label>
              <input type="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} placeholder="correo@ejemplo.com" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Teléfono</label>
              <input type="number" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} />
            </div>
            <div>
              <label className={labelClass}>Dirección (Opcional)</label>
              <input type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Contraseña *</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} />
              {/* OPCIONAL: Pista de contraseña debajo del campo para que el usuario sepa qué poner */}
              <p className="text-[9px] text-gray-400 mt-1 uppercase font-bold italic">Recuerda tu contraseña, solo tú la conoces</p>
            </div>
            <div>
              <label className={labelClass}>Confirmar Contraseña *</label>
              <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClass} bg-gray-50 border-gray-200`} />
            </div>
          </div>

          <button type="submit" disabled={loading || success || verifyingCI} className={`w-full py-4 mt-6 rounded-xl font-bold text-white shadow-xl transition-all duration-300 transform active:scale-[0.98] flex items-center justify-center tracking-wide ${loading || success || verifyingCI ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#148F77] hover:bg-[#0f6b59] hover:shadow-[#148F77]/30'}`}>
            {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  ...
                </span>
            ) : "REGISTRARME"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-500 font-medium">¿Ya tienes una cuenta? <Link to="/login" className="text-[#148F77] font-bold hover:text-[#2A5C4D] transition-colors hover:underline">INICIA SESIÓN AQUÍ</Link></p>
        </div>
      </div>
    </div>
  );
}
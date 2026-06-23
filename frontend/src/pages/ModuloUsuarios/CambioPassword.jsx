import { useState } from 'react';
import { useAuthStore } from '../../store/auth_store';

const API_URL = import.meta.env.VITE_API_URL;

export default function CambioPasswordUI() {
  const user = useAuthStore(state => state.user);
  const [passwords, setPasswords] = useState({ actual: "", nueva: "", confirmar: "" });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ mensaje: "", tipo: "" });

  const notify = (mensaje, tipo = "success") => {
      setToast({ mensaje, tipo });
      setTimeout(() => setToast({ mensaje: "", tipo: "" }), 4500);
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!passwords.actual || !passwords.nueva || !passwords.confirmar) return notify("Por favor, completa todos los campos", "error");
      if (passwords.nueva !== passwords.confirmar) return notify("Las contraseñas nuevas no coinciden", "error");
      if (passwords.actual === passwords.nueva) return notify("La nueva contraseña no puede ser igual a la actual", "error");
      if (passwords.nueva.length < 8) return notify("La contraseña debe tener al menos 8 caracteres", "error");
      if (!/[A-Z]/.test(passwords.nueva)) return notify("La contraseña debe incluir al menos una mayúscula", "error");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwords.nueva)) return notify("La contraseña debe incluir al menos un símbolo especial", "error");

      setLoading(true);
      try {
          const res = await fetch(`${API_URL}/usuarios/${user.id_usuario}/password`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  password_actual: passwords.actual,
                  nueva_password: passwords.nueva
              })
          }).then(r => r.json());

          if (res.success) {
              notify("Contraseña actualizada correctamente");
              setPasswords({ actual: "", nueva: "", confirmar: "" });
          } else {
              notify(res.message, "error");
          }
      } catch (err) {
          notify("Error de conexión con el servidor", "error");
      } finally {
          setLoading(false);
      }
  };

  return (
      <div className="animate-fade-in relative max-w-2xl mx-auto mt-10">
          {toast.mensaje && (
              <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-fade-in-up border-b-4 ${
                  toast.tipo === 'error' ? 'bg-red-500 text-white border-red-700' : 'bg-[#148F77] text-white border-emerald-900'
              }`}>
                  {toast.tipo === 'error' ? ' ' : '✓ '} {toast.mensaje}
              </div>
          )}

          <div className="mb-8">
              <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tighter italic">FORMULARIO DE CAMBIO DE CONTRASEÑA</h2>
              <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">Asegurése de cambiar su contraseña regularmente</p>
          </div>

          <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 p-10">
              <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Contraseña Actual</label>
                      <input 
                          type="password" required
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                          value={passwords.actual}
                          onChange={e => setPasswords({...passwords, actual: e.target.value})}
                      />
                  </div>
                  
                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nueva Contraseña</label>
                      <input 
                          type="password" required minLength="8"
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                          value={passwords.nueva}
                          onChange={e => setPasswords({...passwords, nueva: e.target.value})}
                      />
                      <p className="text-[8px] text-gray-400 ml-2 font-bold uppercase tracking-widest">
                          Recuerde su contraseña, es su responsabilidad mantenerla segura.
                      </p>
                  </div>

                  <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Confirmar Nueva Contraseña</label>
                      <input 
                          type="password" required minLength="8"
                          className="w-full p-4 bg-gray-50 rounded-2xl text-xs font-bold border-none outline-none focus:ring-4 focus:ring-emerald-50"
                          value={passwords.confirmar}
                          onChange={e => setPasswords({...passwords, confirmar: e.target.value})}
                      />
                  </div>

                  <button 
                      type="submit" disabled={loading}
                      className="w-full py-5 mt-4 bg-[#148F77] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-[#0e6352] active:scale-95 transition-all"
                  >
                      {loading ? "COMPROBANDO..." : "ACTUALIZAR CONTRASEÑA"}
                  </button>
              </form>
          </div>
      </div>
  );
}
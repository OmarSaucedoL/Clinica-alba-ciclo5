import { useState } from 'react';
import { useAuthStore } from '../../store/auth_store';

const API_URL = import.meta.env.VITE_API_URL;

export default function AdminUI({ dataMaster, onRefresh }) {
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState(null);
  const [formEdit, setFormEdit] = useState({ nombre_usuario: "", correo: "", id_rol: "" });
  
  const [toast, setToast] = useState({ mensaje: "", tipo: "" });
  const [loading, setLoading] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState(null);

  // Obtenemos el usuario actual del store para la auditoría
  const user = useAuthStore(state => state.user);

  const notify = (mensaje, tipo = "success") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast({ mensaje: "", tipo: "" }), 4000);
  };

  const handleIniciarEdicion = (u) => {
    setEditando(u.id_usuario);
    setFormEdit({ 
        nombre_usuario: u.nombre_usuario || u.correo?.split('@')[0] || '', 
        correo: u.correo, 
        id_rol: u.id_rol 
    });
  };

  const handleGuardarCambios = async (idUsuario) => {
    try {
      const res = await fetch(`${API_URL}/usuarios/${idUsuario}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              nombre_usuario: formEdit.nombre_usuario,
              correo: formEdit.correo,
              id_rol: Number(formEdit.id_rol),
              // --- DATOS DE AUDITORÍA ---
              id_operador: user.id_usuario,
              id_sesion: user.id_sesion
          })
      }).then(r => r.json());
      
      if (res.success) {
          notify("Registro actualizado correctamente");
          setEditando(null);
          onRefresh();
      } else { 
          notify(res.message, "error"); 
      }
    } catch (err) { 
        notify("Error al procesar la solicitud", "error"); 
    }
  };

  const confirmarEliminacion = (id) => {
      if (id === user.id_usuario) {
          notify("No puedes eliminar tu propia cuenta", "error");
          return;
      }
      setUsuarioAEliminar(id);
  };

  const handleEliminar = async () => {
    if (!usuarioAEliminar) return;
    try {
        const res = await fetch(`${API_URL}/usuarios/${usuarioAEliminar}`, { 
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                // --- DATOS DE AUDITORÍA ---
                id_operador: user.id_usuario,
                id_sesion: user.id_sesion
            })
        }).then(r => r.json());

        if (res.success) {
            notify("Registro eliminado correctamente");
            onRefresh();
        } else { 
            notify(res.message, "error"); 
        }
    } catch { 
        notify("Error al procesar la solicitud", "error"); 
    } finally {
        setUsuarioAEliminar(null);
    }
  };

  const usuariosFiltrados = dataMaster.usuarios.filter(u => 
    u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
    u.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombre_usuario?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="animate-fade-in pb-20 relative">
        {/* TOAST DE NOTIFICACIÓN */}
        {toast.mensaje && (
            <div className={`fixed top-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl font-black text-[10px] uppercase tracking-widest animate-fade-in-up border-b-4 ${
                toast.tipo === 'error' ? 'bg-red-500 text-white border-red-700' : 'bg-[#148F77] text-white border-emerald-900'
            }`}>
                {toast.tipo === 'error' ? ' ' : '✓ '} {toast.mensaje}
            </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
        {usuarioAEliminar && (
            <div className="fixed inset-0 bg-[#2A5C4D]/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden animate-fade-in-up text-center p-10 border-t-8 border-red-500">
                    <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-2xl font-black mx-auto mb-6">!</div>
                    <h3 className="text-2xl font-black text-[#2A5C4D] mb-2 tracking-tighter">Eliminar Usuario</h3>
                    <p className="text-gray-400 text-xs mb-8 leading-relaxed">
                        ¿Estás seguro que deseas eliminar permanentemente este acceso? Esta acción no se puede deshacer.
                    </p>
                    <div className="flex gap-4">
                        <button onClick={() => setUsuarioAEliminar(null)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                        <button onClick={handleEliminar} className="flex-1 py-4 bg-red-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-red-600 transition-all">Eliminar</button>
                    </div>
                </div>
            </div>
        )}

        {/* CABECERA Y BUSCADOR */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
            <div>
                <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tighter italic">Gestión de Acceso</h2>
                <button 
                    onClick={onRefresh} 
                    className="mt-3 flex items-center gap-2 text-[9px] font-black uppercase px-4 py-2 bg-white border border-gray-100 rounded-xl shadow-sm hover:bg-gray-50 transition-all"
                >
                    <span className={loading ? 'animate-spin' : ''}>↻</span>
                    Actualizar Datos
                </button>
            </div>
            
            <div className="relative w-full md:w-96 group">
                <input 
                    type="text" 
                    placeholder="Filtrar por nombre, e-mail o cuenta..." 
                    className="w-full pl-6 pr-4 py-4 bg-white border border-gray-100 rounded-[1.5rem] text-xs font-bold shadow-sm focus:ring-4 focus:ring-emerald-50 outline-none transition-all" 
                    value={busqueda} 
                    onChange={(e) => setBusqueda(e.target.value)} 
                />
            </div>
        </div>
        
        {/* TABLA DE USUARIOS */}
        <div className="bg-white rounded-[3rem] shadow-sm border border-gray-100 overflow-hidden">
            <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
                    <tr>
                        <th className="px-10 py-7">Identidad y Cuenta</th>
                        <th className="px-10 py-7">Contacto</th>
                        <th className="px-10 py-7">Privilegios</th>
                        <th className="px-10 py-7 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                    {usuariosFiltrados.map(u => {
                        const tableUsername = u.nombre_usuario || u.correo?.split('@')[0] || 'usuario';

                        return (
                        <tr key={u.id_usuario} className="hover:bg-emerald-50/20 transition-colors group">
                            <td className="px-10 py-6">
                                {editando === u.id_usuario ? (
                                    <div>
                                        <div className="text-[8px] text-gray-400 font-bold mb-1 uppercase tracking-widest">
                                            Nombre de Usuario
                                        </div>
                                        <input 
                                            className="bg-emerald-50 border-none text-[#148F77] text-xs font-black rounded-lg px-4 py-2 w-full outline-none focus:ring-2 focus:ring-emerald-200" 
                                            value={formEdit.nombre_usuario} 
                                            onChange={(e) => setFormEdit({...formEdit, nombre_usuario: e.target.value})} 
                                            placeholder="Nuevo @usuario..."
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <div className="font-black text-xs text-[#2A5C4D] flex items-center gap-2">
                                            {u.nombre}
                                            {u.id_usuario === user.id_usuario && ( 
                                                <span className="bg-orange-100 text-orange-600 text-[7px] px-2 py-0.5 rounded-full font-black">
                                                    MÍ PERFIL
                                                </span> 
                                            )}
                                        </div>
                                        <div className="text-[9px] text-gray-400 font-bold lowercase tracking-widest mt-1">
                                            @{tableUsername}
                                        </div>
                                    </div>
                                )}
                            </td>

                            <td className="px-10 py-6">
                                {editando === u.id_usuario ? (
                                    <input 
                                        className="bg-emerald-50 border-none text-[#148F77] text-xs font-black rounded-xl px-4 py-2 w-full outline-none" 
                                        value={formEdit.correo} 
                                        onChange={(e) => setFormEdit({...formEdit, correo: e.target.value})} 
                                    />
                                ) : (
                                    <div className="text-xs text-gray-400 font-medium italic">
                                        {u.correo}
                                    </div>
                                )}
                            </td>

                            <td className="px-10 py-6">
                                {editando === u.id_usuario ? (
                                    <select 
                                        disabled={u.id_usuario === user.id_usuario} 
                                        className={`text-[10px] font-black rounded-xl px-4 py-2 outline-none border-2 transition-all ${ 
                                            u.id_usuario === user.id_usuario ? 'bg-gray-100 border-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border-emerald-100 text-[#148F77] focus:ring-2 focus:ring-emerald-200' 
                                        }`} 
                                        value={formEdit.id_rol} 
                                        onChange={(e) => setFormEdit({...formEdit, id_rol: e.target.value})}
                                    >
                                        <option value="1">ADMINISTRADOR</option>
                                        <option value="2">ODONTOLOGO</option>
                                        <option value="4">RECEPCIONISTA</option>
                                        <option value="6">PACIENTE</option>
                                    </select>
                                ) : (
                                    <div className={`inline-block px-4 py-1.5 text-[9px] font-black rounded-full border ${ 
                                        u.id_rol === 1 ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-emerald-50 text-[#148F77] border-emerald-100' 
                                    }`}>
                                        {u.rol_nombre}
                                    </div>
                                )}
                            </td>

                            <td className="px-10 py-6 text-center">
                                {editando === u.id_usuario ? (
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => handleGuardarCambios(u.id_usuario)} 
                                            className="bg-[#148F77] text-white px-5 py-2.5 rounded-2xl text-[9px] font-black shadow-lg hover:bg-[#0e6352] active:scale-95 transition-all"
                                        >
                                            GUARDAR
                                        </button>
                                        <button 
                                            onClick={() => setEditando(null)} 
                                            className="bg-gray-100 text-gray-400 px-5 py-2.5 rounded-2xl text-[9px] font-black"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex justify-center gap-6">
                                        <button 
                                            onClick={() => handleIniciarEdicion(u)} 
                                            className="text-[#148F77] hover:text-[#2A5C4D] text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            Editar
                                        </button>
                                        {u.id_usuario !== user.id_usuario && (
                                            <button 
                                                onClick={() => confirmarEliminacion(u.id_usuario)} 
                                                className="text-red-300 hover:text-red-600 text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                Eliminar
                                            </button>
                                        )}
                                    </div>
                                )}
                            </td>
                        </tr>
                        );})}
                </tbody>
            </table>
        </div>
    </div>
  );
}
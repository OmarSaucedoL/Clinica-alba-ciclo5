import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/auth_store";

import Sidebar from "../../components/layout/Sidebar";

import DashboardAdmin from "../../components/dashboards/DashboardAdmin";
import ModuloCitas from "../ModuloCitas/ModuloCitas";
import DashboardOdontologo from "../../components/dashboards/DashboardOdontologo";
import DashboardRecepcionista from "../../components/dashboards/DashboardRecepcionista";
import DashboardPaciente from "../../components/dashboards/DashboardPaciente";

import CambioPasswordUI from "./CambioPassword";
import AgendarCitas from "../ModuloCitas/AgendarCitas";
import AgendaCitas from "../ModuloCitas/AgendaCitas";
import DetallesCitas from "../ModuloCitas/DetallesCitas";
import ModuloPacientes from "../ModuloPacientes/ModuloPacientes";
import Bitacora from "../ModuloAdministrativo/Bitacora";
import ModuloUsuarios from "../ModuloAdministrativo/ModuloUsuarios";
import ModuloInventario from "../ModuloInventario/ModuloInventario";
import RegistrarEntradas from "../ModuloInventario/RegistrarEntradas";
import RegistrarSalidas from "../ModuloInventario/RegistrarSalidas"; // <-- Adición exclusiva: Importamos el componente del CU27
import AjustarInventario from "../ModuloInventario/AjustarInventario"; // <-- Adición exclusiva: Importamos el componente del CU28
import ModuloPersonal from "../ModuloAdministrativo/ModuloPersonal";
import ModuloProcedimientos from "../../components/UIs/procedimientos/ModuloProcedimientos";
import ModuloPagos from "../ModuloFinanciero/ModuloPagos";
import ReportePacientes from "../ModuloReportes/ReportePacientes";
import ReporteFinanzas from "../ModuloReportes/ReporteFinanzas";
import ReporteAdministracion from "../ModuloReportes/ReporteAdministracion";
import ReporteInventario from "../ModuloReportes/ReporteInventario";
import ReporteCitas from "../ModuloReportes/ReporteCitas";
import ModuloConsultorios from "../../components/UIs/consultorios/ModuloConsultorios";
import ModuloServicios from "../../components/UIs/servicios/ModuloServicios";
import ModuloOdontograma from "../ModuloPacientes/ModuloOdontograma";
import AtajoGlobal from "../../components/UIs/AtajoGlobal/AtajoGlobal";
import ModuloAsistencia from "../ModuloAsistencia/ModuloAsistencia";
const API_URL = import.meta.env.VITE_API_URL;
const ROLES = {
  ADMINISTRADOR: 1,
  ODONTOLOGO: 2,
  ASISTENTE: 3,
  RECEPCIONISTA: 4,
  CLIENTE: 5,
  PACIENTE: 6,
};

export default function Panel() {
  const user = useAuthStore((state) => state.user);
  const clearStore = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const [activeMenu, setActiveMenu] = useState("Panel de Control");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAtajoOpen, setIsAtajoOpen] = useState(false);
  const [selectedPatientGlobal, setSelectedPatientGlobal] = useState(null);
  const [selectedPatientCitasGlobal, setSelectedPatientCitasGlobal] = useState(null);
  const [selectedOdontologoGlobal, setSelectedOdontologoGlobal] = useState(null);
  const [selectedUserGlobal, setSelectedUserGlobal] = useState(null);
  const [selectedStaffGlobal, setSelectedStaffGlobal] = useState(null);
  const [showModalCita, setShowModalCita] = useState(false);
  const [selectedCitaId, setSelectedCitaId] = useState(null);
  const [originalCitaData, setOriginalCitaData] = useState(null);
  const [returnToView, setReturnToView] = useState(null);
  const [showAgendaPersonalState, setShowAgendaPersonalState] = useState(false);
  const [asistenciaToast, setAsistenciaToast] = useState(null);
  const [selectedAsistenciaPersonalIdGlobal, setSelectedAsistenciaPersonalIdGlobal] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("checkin_token");
    if (token) {
      // Limpiar de la URL sin recargar usando el enrutador de React
      navigate(window.location.pathname, { replace: true });
      
      const registrarCheckin = async () => {
        try {
          const res = await fetch(`${API_URL}/asistencia/marcar`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (data.success) {
            setAsistenciaToast({ success: true, message: data.message });
          } else {
            setAsistenciaToast({ success: false, message: data.message || "Error al registrar asistencia." });
          }
        } catch (e) {
          setAsistenciaToast({ success: false, message: "Error al registrar asistencia por red." });
        }
      };
      
      setTimeout(registrarCheckin, 500);
    }
  }, [navigate]);
  const [dataMaster, setDataMaster] = useState({
    procedimientos: [],
    odontologos: [],
    usuarios: [],
    pacientes: [],
    salas: [],
    loading: true,
  });

  const returnToViewRef = useRef(returnToView);
  useEffect(() => {
    returnToViewRef.current = returnToView;
  }, [returnToView]);

  useEffect(() => {
    if (activeMenu === "Detalle Cita") {
      let exitedViaPopstate = false;
      window.history.pushState({ noExit: true }, "");

      const handlePopState = (event) => {
        exitedViaPopstate = true;
        const targetView = returnToViewRef.current;
        setActiveMenu(targetView?.menu || "Citas");
        if (targetView?.showAgendaPersonal) {
          setShowAgendaPersonalState(true);
        } else {
          setShowAgendaPersonalState(false);
        }
        setSelectedCitaId(null);
        setOriginalCitaData(null);
        setReturnToView(null);
      };

      window.addEventListener("popstate", handlePopState);
      return () => {
        window.removeEventListener("popstate", handlePopState);
        if (!exitedViaPopstate) {
          window.history.back();
        }
      };
    }
  }, [activeMenu]);

  // =========================
  // FETCH CONFIG
  // =========================
  const fetchConfig = (signal) => ({
    signal,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  });

  // =========================
  // LOGOUT
  // =========================
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          id_sesion: user?.id_sesion,
          id_usuario: user?.id_usuario,
        }),
      });
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      clearStore();
      navigate("/login");
    }
  };

  // =========================
  // FETCH GENERAL
  // =========================
  const fetchTodo = async (signal) => {
    try {
      const config = fetchConfig(signal);
      const rolActual = user?.rol ? Number(user.rol) : null;
      const esAdmin = rolActual === 1;

      // /api/usuarios solo está disponible para administradores
      const fetchUsuarios = esAdmin
        ? fetch(`${API_URL}/usuarios?t=${Date.now()}`, config).then((r) =>
            r.json(),
          )
        : Promise.resolve({ success: true, data: [] });

      const [resProc, resDoc, resUsu, resSalas, resPacientes] =
        await Promise.all([
          fetch(`${API_URL}/procedimientos?t=${Date.now()}`, config).then((r) =>
            r.json(),
          ),
          fetch(`${API_URL}/odontologos`, config).then((r) => r.json()),
          fetchUsuarios,
          fetch(`${API_URL}/salas`, config).then((r) => r.json()),
          fetch(`${API_URL}/pacientes`, config).then((r) => r.json()),
        ]);

      const listaUsuarios = resUsu.success ? resUsu.data : [];

      setDataMaster({
        procedimientos: resProc.success ? resProc.data : [],
        odontologos: Array.isArray(resDoc) ? resDoc : resDoc.data || [],
        usuarios: listaUsuarios,
        pacientes: resPacientes.success ? resPacientes.data : [],
        salas: resSalas.success ? resSalas.data : [],
        loading: false,
      });
    } catch (err) {
      if (err.name !== "AbortError") {
        console.log(err);
        setDataMaster((prev) => ({ ...prev, loading: false }));
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchTodo(controller.signal);
    return () => controller.abort();
  }, []);

  const userRolId = user?.rol ? Number(user.rol) : null;

  // =========================
  // LOADING
  // =========================
  if (!userRolId && dataMaster.loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#F4F9F9] text-[#148F77] font-bold">
        Cargando sesión...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F4F9F9] font-sans antialiased overflow-hidden text-gray-800">
      <Sidebar
        user={user}
        dataMaster={dataMaster}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        userRolId={userRolId}
        logout={handleLogout}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-100 shadow-sm px-4 md:px-10 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 text-gray-400 hover:text-[#148F77]"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            {activeMenu !== "Panel de Control" && (
              <button
                onClick={() => setActiveMenu("Panel de Control")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#148F77] text-xs font-black uppercase tracking-wider transition-all border border-emerald-100/50 shadow-sm active:scale-95 cursor-pointer mr-2"
                title="Volver al Panel Principal"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>Volver al Dashboard</span>
              </button>
            )}
            <div className="text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-widest italic">
              Clínica Alba /{" "}
              <span className="text-[#148F77] font-black">{activeMenu}</span>
            </div>
          </div>

          {/* BOTÓN DISPARADOR DE ATAJO GLOBAL */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAtajoOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-50 hover:bg-gray-100/70 border border-gray-100 text-gray-400 hover:text-gray-600 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Buscar en la clínica (Ctrl + K)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <span className="hidden sm:inline">Buscar...</span>
              <kbd className="hidden md:inline-block px-1.5 py-0.5 bg-white border border-gray-200/80 rounded text-[8px] font-mono text-gray-400 shadow-sm ml-1.5">
                Ctrl + K
              </kbd>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          {/* PANEL DE CONTROL / DASHBOARDS */}
          {activeMenu === "Panel de Control" &&
            (userRolId === ROLES.ADMINISTRADOR ? (
              <DashboardAdmin
                user={user}
                dataMaster={dataMaster}
                setView={setActiveMenu}
              />
            ) : userRolId === ROLES.ODONTOLOGO ? (
              <DashboardOdontologo
                user={user}
                dataMaster={dataMaster}
                setView={setActiveMenu}
                openModal={() => setShowModalCita(true)}
              />
            ) : userRolId === ROLES.RECEPCIONISTA ? (
              <DashboardRecepcionista
                user={user}
                dataMaster={dataMaster}
                setView={setActiveMenu}
                openModal={() => setShowModalCita(true)}
              />
            ) : (
              <DashboardPaciente
                user={user}
                dataMaster={dataMaster}
                setView={setActiveMenu}
                openModal={() => setShowModalCita(true)}
              />
            ))}

          {activeMenu === "Usuarios y Roles" &&
            userRolId === ROLES.ADMINISTRADOR && (
              <ModuloUsuarios
                defaultUsuario={selectedUserGlobal}
                onClearDefaultUsuario={() => setSelectedUserGlobal(null)}
              />
            )}

          {/* BITÁCORA */}
          {activeMenu === "Bitácora" && userRolId === ROLES.ADMINISTRADOR && (
            <Bitacora />
          )}

          {/* PACIENTES */}
          {activeMenu === "Pacientes" && (
            <ModuloPacientes
              defaultPaciente={selectedPatientGlobal}
              onClearDefaultPaciente={() => setSelectedPatientGlobal(null)}
            />
          )}
          {activeMenu === "Odontograma" && (
  <ModuloOdontograma />
)}
          {/* CONTRASEÑA */}
          {activeMenu === "Cambiar contraseña" && <CambioPasswordUI />}

          {/* CITAS */}
          {activeMenu === "Citas" && (
            <ModuloCitas
              openModal={() => setShowModalCita(true)}
              openAgendaModal={() => {
                setActiveMenu("Consultar Cita");
              }}
              dataMaster={dataMaster}
              user={user}
              defaultShowAgendaPersonal={showAgendaPersonalState}
              onCloseAgendaPersonal={() => setShowAgendaPersonalState(false)}
              onVerDetalles={(cita, fromAgendaPersonal = false) => {
                setSelectedCitaId(cita.id_cita);
                setOriginalCitaData(cita);
                setReturnToView({ menu: "Citas", showAgendaPersonal: fromAgendaPersonal, showAgendaModal: false });
                setActiveMenu("Detalle Cita");
              }}
            />
          )}

          {/* CONSULTAR CITAS PAGE */}
          {activeMenu === "Consultar Cita" && (
             <AgendaCitas
              onClose={() => setActiveMenu("Citas")}
              dataMaster={dataMaster}
              user={user}
              defaultOdontologoId={selectedOdontologoGlobal}
              defaultPacienteId={selectedPatientCitasGlobal?.id_paciente || selectedPatientCitasGlobal?.id || null}
              defaultPacienteNombre={selectedPatientCitasGlobal?.nombre || null}
              onVerDetalles={(cita) => {
                setSelectedCitaId(cita.id_cita);
                setOriginalCitaData(cita);
                setReturnToView({ menu: "Consultar Cita", showAgendaPersonal: false, showAgendaModal: false });
                setActiveMenu("Detalle Cita");
              }}
            />
          )}

          {/* DETALLES DE CITA PAGE */}
          {activeMenu === "Detalle Cita" && (
            <DetallesCitas
              idCita={selectedCitaId}
              originalCita={originalCitaData}
              user={user}
              dataMaster={dataMaster}
              onClose={() => {
                if (window.history.state && window.history.state.noExit) {
                  window.history.back();
                } else {
                  setActiveMenu(returnToView?.menu || "Citas");
                  if (returnToView?.showAgendaPersonal) {
                    setShowAgendaPersonalState(true);
                  } else {
                    setShowAgendaPersonalState(false);
                  }
                  setSelectedCitaId(null);
                  setOriginalCitaData(null);
                  setReturnToView(null);
                }
              }}
            />
          )}

          {/* PAGOS */}
          {activeMenu === "Pagos y Saldos" && (
            <ModuloPagos dataMaster={dataMaster} user={user} />
          )}

          {/* GESTIÓN DE INVENTARIO */}
          {activeMenu === "Gestionar Inventario" &&
            userRolId === ROLES.ADMINISTRADOR && <ModuloInventario />}

          {/* REGISTRAR ENTRADAS */}
          {activeMenu === "Registrar Entradas" &&
            userRolId === ROLES.ADMINISTRADOR && <RegistrarEntradas />}

          {/* REGISTRAR SALIDAS */}
          {activeMenu === "Registrar Salidas" &&
            userRolId === ROLES.ADMINISTRADOR && <RegistrarSalidas />}

          {/* AJUSTAR INVENTARIO */}
          {activeMenu === "Ajustar Inventario" &&
            userRolId === ROLES.ADMINISTRADOR && <AjustarInventario />}

          {/* PROCEDIMIENTOS */}
          {activeMenu === "Procedimientos" && userRolId < 5 && (
            <ModuloProcedimientos
              dataMaster={dataMaster}
              onRefresh={() => fetchTodo()}
            />
          )}

          {/* REPORTES */}
          {activeMenu === "Reportes" && userRolId < 5 && (
            <ReporteCitas dataMaster={dataMaster} user={user} />
          )}

          {/* NUEVOS REPORTES CENTRALIZADOS */}
          {activeMenu === "Reporte Citas" && userRolId < 5 && (
            <ReporteCitas dataMaster={dataMaster} user={user} />
          )}

          {activeMenu === "Reporte Pacientes" && userRolId === ROLES.ADMINISTRADOR && (
            <ReportePacientes dataMaster={dataMaster} user={user} setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === "Reporte Finanzas" && userRolId === ROLES.ADMINISTRADOR && (
            <ReporteFinanzas dataMaster={dataMaster} user={user} setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === "Reporte Administración" && userRolId === ROLES.ADMINISTRADOR && (
            <ReporteAdministracion dataMaster={dataMaster} user={user} setActiveMenu={setActiveMenu} />
          )}

          {activeMenu === "Reporte Inventario" && userRolId === ROLES.ADMINISTRADOR && (
            <ReporteInventario dataMaster={dataMaster} user={user} setActiveMenu={setActiveMenu} />
          )}

          {/* CONSULTORIOS */}
          {activeMenu === "Consultorios" && userRolId < 5 && (
            <ModuloConsultorios
              dataMaster={dataMaster}
              onRefresh={() => fetchTodo()}
            />
          )}

          {/* SERVICIOS */}
          {activeMenu === "Servicios" && userRolId < 5 && <ModuloServicios />}

          {activeMenu === "Gestión de Personal" &&
            userRolId === ROLES.ADMINISTRADOR && (
              <ModuloPersonal
                defaultPersonal={selectedStaffGlobal}
                onClearDefaultPersonal={() => setSelectedStaffGlobal(null)}
              />
            )}

          {activeMenu === "Asistencia" && userRolId < 5 && (
            <ModuloAsistencia 
              userRolId={userRolId} 
              user={user} 
              dataMaster={dataMaster} 
              selectedPersonalIdGlobal={selectedAsistenciaPersonalIdGlobal}
              onClearPersonalIdGlobal={() => setSelectedAsistenciaPersonalIdGlobal(null)}
            />
          )}

          {/* MÓDULO EN DESARROLLO */}
          {![
            "Panel de Control",
            "Usuarios y Roles",
            "Cambiar contraseña",
            "Pacientes",
            "Bitácora",
            "Gestión de Personal",
            "Citas",
            "Gestionar Inventario",
            "Registrar Entradas",
            "Registrar Salidas", // <-- Adición exclusiva: Desbloqueamos la vista de mermas y bajas
            "Ajustar Inventario",
            "Procedimientos",
            "Servicios",
            "Reportes",
            "Consultorios",
            "Consultar Cita",
            "Detalle Cita",
            "Pagos y Saldos",
            "Reporte Pacientes",
            "Reporte Citas",
            "Reporte Administración",
            "Reporte Inventario",
            "Reporte Finanzas",
            "Odontograma",
            "Asistencia",
          ].includes(activeMenu) && (
            <div className="h-full flex flex-col items-center justify-center opacity-20 text-center">
              <p className="text-4xl md:text-6xl mb-4">...</p>
              <p className="font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
                Módulo en Desarrollo
              </p>
            </div>
          )}
        </div>
      </main>

      {/* MODAL AGENDAR */}
      {showModalCita && (
        <AgendarCitas
          onClose={() => setShowModalCita(false)}
          user={user}
          dataMaster={dataMaster}
          isStaff={userRolId < 5}
          onRefresh={() => fetchTodo()}
        />
      )}

      {/* ATAJO GLOBAL (COMMAND PALETTE) */}
      <AtajoGlobal
        isOpen={isAtajoOpen}
        setIsOpen={setIsAtajoOpen}
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        userRolId={userRolId}
        dataMaster={dataMaster}
        onSelectPatient={(paciente) => {
          setSelectedPatientGlobal(paciente);
          setSelectedPatientCitasGlobal(null);
          setActiveMenu("Pacientes");
        }}
        onSelectPatientCitas={(paciente) => {
          setSelectedPatientCitasGlobal(paciente);
          setSelectedOdontologoGlobal(null);
          setActiveMenu("Consultar Cita");
        }}
        onSelectStaff={(staff, action) => {
          if (action === "citas") {
            setSelectedOdontologoGlobal(staff.id_personal);
            setSelectedPatientCitasGlobal(null);
            setActiveMenu("Consultar Cita");
          } else if (action === "personal") {
            setSelectedStaffGlobal(staff);
            setActiveMenu("Gestión de Personal");
          } else if (action === "usuario") {
            setSelectedUserGlobal(staff);
            setActiveMenu("Usuarios y Roles");
          } else if (action === "asistencia") {
            setSelectedAsistenciaPersonalIdGlobal(staff.id_personal);
            setActiveMenu("Asistencia");
          }
        }}
      />

      {/* MODAL DE RESULTADO DE ASISTENCIA (POR ESCANEO DIRECTO DESDE CÁMARA CELULAR) */}
      {asistenciaToast && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl border border-gray-100 text-center space-y-6">
            <div className={`p-6 rounded-full mx-auto w-fit ${asistenciaToast.success ? "bg-emerald-50 text-[#148F77]" : "bg-rose-50 text-rose-600"}`}>
              {asistenciaToast.success ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
            </div>
            <div>
              <h4 className="text-lg font-black text-[#2A5C4D] italic uppercase">
                {asistenciaToast.success ? "¡Registro Exitoso!" : "Error de Registro"}
              </h4>
              <p className="text-gray-500 text-[10px] font-bold mt-1 uppercase tracking-wider">
                Control de Asistencia
              </p>
              <p className="text-xs text-gray-600 font-semibold mt-3 lowercase first-letter:uppercase">
                {asistenciaToast.message}
              </p>
            </div>
            <button
              onClick={() => setAsistenciaToast(null)}
              className="w-full py-4 bg-[#148F77] hover:bg-[#117A65] text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg active:scale-95"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

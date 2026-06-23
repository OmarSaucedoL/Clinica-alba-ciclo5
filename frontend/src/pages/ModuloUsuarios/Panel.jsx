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
  const [showModalCita, setShowModalCita] = useState(false);
  const [selectedCitaId, setSelectedCitaId] = useState(null);
  const [originalCitaData, setOriginalCitaData] = useState(null);
  const [returnToView, setReturnToView] = useState(null);
  const [showAgendaPersonalState, setShowAgendaPersonalState] = useState(false);
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
            <div className="text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-widest italic">
              Clínica Alba /{" "}
              <span className="text-[#148F77] font-black">{activeMenu}</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-10">
          {/* PANEL DE CONTROL / DASHBOARDS */}
          {activeMenu === "Panel de Control" &&
            (userRolId === ROLES.ADMINISTRADOR ? (
              <DashboardAdmin
                setView={(v) =>
                  setActiveMenu(
                    v === "bitacora" ? "Bitácora" : "Panel de Control",
                  )
                }
              />
            ) : userRolId === ROLES.ODONTOLOGO ? (
              <DashboardOdontologo openModal={() => setShowModalCita(true)} />
            ) : userRolId === ROLES.RECEPCIONISTA ? (
              <DashboardRecepcionista
                openModal={() => setShowModalCita(true)}
              />
            ) : (
              <DashboardPaciente openModal={() => setShowModalCita(true)} />
            ))}

          {/* GESTIÓN DE USUARIOS */}
          {activeMenu === "Usuarios y Roles" &&
            userRolId === ROLES.ADMINISTRADOR && <ModuloUsuarios />}

          {/* BITÁCORA */}
          {activeMenu === "Bitácora" && userRolId === ROLES.ADMINISTRADOR && (
            <Bitacora />
          )}

          {/* PACIENTES */}
          {activeMenu === "Pacientes" && <ModuloPacientes />}
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

          {/* PERSONAL */}
          {activeMenu === "Gestión de Personal" &&
            userRolId === ROLES.ADMINISTRADOR && <ModuloPersonal />}

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
    </div>
  );
}

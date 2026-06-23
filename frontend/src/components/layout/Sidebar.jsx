import { useState } from "react";
import logo from "../../assets/LOGOTIPO.png";

const ROLES = {
  ADMINISTRADOR: 1,
  ODONTOLOGO: 2,
  ASISTENTE: 3,
  RECEPCIONISTA: 4,
  CLIENTE: 5,
  PACIENTE: 6,
};

export default function Sidebar({
  activeMenu,
  setActiveMenu,
  user,
  dataMaster,
  userRolId,
  logout,
  isOpen,
  setIsOpen,
}) {

  // =========================
  // SUBMENUS
  // =========================

  const [openMenus, setOpenMenus] = useState({
    citas: true,
    usuarios: true,
    pacientes: true,
    administracion: false,
    inventario: false, // <-- Controla el menú de logística
    pagos: true,
    cuenta: true, 
    personal: true,
  });

  const toggleMenu = (menu) => {
    setOpenMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }));
  };

  // =========================
  // USER DATA
  // =========================

  const currentUserData =
    dataMaster?.usuarios?.find(
      (u) =>
        u.id_usuario === user?.id_usuario ||
        u.correo === user?.correo,
    ) || user;

  const usernameDisplay =
    currentUserData?.nombre_usuario ||
    currentUserData?.correo?.split("@")[0] ||
    "usuario";

  const getRolName = (rolId) => {
    const rolEncontrado = Object.keys(ROLES).find(
      (key) => ROLES[key] === Number(rolId),
    );

    return rolEncontrado || "CLIENTE";
  };

  // =========================
  // MENU BUTTON
  // =========================

  const MenuButton = ({ title }) => (
    <button
      onClick={() => {
        setActiveMenu(title);
        setIsOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl transition-all ${
        activeMenu === title
          ? "bg-[#148F77] text-white shadow-xl"
          : "text-gray-400 hover:bg-emerald-50 hover:text-[#148F77]"
      }`}
    >
      <span className="font-bold text-xs">
        {title}
      </span>
    </button>
  );

  return (
    <>
      {/* OVERLAY PARA MÓVIL */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 w-64 bg-white border-r border-gray-100 flex flex-col z-40 shadow-2xl md:shadow-sm transform transition-transform duration-300 ease-in-out ${
          isOpen
            ? "translate-x-0"
            : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* HEADER */}
        <div className="p-8 flex justify-between items-center border-b border-gray-50">
          <img src={logo} alt="Alba" className="h-10" />

          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 text-gray-400 hover:text-red-500"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* USER */}
        <div className="p-6 flex flex-col items-center border-b border-gray-50 bg-gray-50/10">
          <div
            className={`w-16 h-16 rounded-[1.8rem] flex items-center justify-center text-xl font-black mb-3 shadow-lg ${
              userRolId === 1
                ? "bg-orange-50 text-orange-600"
                : "bg-[#148F77] text-white"
            }`}
          >
            {currentUserData?.nombre?.charAt(0) || "U"}
          </div>

          <h3 className="text-[#2A5C4D] font-black text-[11px] text-center leading-tight px-4 uppercase">
            {currentUserData?.nombre || "Usuario"}
          </h3>

          <p className="text-gray-400 text-[10px] font-bold mt-1 tracking-widest lowercase transition-all">
            @{usernameDisplay}
          </p>

          <p className="text-[#148F77] text-[8px] font-black uppercase mt-3 bg-emerald-50 px-3 py-1.5 rounded-full shadow-sm border border-emerald-100">
            {getRolName(userRolId)}
          </p>
        </div>

        {/* NAV */}
        <nav className="flex-1 p-4 space-y-5 overflow-y-auto">

          {/* CITAS */}
          <div>
            <button
              onClick={() => toggleMenu("citas")}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              <span>Citas</span>

              <span className="text-lg">
                {openMenus.citas ? "−" : "+"}
              </span>
            </button>

            {openMenus.citas && (
              <div className="mt-2 space-y-2">
                <MenuButton title="Citas" />
                {Number(userRolId) < 5 && <MenuButton title="Procedimientos" />}
                {Number(userRolId) < 5 && <MenuButton title="Servicios" />}
                {Number(userRolId) < 5 && <MenuButton title="Reportes" />}
                {Number(userRolId) < 5 && <MenuButton title="Consultorios" />}

              </div>
            )}
          </div>

          {/* USUARIOS */}
          {Number(userRolId) === 1 && (
            <div>
              <button
                onClick={() => toggleMenu("usuarios")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span>Usuarios</span>

                <span className="text-lg">
                  {openMenus.usuarios ? "−" : "+"}
                </span>
              </button>

              {openMenus.usuarios && (
                <div className="mt-2 space-y-2">
                  <MenuButton title="Usuarios y Roles" />
                </div>
              )}
            </div>
          )}

          {/* PACIENTES */}
          {[1, 2, 4].includes(Number(userRolId)) && (
            <div>
              <button
                onClick={() => toggleMenu("pacientes")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span>Pacientes</span>

                <span className="text-lg">
                  {openMenus.pacientes ? "−" : "+"}
                </span>
              </button>

              {openMenus.pacientes && (
                <div className="mt-2 space-y-2">
                  <MenuButton title="Pacientes" />
                   <MenuButton title="Odontograma" />
                </div>
              )}
            </div>
          )}

          {/* ADMINISTRACION */}
          {Number(userRolId) === 1 && (
            <div>
              <button
                onClick={() => toggleMenu("administracion")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span>Administración</span>

                <span className="text-lg">
                  {openMenus.administracion ? "−" : "+"}
                </span>
              </button>

              {openMenus.administracion && (
                <div className="mt-2 space-y-2">
                  <MenuButton title="Gestión de Personal" />
                  <MenuButton title="Bitácora" />
                </div>
              )}
            </div>
          )}

          {/* INVENTARIO */}
          {Number(userRolId) === 1 && (
            <div>
              <button
                onClick={() => toggleMenu("inventario")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span>Inventario</span>

                <span className="text-lg">
                  {openMenus.inventario ? "−" : "+"}
                </span>
              </button>

              {openMenus.inventario && (
                <div className="mt-2 space-y-2">
                  <MenuButton title="Gestionar Inventario" />
                  <MenuButton title="Registrar Entradas" />
                  <MenuButton title="Registrar Salidas" /> 
                  <MenuButton title="Ajustar Inventario" /> 
                </div>
              )}
            </div>
          )}

          {/* PAGOS (Visible para Admin, Recepcionista y Paciente) */}
          {[1, 4, 5, 6].includes(Number(userRolId)) && (
            <div>
              <button
                onClick={() => toggleMenu("pagos")}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
              >
                <span>Facturación</span>
                <span className="text-lg">
                  {openMenus.pagos ? "−" : "+"}
                </span>
              </button>

              {openMenus.pagos && (
                <div className="mt-2 space-y-2">
                  <MenuButton title="Pagos y Saldos" />
                </div>
              )}
            </div>
          )}

          {/* MI CUENTA (Visible para TODOS los roles) */}
          <div>
            <button
              onClick={() => toggleMenu("cuenta")}
              className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400"
            >
              <span>Mi Cuenta</span>
              <span className="text-lg">
                {openMenus.cuenta ? "−" : "+"}
              </span>
            </button>

            {openMenus.cuenta && (
              <div className="mt-2 space-y-2">
                <MenuButton title="Cambiar contraseña" />
              </div>
            )}
          </div>

        </nav>

        {/* FOOTER */}
        <div className="p-6 border-t">
          <button
            onClick={logout}
            className="w-full py-4 rounded-2xl text-red-400 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>
    </>
  );
}
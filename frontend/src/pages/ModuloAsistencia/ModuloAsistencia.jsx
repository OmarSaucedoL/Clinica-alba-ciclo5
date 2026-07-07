import { useState, useEffect } from "react";
import TabProyectarQR from "./components/TabProyectarQR";
import TabEscanearQR from "./components/TabEscanearQR";
import TabHistorialPersonal from "./components/TabHistorialPersonal";
import TabReporteMensual from "./components/TabReporteMensual";

export default function ModuloAsistencia({ 
  userRolId, 
  user, 
  dataMaster, 
  selectedPersonalIdGlobal, 
  onClearPersonalIdGlobal 
}) {
  const isAdmin = Number(userRolId) === 1;
  const [activeTab, setActiveTab] = useState(isAdmin ? "proyectar" : "escanear");

  useEffect(() => {
    if (selectedPersonalIdGlobal) {
      setActiveTab("reporte");
    }
  }, [selectedPersonalIdGlobal]);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    if (onClearPersonalIdGlobal) {
      onClearPersonalIdGlobal();
    }
  };

  return (
    <div className="w-full flex flex-col space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-100 gap-4">
        <div>
          <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight uppercase">
            Control de Asistencia
          </h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">
            {isAdmin ? "PANEL DE ADMINISTRACIÓN Y REPORTES" : "REGISTRO DE MARCAS DIARIAS"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1.5 border-b border-gray-100">
        {isAdmin && (
          <button
            onClick={() => handleTabChange("proyectar")}
            className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === "proyectar"
                ? "bg-[#2A5C4D] text-white shadow-lg shadow-emerald-900/10"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
            }`}
          >
            Proyectar QR
          </button>
        )}
        <button
          onClick={() => handleTabChange("escanear")}
          className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "escanear"
              ? "bg-[#2A5C4D] text-white shadow-lg shadow-emerald-900/10"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          Escanear QR
        </button>
        <button
          onClick={() => handleTabChange("historial")}
          className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "historial"
              ? "bg-[#2A5C4D] text-white shadow-lg shadow-emerald-900/10"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          Historial
        </button>
        <button
          onClick={() => handleTabChange("reporte")}
          className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
            activeTab === "reporte"
              ? "bg-[#2A5C4D] text-white shadow-lg shadow-emerald-900/10"
              : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
          }`}
        >
          Reporte Mensual
        </button>
      </div>

      {/* Renders de Tabs */}
      {activeTab === "proyectar" && isAdmin && (
        <TabProyectarQR user={user} />
      )}

      {activeTab === "escanear" && (
        <TabEscanearQR user={user} />
      )}

      {activeTab === "historial" && (
        <TabHistorialPersonal userRolId={userRolId} user={user} />
      )}

      {activeTab === "reporte" && (
        <TabReporteMensual 
          userRolId={userRolId} 
          user={user} 
          dataMaster={dataMaster} 
          selectedPersonalIdGlobal={selectedPersonalIdGlobal}
        />
      )}
    </div>
  );
}

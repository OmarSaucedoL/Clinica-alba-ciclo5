import { useState, useEffect } from "react";
import Comprobante from "./Comprobante";

const API_URL = import.meta.env.VITE_API_URL;

export default function ModuloPagos({ dataMaster, user }) {
  const [citasConSaldo, setCitasConSaldo] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Detalle de la cita seleccionada para pagar
  const [selectedCita, setSelectedCita] = useState(null);
  const [saldoDetails, setSaldoDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Configuración de PayPal desde el backend
  const [paypalConfig, setPaypalConfig] = useState({ client_id: "", tipo_cambio: 9.85 });

  // Formulario de pagos
  const [paymentAmount, setPaymentAmount] = useState("");
  const [billingName, setBillingName] = useState("");
  const [billingNit, setBillingNit] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [isInstallment, setIsInstallment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("EFECTIVO"); // EFECTIVO, TARJETA, TRANSFERENCIA
  const [paymentMode, setPaymentMode] = useState("manual"); // manual, paypal
  const [amountConfirmed, setAmountConfirmed] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Filtro de estado para cobros/pagos
  const [statusFilter, setStatusFilter] = useState("TODOS"); // TODOS, PENDIENTES, PAGADAS

  // Descuentos (solo para personal)
  const [discountAmount, setDiscountAmount] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const userRolId = user?.rol ? Number(user.rol) : null;
  const isPatient = userRolId >= 5;

  // Cargar configuración de PayPal al montar
  useEffect(() => {
    fetch(`${API_URL}/finanzas/config`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setPaypalConfig({
            client_id: res.paypal_client_id,
            tipo_cambio: parseFloat(res.tipo_cambio)
          });
        }
      })
      .catch(err => console.error("Error cargando config de pagos", err));
  }, []);

  // Cargar citas con saldos
  const fetchCitasSaldos = async () => {
    setLoading(true);
    setError("");
    try {
      let endpoint = "";
      if (isPatient) {
        // Citas del paciente actual
        endpoint = `${API_URL}/finanzas/saldos/paciente/${user.id_persona}`;
      } else {
        // Todos los saldos (que auto-inicializa y retorna nombres de pacientes)
        endpoint = `${API_URL}/finanzas/saldos`;
      }

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const resData = await res.json();

      if (resData.success || resData.data) {
        setCitasConSaldo(resData.data || []);
      } else {
        setError(resData.message || "Error al cargar saldos.");
      }
    } catch (err) {
      setError("Error de conexión al obtener datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitasSaldos();
  }, [isPatient]);

  // Cargar detalle de saldo e historial de pagos de una cita elegida
  const fetchCitaSaldo = async (idCita) => {
    setLoadingDetails(true);
    try {
      const res = await fetch(`${API_URL}/finanzas/saldos/${idCita}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });
      const data = await res.json();
      if (data.success) {
        setSaldoDetails(data.data);
        setPaymentAmount(data.data.saldo_actual_bob.toString());
        setDiscountAmount(data.data.descuento_bob.toString());
        
        // Buscar el correo del paciente si es posible
        if (!isPatient && dataMaster?.usuarios) {
          const u = dataMaster.usuarios.find(userObj => userObj.id_persona === data.data.id_paciente);
          if (u) {
            setReceiptEmail(u.correo || "");
          }
        } else if (isPatient) {
          setReceiptEmail(user?.correo || "");
        }
      } else {
        alert("Error al cargar detalles de saldo: " + data.message);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSelectCita = (cita) => {
    setSelectedCita(cita);
    setSaldoDetails(null);
    setAmountConfirmed(false);
    setPaymentMode(isPatient ? "paypal" : "manual");
    setBillingName(isPatient ? (user?.nombre || "") : "");
    setBillingNit("");
    setBillingPhone("");
    setIsInstallment(false);
    fetchCitaSaldo(cita.id_cita);
  };

  const handleClosePayment = () => {
    setSelectedCita(null);
    setSaldoDetails(null);
    setAmountConfirmed(false);
    fetchCitasSaldos();
  };

  // Aplicar descuento
  const handleApplyDiscount = async () => {
    if (!selectedCita) return;
    setApplyingDiscount(true);
    try {
      const res = await fetch(`${API_URL}/finanzas/saldos/generar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          id_cita: selectedCita.id_cita,
          descuento: parseFloat(discountAmount || 0.0)
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("Descuento aplicado correctamente y saldo recalculado.");
        fetchCitaSaldo(selectedCita.id_cita);
      } else {
        alert("Error al aplicar descuento: " + data.message);
      }
    } catch (err) {
      alert("Error de conexión.");
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Registrar Pago Manual (Personal)
  const handleRegisterManualPayment = async (e) => {
    e.preventDefault();
    if (!selectedCita || !paymentAmount || Number(paymentAmount) <= 0) return;

    // Validar datos de facturación requeridos
    if (!billingName.trim()) {
      alert("Debe ingresar el Nombre / Razón Social para la factura.");
      return;
    }
    if (!billingNit.trim()) {
      alert("Debe ingresar el CI / NIT para la factura.");
      return;
    }

    setProcessing(true);
    try {
      const parts = [billingName.trim()];
      parts.push(`NIT: ${billingNit.trim()}`);
      if (billingPhone.trim()) {
        parts.push(`Tel: ${billingPhone.trim()}`);
      }
      const nombreFinal = parts.join(" - ").slice(0, 100);

      const res = await fetch(`${API_URL}/finanzas/registrar-manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          id_cita: selectedCita.id_cita,
          monto_bob: parseFloat(paymentAmount),
          nombre_factura: nombreFinal,
          metodo_pago: paymentMethod,
          correo_envio: receiptEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("¡Pago manual registrado exitosamente! Comprobante enviado por correo.");
        fetchCitaSaldo(selectedCita.id_cita);
      } else {
        alert("Error al registrar pago: " + data.message);
      }
    } catch (err) {
      alert("Error de conexión al procesar.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDeletePayment = async (idFactura, montoBob) => {
    if (!window.confirm(`¿Está seguro de que desea revertir este pago de ${montoBob.toFixed(2)} BOB? Esta acción es irreversible y restaurará la deuda correspondiente.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_URL}/finanzas/eliminar-pago/${idFactura}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await res.json();
      if (data.success) {
        alert("Pago revertido con éxito. El saldo de la cita ha sido restaurado.");
        fetchCitaSaldo(selectedCita.id_cita);
        fetchCitasSaldos();
      } else {
        alert("Error al revertir el pago: " + data.message);
      }
    } catch (err) {
      alert("Error de conexión al intentar revertir el pago.");
    }
  };

  useEffect(() => {
    if (selectedCita && paymentMode === "paypal" && amountConfirmed) {
      renderPaypalButtons();
    }
  }, [selectedCita, paymentMode, amountConfirmed]);

  const handleConfirmAmount = () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      alert("Ingrese un monto válido a pagar.");
      return;
    }
    if (saldoDetails && Number(paymentAmount) > saldoDetails.saldo_actual_bob + 0.01) {
      alert("El monto a pagar no puede superar el saldo pendiente.");
      return;
    }
    // Validar datos de facturación requeridos
    if (!billingName.trim()) {
      alert("Debe ingresar el Nombre / Razón Social para la factura.");
      return;
    }
    if (!billingNit.trim()) {
      alert("Debe ingresar el CI / NIT para la factura.");
      return;
    }
    setAmountConfirmed(true);
    
    // Si es paciente o staff, renderizar botones después de confirmar
    setTimeout(() => {
      renderPaypalButtons();
    }, 100);
  };

  const renderPaypalButtons = () => {
    const container = document.getElementById("paypal-button-container");
    if (!container) return;
    container.innerHTML = ""; // Limpiar previo

    // Asegurarse de que el SDK está cargado
    if (!window.paypal) {
      const script = document.createElement("script");
      script.src = `https://www.paypal.com/sdk/js?client-id=${paypalConfig.client_id}&currency=USD`;
      script.async = true;
      script.onload = () => {
        initPaypalButtons();
      };
      document.body.appendChild(script);
    } else {
      initPaypalButtons();
    }
  };

  const initPaypalButtons = () => {
    if (!window.paypal || !document.getElementById("paypal-button-container")) return;
    
    // Evitar renderizado doble
    document.getElementById("paypal-button-container").innerHTML = "";

    window.paypal.Buttons({
      createOrder: async function() {
        try {
          const res = await fetch(`${API_URL}/finanzas/paypal/crear-orden`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              id_cita: selectedCita.id_cita,
              monto_bob: parseFloat(paymentAmount)
            })
          });
          const orderData = await res.json();
          if (!orderData.success) {
            alert("Error al crear la orden de PayPal: " + orderData.message);
            throw new Error(orderData.message);
          }
          return orderData.order_id;
        } catch (err) {
          console.error(err);
          throw err;
        }
      },
      onApprove: async function(data) {
        setProcessing(true);
        try {
          const parts = [billingName.trim() || "PAGO PAYPAL"];
          if (billingNit.trim()) {
            parts.push(`NIT: ${billingNit.trim()}`);
          }
          if (billingPhone.trim()) {
            parts.push(`Tel: ${billingPhone.trim()}`);
          }
          const nombreFinal = parts.join(" - ").slice(0, 100);

          const res = await fetch(`${API_URL}/finanzas/paypal/capturar-orden`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
              id_cita: selectedCita.id_cita,
              order_id: data.orderID,
              monto_bob: parseFloat(paymentAmount),
              nombre_factura: nombreFinal,
              correo_envio: receiptEmail
            })
          });
          const captureData = await res.json();
          if (captureData.success) {
            alert("¡Pago con PayPal procesado exitosamente! Recibo enviado al correo.");
            setAmountConfirmed(false);
            fetchCitaSaldo(selectedCita.id_cita);
          } else {
            alert("Error al capturar el pago: " + captureData.message);
          }
        } catch (err) {
          alert("Error de conexión al capturar el pago.");
        } finally {
          setProcessing(false);
        }
      },
      onError: function(err) {
        console.error("PayPal Error:", err);
        alert("Ocurrió un error con la pasarela de PayPal.");
      }
    }).render("#paypal-button-container");
  };

  // Filtros de búsqueda (Staff)
  const getPacienteName = (id) => {
    const p = dataMaster?.pacientes?.find(pac => (pac.id_persona || pac.id) == id);
    return p ? p.nombre : `Paciente #${id}`;
  };

  const getOdontologoName = (id) => {
    const o = dataMaster?.odontologos?.find(od => (od.id_personal || od.id) == id);
    return o ? o.nombre : `Doc. #${id}`;
  };

  const filteredCitas = citasConSaldo.filter(c => {
    const patientName = (c.nombre_paciente || getPacienteName(c.id_paciente)).toLowerCase();
    const docName = (c.nombre_odontologo || getOdontologoName(c.id_personal)).toLowerCase();
    const search = searchTerm.toLowerCase();
    
    const matchesSearch = (
      c.id_cita.toString().includes(search) ||
      patientName.includes(search) ||
      docName.includes(search)
    );

    if (!matchesSearch) return false;

    // Si es paciente no aplicamos el filtro administrativo de estado en la UI
    if (isPatient) return true;

    const saldo_bob = parseFloat(c.saldo_actual_bob ?? 0);
    const isPaid = saldo_bob <= 0;

    if (statusFilter === "PENDIENTES") return !isPaid;
    if (statusFilter === "PAGADAS") return isPaid;
    return true;
  });

  // Calcular métricas resumen (Solo staff)
  const totalPorCobrar = citasConSaldo.reduce((acc, c) => acc + parseFloat(c.saldo_actual_bob || 0), 0);
  const totalRecaudado = citasConSaldo.reduce((acc, c) => acc + (parseFloat(c.saldo_inicial_bob || 0) - parseFloat(c.saldo_actual_bob || 0)), 0);
  const citasConDeuda = citasConSaldo.filter(c => parseFloat(c.saldo_actual_bob || 0) > 0).length;
  const citasLiquidadas = citasConSaldo.filter(c => parseFloat(c.saldo_actual_bob || 0) <= 0).length;

  return (
    <div className="animate-fade-in w-full relative">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-black text-[#2A5C4D] tracking-tight italic">
            Gestión y Control de Pagos
          </h2>
          <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
            {isPatient ? "Administra tus cuentas y realiza pagos en línea" : "Panel administrativo de saldos, deudas y abonos"}
          </p>
        </div>
      </div>

      {/* ERROR */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs font-black uppercase rounded-r-xl">
          {error}
        </div>
      )}

      {/* SUMMARY KPI CARDS */}
      {!isPatient && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up">
          {/* Card 1: Total Recaudado */}
          <div className="bg-white p-6 rounded-[2rem] shadow-md border border-emerald-50 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 text-xs font-black">
              Bs.
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Total Recaudado</p>
              <p className="text-xl font-black text-[#2A5C4D] mt-2 leading-none font-mono">
                {totalRecaudado.toFixed(2)} BOB
              </p>
              <p className="text-[8px] text-gray-400 mt-1 font-semibold">*(Abonos totales y parciales)*</p>
            </div>
          </div>

          {/* Card 2: Total Cuentas por Cobrar */}
          <div className="bg-white p-6 rounded-[2rem] shadow-md border border-red-50 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 text-xs font-black">
              !
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Cuentas por Cobrar</p>
              <p className="text-xl font-black text-red-600 mt-2 leading-none font-mono">
                {totalPorCobrar.toFixed(2)} BOB
              </p>
              <p className="text-[8px] text-gray-400 mt-1 font-semibold">*(Saldos pendientes)*</p>
            </div>
          </div>

          {/* Card 3: Citas con Deuda */}
          <div className="bg-white p-6 rounded-[2rem] shadow-md border border-yellow-50 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-yellow-50 rounded-2xl flex items-center justify-center text-[#B08000] text-xs font-black">
              DEUDA
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Citas con Deuda</p>
              <p className="text-2xl font-black text-gray-800 mt-2 leading-none">
                {citasConDeuda}
              </p>
              <p className="text-[8px] text-gray-400 mt-1 font-semibold">citas por liquidar</p>
            </div>
          </div>

          {/* Card 4: Citas Liquidadas */}
          <div className="bg-white p-6 rounded-[2rem] shadow-md border border-blue-50 flex items-center gap-4 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-500 text-xs font-black">
              ✓
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider leading-none">Citas Liquidadas</p>
              <p className="text-2xl font-black text-gray-800 mt-2 leading-none">
                {citasLiquidadas}
              </p>
              <p className="text-[8px] text-gray-400 mt-1 font-semibold">pagadas al 100%</p>
            </div>
          </div>
        </div>
      )}

      {/* STAFF SEARCH BAR & QUICK FILTERS */}
      {!isPatient && (
        <div className="mb-6 flex flex-col md:flex-row gap-4 items-stretch md:items-center">
          <input
            type="text"
            placeholder="Buscar por ID de cita, paciente o odontólogo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-4 bg-white border border-gray-150 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77] shadow-sm transition-colors"
          />
          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner self-start md:self-auto border border-gray-200">
            {["TODOS", "PENDIENTES", "PAGADAS"].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setStatusFilter(filter)}
                className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  statusFilter === filter
                    ? "bg-white text-[#2A5C4D] shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                {filter === "TODOS" ? "Todas" : filter === "PENDIENTES" ? "Pendientes" : "Pagadas"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TABLE */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-12 h-12 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredCitas.length === 0 ? (
        <div className="bg-white p-16 rounded-[3rem] text-center shadow-lg border border-gray-50">
          <p className="text-[#2A5C4D] text-lg font-black tracking-tight">
            No se encontraron citas o saldos pendientes
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-gray-50">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b-2 border-gray-100 bg-gray-50/50">
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    ID Cita
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Fecha Agendada
                  </th>
                  {!isPatient && (
                    <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Paciente
                    </th>
                  )}
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Especialista
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Saldo Pendiente
                  </th>
                  <th className="py-4 px-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">
                    Acción
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredCitas.map((cita) => {
                  const saldo_bob = parseFloat(cita.saldo_actual_bob ?? 0);
                  const isPaid = saldo_bob <= 0;
                  return (
                    <tr
                      key={cita.id_cita}
                      className="border-b border-gray-50 hover:bg-emerald-50/10 transition-colors"
                    >
                      <td className="py-4 px-6 text-sm font-bold text-gray-800">
                        #{cita.id_cita}
                      </td>
                      <td className="py-4 px-6 text-xs font-semibold text-gray-500">
                        {cita.fecha_agendamiento || "N/A"}
                      </td>
                      {!isPatient && (
                        <td className="py-4 px-6 text-sm font-bold text-gray-700">
                          {cita.nombre_paciente || getPacienteName(cita.id_paciente)}
                        </td>
                      )}
                      <td className="py-4 px-6 text-sm font-medium text-gray-600">
                        {cita.nombre_odontologo || getOdontologoName(cita.id_personal)}
                      </td>
                      <td className="py-4 px-6">
                        {(() => {
                          const saldo_inicial = parseFloat(cita.saldo_inicial_bob ?? 0);
                          const total_pagado = saldo_inicial - saldo_bob;
                          const pct = saldo_inicial > 0 ? Math.min(100, Math.max(0, (total_pagado / saldo_inicial) * 100)) : (isPaid ? 100 : 0);

                          return isPaid ? (
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              <span className="px-3 py-1 self-start rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                                Pagado
                              </span>
                              <div className="w-24 bg-gray-100 rounded-full h-1 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: "100%" }}></div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-1 min-w-[120px]">
                              <div className="flex justify-between items-baseline leading-none">
                                <span className="text-sm font-black text-red-600 font-mono">
                                  {saldo_bob.toFixed(2)} BOB
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold font-mono">
                                  ~{(saldo_bob / paypalConfig.tipo_cambio).toFixed(2)} USD
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                                  <div 
                                    className="bg-[#148F77] h-full rounded-full transition-all duration-500" 
                                    style={{ width: `${pct}%` }}
                                  ></div>
                                </div>
                                <span className="text-[8px] font-black text-[#148F77] leading-none">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleSelectCita(cita)}
                          className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                            isPaid
                              ? "bg-gray-100 text-gray-400 hover:bg-gray-200"
                              : "bg-[#148F77] text-white hover:bg-[#0f6b59]"
                          }`}
                        >
                          {isPaid ? "Historial" : isPatient ? "Pagar" : "Cobrar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAYMENT AND BALANCES SLIDE-OVER / MODAL */}
      {selectedCita && (
        <div className="fixed inset-0 bg-[#2A5C4D]/90 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl shadow-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
              <div>
                <h3 className="text-2xl font-black text-[#2A5C4D] italic tracking-tighter">
                  Gestión de Cuentas - Cita #{selectedCita.id_cita}
                </h3>
                <p className="text-[#148F77] text-xs font-bold uppercase tracking-widest mt-1">
                  Desglose de saldos, abonos y pasarela
                </p>
              </div>
              <button
                onClick={handleClosePayment}
                className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all focus:outline-none"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 lg:p-10 space-y-8">
              {loadingDetails ? (
                <div className="flex justify-center items-center py-20">
                  <div className="w-12 h-12 border-4 border-[#148F77] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : saldoDetails ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* LEFT: Balance status & History */}
                  <div className="space-y-6">
                    <div className="bg-[#F4F9F9] p-6 rounded-[2.5rem] border border-emerald-50 space-y-4">
                      <h4 className="text-xs font-black text-[#2A5C4D] uppercase tracking-widest">
                        Estado Financiero de la Cita
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Costo de Materiales
                          </p>
                          <p className="text-lg font-black text-gray-800">
                            {saldoDetails.costo_materiales_bob.toFixed(2)} BOB
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Descuento Aplicado
                          </p>
                          <p className="text-lg font-black text-[#148F77]">
                            -{saldoDetails.descuento_bob.toFixed(2)} BOB
                          </p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">
                            Monto Inicial Neto
                          </p>
                          <p className="text-lg font-black text-gray-700">
                            {saldoDetails.saldo_inicial_bob.toFixed(2)} BOB
                          </p>
                        </div>
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm">
                          <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">
                            Saldo Actual Pendiente
                          </p>
                          <p className="text-lg font-black text-red-600">
                            {saldoDetails.saldo_actual_bob.toFixed(2)} BOB
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">
                            ({saldoDetails.saldo_actual_usd.toFixed(2)} USD)
                          </p>
                        </div>
                      </div>

                      {/* Barra de progreso de pago en el modal */}
                      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-2">
                        {(() => {
                          const s_ini = parseFloat(saldoDetails.saldo_inicial_bob ?? 0);
                          const s_act = parseFloat(saldoDetails.saldo_actual_bob ?? 0);
                          const tot_p = s_ini - s_act;
                          const pct = s_ini > 0 ? Math.min(100, Math.max(0, (tot_p / s_ini) * 100)) : (s_act <= 0 ? 100 : 0);
                          
                          return (
                            <>
                              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider text-[#2A5C4D]">
                                <span>Progreso de Liquidación</span>
                                <span className="font-mono text-[#148F77]">
                                  {pct.toFixed(0)}% Pagado
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                <div 
                                  className="bg-gradient-to-r from-[#148F77] to-emerald-500 h-full rounded-full transition-all duration-500"
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                              <p className="text-[8px] text-gray-400 font-semibold text-center mt-1">
                                Abonado: {tot_p.toFixed(2)} BOB de {s_ini.toFixed(2)} BOB
                              </p>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Descuentos (Solo Staff) */}
                    {!isPatient && (
                      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h4 className="text-xs font-black text-[#2A5C4D] uppercase tracking-widest mb-3">
                          Aplicar Descuento a Cita (BOB)
                        </h4>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            placeholder="Monto de descuento..."
                            value={discountAmount}
                            onChange={(e) => setDiscountAmount(e.target.value)}
                            className="flex-1 p-3 bg-gray-50 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77]"
                          />
                          <button
                            onClick={handleApplyDiscount}
                            disabled={applyingDiscount}
                            className="px-5 py-3 bg-[#2A5C4D] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#1f453a] transition-all disabled:opacity-50"
                          >
                            {applyingDiscount ? "..." : "Actualizar"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Historial de abonos */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-black text-[#2A5C4D] uppercase tracking-widest">
                        Historial de Abonos / Facturas
                      </h4>
                      {saldoDetails.historial_pagos.length === 0 ? (
                        <p className="text-xs text-gray-400 italic bg-gray-50 p-4 rounded-2xl text-center">
                          Aún no se han registrado abonos para esta cita.
                        </p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {saldoDetails.historial_pagos.map((f, i) => (
                            <div
                              key={i}
                              className="bg-white border border-gray-100 p-4 rounded-2xl shadow-sm flex justify-between items-center"
                            >
                              <div>
                                <p className="text-xs font-bold text-gray-800 truncate max-w-[140px]">
                                  {f.nombre_factura}
                                </p>
                                <p className="text-[10px] text-gray-400 font-semibold">
                                  {f.fecha_factura} ({f.metodo_pago})
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-black text-emerald-600">
                                  +{f.monto_bob.toFixed(2)} BOB
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setSelectedReceipt({
                                    id_factura: f.id_factura,
                                    id_cita: selectedCita.id_cita,
                                    nombre_factura: f.nombre_factura,
                                    fecha_factura: f.fecha_factura,
                                    monto_bob: f.monto_bob,
                                    monto_usd: f.monto_usd,
                                    metodo_pago: f.metodo_pago
                                  })}
                                  className="px-3 py-1.5 bg-[#F4F9F9] hover:bg-emerald-50 text-[#148F77] text-[9px] font-black rounded-lg uppercase tracking-widest border border-emerald-100 transition-colors"
                                >
                                  Ver
                                </button>
                                {!isPatient && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePayment(f.id_factura, f.monto_bob)}
                                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black rounded-lg uppercase tracking-widest border border-rose-100 transition-colors"
                                  >
                                    Revertir
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Payment Execution */}
                  <div className="space-y-6">
                    {saldoDetails.saldo_actual_bob <= 0 ? (
                      <div className="bg-emerald-50 p-8 rounded-[2.5rem] border border-emerald-100 text-center h-full flex flex-col justify-center items-center">
                        <span className="text-4xl mb-4 font-black text-emerald-600">✓</span>
                        <h4 className="text-lg font-black text-emerald-800 italic">
                          ¡Esta cita está totalmente pagada!
                        </h4>
                        <p className="text-xs text-emerald-600 mt-2">
                          No quedan saldos pendientes de liquidación.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-white border border-gray-100 p-6 rounded-[2.5rem] shadow-md space-y-6">
                        
                        {/* Selector de Método de Pago (Solo personal) */}
                        {!isPatient && (
                          <div className="flex bg-gray-100 p-1.5 rounded-2xl">
                            <button
                              type="button"
                              onClick={() => { setPaymentMode("manual"); setAmountConfirmed(false); }}
                              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                paymentMode === "manual" ? "bg-white text-[#2A5C4D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              Pago Manual (Efectivo)
                            </button>
                            <button
                              type="button"
                              onClick={() => { setPaymentMode("paypal"); setAmountConfirmed(false); }}
                              className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                paymentMode === "paypal" ? "bg-white text-[#2A5C4D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                              }`}
                            >
                              PayPal Sandbox
                            </button>
                          </div>
                        )}

                        {/* Detalle del Pago */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-black text-[#2A5C4D] uppercase tracking-widest">
                            Detalles del Abono
                          </h4>

                          {/* Modalidad de Pago */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-[#2A5C4D] uppercase tracking-widest ml-2">
                              Modalidad de Pago
                            </label>
                            <div className="flex gap-4 p-1.5 bg-gray-100 rounded-2xl">
                              <button
                                type="button"
                                disabled={amountConfirmed}
                                onClick={() => {
                                  setIsInstallment(false);
                                  setPaymentAmount(saldoDetails.saldo_actual_bob.toString());
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                  !isInstallment ? "bg-white text-[#2A5C4D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                Pago Completo
                              </button>
                              <button
                                type="button"
                                disabled={amountConfirmed}
                                onClick={() => {
                                  setIsInstallment(true);
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                                  isInstallment ? "bg-white text-[#2A5C4D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                }`}
                              >
                                Pagar en Cuotas / Abono
                              </button>
                            </div>
                          </div>

                          {/* Campo de Monto */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                              Monto a Cancelar (BOB) {!isInstallment && "(Pago Completo)"}
                            </label>
                            <input
                              type="number"
                              disabled={amountConfirmed || !isInstallment}
                              placeholder="Ej: 100"
                              value={paymentAmount}
                              onChange={(e) => setPaymentAmount(e.target.value)}
                              className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77] disabled:opacity-75 disabled:cursor-not-allowed"
                            />
                            {isInstallment && (
                              <p className="text-[9px] text-[#148F77] font-bold ml-2">
                                *(Puedes realizar abonos parciales/cuotas ingresando un monto menor al saldo actual)*
                              </p>
                            )}
                            <p className="text-[10px] text-gray-400 font-bold ml-2">
                              Equivalente: {paymentAmount ? (parseFloat(paymentAmount) / paypalConfig.tipo_cambio).toFixed(2) : "0.00"} USD (T.C. {paypalConfig.tipo_cambio})
                            </p>
                          </div>

                          {/* Inputs específicos para el flujo */}
                          <div className="space-y-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                Nombre para la Factura/Recibo <span className="text-red-500 font-black">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: Juan Pérez"
                                value={billingName}
                                onChange={(e) => setBillingName(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                CI / NIT de Facturación <span className="text-red-500 font-black">*</span>
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: 12345678"
                                value={billingNit}
                                onChange={(e) => setBillingNit(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                Teléfono de Facturación
                              </label>
                              <input
                                type="text"
                                placeholder="Ej: 77123456 (Opcional)"
                                value={billingPhone}
                                onChange={(e) => setBillingPhone(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77]"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                Correo para el Comprobante
                              </label>
                              <input
                                type="email"
                                placeholder="paciente@correo.com"
                                value={receiptEmail}
                                onChange={(e) => setReceiptEmail(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#148F77]"
                              />
                            </div>

                            {paymentMode === "manual" && (
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-2">
                                  Método de Pago Manual
                                </label>
                                <select
                                  value={paymentMethod}
                                  onChange={(e) => setPaymentMethod(e.target.value)}
                                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-700 focus:outline-none"
                                >
                                  <option value="EFECTIVO">Efectivo</option>
                                  <option value="TARJETA">Tarjeta de Débito/Crédito</option>
                                  <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* BOTONES ACCION */}
                          {paymentMode === "manual" ? (
                            <button
                              onClick={handleRegisterManualPayment}
                              disabled={processing || !paymentAmount}
                              className="w-full py-4 bg-[#2A5C4D] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#1f453a] transition-all disabled:opacity-50"
                            >
                              {processing ? "Procesando..." : "Registrar Pago Manual"}
                            </button>
                          ) : (
                            <div className="space-y-4">
                              {!amountConfirmed ? (
                                <button
                                  type="button"
                                  onClick={handleConfirmAmount}
                                  className="w-full py-4 bg-[#148F77] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-[#0f6b59] transition-all"
                                >
                                  Confirmar Monto y Proceder
                                </button>
                              ) : (
                                <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-dashed border-gray-200">
                                  <span className="text-[10px] font-black text-[#148F77]">
                                    Monto Confirmado: {paymentAmount} BOB (~{(parseFloat(paymentAmount) / paypalConfig.tipo_cambio).toFixed(2)} USD)
                                  </span>
                                  <button
                                    onClick={() => setAmountConfirmed(false)}
                                    className="text-xs font-black text-red-500 hover:text-red-700"
                                  >
                                    Editar
                                  </button>
                                </div>
                              )}
                              {/* Contenedor persistente para evitar errores de desmontado de DOM en el SDK de PayPal */}
                              <div
                                id="paypal-button-container"
                                className="z-10 min-h-[150px]"
                                style={{ display: (paymentMode === "paypal" && amountConfirmed) ? "block" : "none" }}
                              ></div>
                            </div>
                          )}

                        </div>

                      </div>
                    )}
                  </div>

                </div>
              ) : null}
            </div>

            {/* Footer Modal */}
            <div className="p-8 border-t border-gray-100 flex justify-end gap-4 bg-gray-50/50 flex-shrink-0">
              <button
                onClick={handleClosePayment}
                className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {selectedReceipt && (
        <Comprobante
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}

    </div>
  );
}

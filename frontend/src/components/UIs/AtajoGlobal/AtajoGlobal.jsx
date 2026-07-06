import { useState, useEffect, useRef } from "react";

const S = {
  row: (sel, accent = "#148F77") => ({
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderRadius: "12px",
    cursor: "pointer",
    transition: "all 0.1s",
    border: sel ? `1px solid ${accent}` : "1px solid transparent",
    background: sel ? accent : "white",
    color: sel ? "white" : "#374151",
  }),
  badge: (sel, accent = "#148F77") => ({
    fontSize: "8px",
    fontWeight: 900,
    padding: "2px 8px",
    borderRadius: "6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    background: sel ? "white" : "rgba(209,250,229,0.5)",
    color: accent,
    border: sel ? "none" : "1px solid rgba(167,243,208,0.5)",
  }),
  avatar: (sel, accent = "#148F77") => ({
    width: 32,
    height: 32,
    borderRadius: 10,
    fontWeight: 900,
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: sel ? "white" : "rgba(209,250,229,0.5)",
    color: accent,
    border: sel ? "none" : "1px solid rgba(167,243,208,0.5)",
  }),
  sectionHeader: {
    padding: "4px 12px",
    fontSize: 9,
    fontWeight: 900,
    color: "#2A5C4D",
    background: "rgba(209,250,229,0.3)",
    borderRadius: 8,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: 6,
    border: "1px solid rgba(167,243,208,0.3)",
  },
};

const initials = (nombre) =>
  (nombre || "")
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "?";

export default function AtajoGlobal({
  isOpen,
  setIsOpen,
  activeMenu,
  setActiveMenu,
  userRolId,
  dataMaster,
  onSelectPatient,
  onSelectPatientCitas,
  onSelectStaff,
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [staffCtx, setStaffCtx] = useState(null); // item de personal seleccionado
  const [patientCtx, setPatientCtx] = useState(null); // item de paciente seleccionado
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const scrollRef = useRef(null);

  // ── OPCIONES DE NAVEGACIÓN ────────────────────────────────────────────────
  const navOptions = (() => {
    const rol = Number(userRolId);
    const add = (title, label, category) => ({ title, label, category });
    const opts = [
      add(
        "Panel de Control",
        "Ir al Panel de Control (Dashboard)",
        "Navegación",
      ),
      add("Citas", "Ver Agenda y Citas Médicas", "Navegación"),
    ];
    if (rol < 5)
      opts.push(
        add("Asistencia", "Control de Asistencia de Personal", "Navegación"),
      );
    if (rol === 1)
      opts.push(
        add(
          "Procedimientos",
          "Gestionar Procedimientos Clínicos",
          "Navegación",
        ),
        add("Servicios", "Gestionar Servicios Odontológicos", "Navegación"),
        add("Consultorios", "Administrar Consultorios y Salas", "Navegación"),
      );
    if ([1, 2, 4].includes(rol))
      opts.push(
        add("Pacientes", "Ver Listado de Pacientes y Fichas", "Navegación"),
        add("Odontograma", "Ver Odontograma Clínico", "Navegación"),
      );
    if (rol === 1)
      opts.push(
        add(
          "Usuarios y Roles",
          "Gestionar Cuentas de Usuarios",
          "Administración",
        ),
        add(
          "Gestión de Personal",
          "Administrar Personal y Odontólogos",
          "Administración",
        ),
        add(
          "Bitácora",
          "Consultar Bitácora de Actividades (Logs)",
          "Administración",
        ),
        add(
          "Gestionar Inventario",
          "Ver Inventario y Stock de Suministros",
          "Logística e Inventario",
        ),
        add(
          "Registrar Entradas",
          "Registrar Entrada de Productos",
          "Logística e Inventario",
        ),
        add(
          "Registrar Salidas",
          "Registrar Salida / Descarte de Productos",
          "Logística e Inventario",
        ),
        add(
          "Ajustar Inventario",
          "Ajustar Stock del Inventario",
          "Logística e Inventario",
        ),
      );
    if ([1, 4, 5, 6].includes(rol))
      opts.push(
        add(
          "Pagos y Saldos",
          "Consultar Pagos, Saldos y Comprobantes",
          "Facturación",
        ),
      );
    if (rol < 5) {
      opts.push(add("Reporte Citas", "Generar Reporte de Citas", "Reportes"));
      if (rol === 1)
        opts.push(
          add("Reporte Pacientes", "Generar Reporte de Pacientes", "Reportes"),
          add("Reporte Finanzas", "Generar Reporte de Finanzas", "Reportes"),
          add(
            "Reporte Administración",
            "Generar Reporte de Administración",
            "Reportes",
          ),
          add(
            "Reporte Inventario",
            "Generar Reporte de Inventario",
            "Reportes",
          ),
        );
    }
    opts.push(
      add("Cambiar contraseña", "Cambiar mi Contraseña", "Configuración"),
    );
    return opts;
  })();

  // ── RESULTADOS ORDENADOS ─────────────────────────────────────────────────
  const results = (() => {
    if (staffCtx)
      return [
        {
          title: "Consultar Citas / Agenda",
          action: "citas",
          cat: "ctx-staff",
        },
        ...(Number(userRolId) === 1
          ? [
              {
                title: "Administrar Perfil (Personal)",
                action: "personal",
                cat: "ctx-staff",
              },
              {
                title: "Administrar Cuenta (Usuario)",
                action: "usuario",
                cat: "ctx-staff",
              },
              {
                title: "Consultar Asistencia",
                action: "asistencia",
                cat: "ctx-staff",
              },
            ]
          : []),
        { title: "Volver a la búsqueda", action: "atras", cat: "ctx-staff" },
      ];
    if (patientCtx)
      return [
        {
          title: "Ver Historial Clínico",
          action: "historial",
          cat: "ctx-patient",
        },
        {
          title: "Consultar Citas del Paciente",
          action: "citas",
          cat: "ctx-patient",
        },
        { title: "Volver a la búsqueda", action: "atras", cat: "ctx-patient" },
      ];
    const rol = Number(userRolId);
    const canSee = [1, 2, 4].includes(rol);
    const q = query.trim().toLowerCase();
    const navs = navOptions.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        o.label.toLowerCase().includes(q) ||
        o.category.toLowerCase().includes(q),
    );
    const allStaff = canSee
      ? (() => {
          const map = {};
          (dataMaster?.odontologos || []).forEach((o) => {
            const id = o.id_personal || o.id_odontologo || o.id;
            if (id)
              map[id] = {
                id,
                nombre: o.nombre,
                cargo: o.especialidad
                  ? `Odontólogo (${o.especialidad})`
                  : "Odontólogo",
                staffObj: { ...o, id_personal: id },
                cat: "staff",
              };
          });
          (dataMaster?.usuarios || []).forEach((u) => {
            const id = u.id_personal || u.id_usuario || u.id;
            if (id && !map[id]) {
              const r = Number(u.rol || u.id_rol);
              const cargo =
                r === 1
                  ? "Administrador"
                  : r === 2
                    ? "Odontólogo"
                    : r === 3
                      ? "Asistente"
                      : r === 4
                        ? "Recepcionista"
                        : "Personal";
              map[id] = {
                id,
                nombre: u.nombre || u.nombre_usuario,
                cargo,
                staffObj: { ...u, id_personal: id, cargo },
                cat: "staff",
              };
            }
          });
          return Object.values(map);
        })()
      : [];
    const filteredStaff = q
      ? allStaff.filter((s) => s.nombre?.toLowerCase().includes(q))
      : [];
    const allPats = canSee
      ? (dataMaster?.pacientes || []).map((p) => ({
          id: p.id_paciente || p.id,
          nombre: p.nombre,
          rut: p.rut || p.cedula || p.documento || "",
          pacienteObj: p,
          cat: "patient",
        }))
      : [];
    const filteredPats = q
      ? allPats.filter(
          (p) =>
            p.nombre.toLowerCase().includes(q) ||
            p.rut.toLowerCase().includes(q),
        )
      : [];
    return [...navs, ...filteredStaff, ...filteredPats];
  })();

  // ── EFECTOS ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler, { capture: true });
    return () =>
      window.removeEventListener("keydown", handler, { capture: true });
  }, [setIsOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setStaffCtx(null);
      setPatientCtx(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (staffCtx || patientCtx) containerRef.current?.focus();
    else if (isOpen) setTimeout(() => inputRef.current?.focus(), 30);
  }, [staffCtx, patientCtx]);

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-i="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  // ── HANDLERS ──────────────────────────────────────────────────────────────
  const select = (item) => {
    if (item.cat === "ctx-staff") {
      if (item.action === "atras") {
        setStaffCtx(null);
        setSelectedIndex(0);
      } else {
        onSelectStaff?.(staffCtx.staffObj, item.action);
        setIsOpen(false);
      }
    } else if (item.cat === "ctx-patient") {
      if (item.action === "atras") {
        setPatientCtx(null);
        setSelectedIndex(0);
      } else if (item.action === "historial") {
        onSelectPatient?.(patientCtx.pacienteObj);
        setIsOpen(false);
      } else if (item.action === "citas") {
        onSelectPatientCitas?.(patientCtx.pacienteObj);
        setIsOpen(false);
      }
    } else if (item.cat === "staff") {
      setStaffCtx(item);
      setSelectedIndex(0);
    } else if (item.cat === "patient") {
      setPatientCtx(item);
      setSelectedIndex(0);
    } else {
      setActiveMenu(item.title);
      setIsOpen(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((p) => (p + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      setSelectedIndex((p) => (p - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (results[selectedIndex]) select(results[selectedIndex]);
    }
  };

  if (!isOpen) return null;

  // ── RENDER ────────────────────────────────────────────────────────────────
  const isCtx = staffCtx || patientCtx;
  const ctxItem = staffCtx || patientCtx;
  const ctxAccent = staffCtx ? "#148F77" : "#3b82f6";
  const ctxBg = staffCtx ? "#f0fdf4" : "#eff6ff";
  const ctxBorder = staffCtx ? "#d1fae5" : "#bfdbfe";
  const ctxRole = staffCtx ? staffCtx.cargo : "Paciente";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "16px",
        paddingTop: "12vh",
      }}
      onClick={(e) => {
        if (!containerRef.current?.contains(e.target)) setIsOpen(false);
      }}
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        onKeyDown={isCtx ? onKey : undefined}
        style={{
          background: "white",
          border: "1px solid #f3f4f6",
          borderRadius: 24,
          boxShadow: "0 25px 50px rgba(0,0,0,0.2)",
          maxWidth: 512,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          outline: "none",
        }}
      >
        {/* Cabecera */}
        {!isCtx ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 20px",
              borderBottom: "1px solid #f9fafb",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: 20, height: 20, color: "#9ca3af", flexShrink: 0 }}
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
            <input
              ref={inputRef}
              type="text"
              placeholder="¿Qué deseas buscar? (Ej: Citas, Paciente...)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              onKeyDown={onKey}
              style={{
                flex: 1,
                background: "transparent",
                fontSize: 14,
                fontWeight: 700,
                color: "#1f2937",
                outline: "none",
                border: "none",
              }}
            />
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: 4,
                color: "#9ca3af",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                style={{ width: 16, height: 16 }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid #f9fafb",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: "#374151",
                textTransform: "uppercase",
              }}
            >
              Acciones disponibles
            </span>
            <button
              onClick={() => {
                setStaffCtx(null);
                setPatientCtx(null);
                setSelectedIndex(0);
              }}
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: "#9ca3af",
                background: "#f9fafb",
                border: "1px solid #f3f4f6",
                padding: "6px 12px",
                borderRadius: 20,
                cursor: "pointer",
              }}
            >
              Volver a buscar
            </button>
          </div>
        )}

        {/* Cuerpo */}
        <div ref={scrollRef} style={{ overflowY: "auto", maxHeight: 380 }}>
          {isCtx ? (
            <div
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Tarjeta del contexto */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: `1px solid ${ctxBorder}`,
                  background: ctxBg,
                  padding: 12,
                  borderRadius: 16,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: ctxAccent,
                    color: "white",
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                  }}
                >
                  {initials(ctxItem.nombre)}
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: "#374151",
                      textTransform: "uppercase",
                    }}
                  >
                    {ctxItem.nombre}
                  </p>
                  <p
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      color: ctxAccent,
                      textTransform: "uppercase",
                    }}
                  >
                    {ctxRole}
                  </p>
                </div>
              </div>
              {/* Opciones del submenú */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {results.map((item, i) => {
                  const isSel = selectedIndex === i;
                  const isBack = item.action === "atras";
                  const accent = isBack ? "#ef4444" : ctxAccent;
                  return (
                    <div
                      key={i}
                      data-i={i}
                      onClick={() => select(item)}
                      onMouseEnter={() => setSelectedIndex(i)}
                      style={S.row(isSel, accent)}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        {item.title}
                      </span>
                      {isSel && (
                        <span style={S.badge(true, accent)}>Enter</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : results.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "#9ca3af",
                fontWeight: 700,
                fontSize: 11,
                textTransform: "uppercase",
              }}
            >
              No se encontraron resultados
            </div>
          ) : (
            <div
              style={{
                padding: 8,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {/* Navegación */}
              {(() => {
                const navs = results.filter(
                  (r) => r.cat !== "staff" && r.cat !== "patient",
                );
                const staff = results.filter((r) => r.cat === "staff");
                const pats = results.filter((r) => r.cat === "patient");
                const so = navs.length,
                  po = navs.length + staff.length;
                return (
                  <>
                    {navs.length > 0 && (
                      <div>
                        <div style={S.sectionHeader}>Menú y Herramientas</div>
                        {navs.map((item, i) => {
                          const isSel = selectedIndex === i;
                          return (
                            <div
                              key={i}
                              data-i={i}
                              onClick={() => select(item)}
                              onMouseEnter={() => setSelectedIndex(i)}
                              style={{ ...S.row(isSel), marginBottom: 4 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                <div
                                  style={{
                                    padding: 6,
                                    borderRadius: 8,
                                    background: isSel
                                      ? "rgba(255,255,255,0.2)"
                                      : "rgba(209,250,229,0.5)",
                                    color: isSel ? "white" : "#148F77",
                                  }}
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ width: 16, height: 16 }}
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2.5}
                                      d="M9 5l7 7-7 7"
                                    />
                                  </svg>
                                </div>
                                <div>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      color: isSel ? "white" : "#2A5C4D",
                                    }}
                                  >
                                    {item.title}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: isSel
                                        ? "rgba(209,250,229,0.9)"
                                        : "#9ca3af",
                                    }}
                                  >
                                    {item.label}
                                  </p>
                                </div>
                              </div>
                              {isSel && (
                                <span style={S.badge(true)}>Enter</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {staff.length > 0 && (
                      <div>
                        <div style={S.sectionHeader}>
                          Personal y Odontólogos
                        </div>
                        {staff.map((item, i) => {
                          const abs = so + i;
                          const isSel = selectedIndex === abs;
                          return (
                            <div
                              key={i}
                              data-i={abs}
                              onClick={() => select(item)}
                              onMouseEnter={() => setSelectedIndex(abs)}
                              style={{ ...S.row(isSel), marginBottom: 4 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                <div style={S.avatar(isSel)}>
                                  {initials(item.nombre)}
                                </div>
                                <div>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      color: isSel ? "white" : "#2a5c4d",
                                    }}
                                  >
                                    {item.nombre}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: isSel
                                        ? "rgba(209,250,229,0.9)"
                                        : "#9ca3af",
                                    }}
                                  >
                                    {item.cargo}
                                  </p>
                                </div>
                              </div>
                              <span style={S.badge(isSel)}>
                                {isSel ? "Opciones" : "Ver Opciones"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {pats.length > 0 && (
                      <div>
                        <div style={S.sectionHeader}>Pacientes</div>
                        {pats.map((item, i) => {
                          const abs = po + i;
                          const isSel = selectedIndex === abs;
                          return (
                            <div
                              key={i}
                              data-i={abs}
                              onClick={() => select(item)}
                              onMouseEnter={() => setSelectedIndex(abs)}
                              style={{ ...S.row(isSel), marginBottom: 4 }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                <div style={S.avatar(isSel)}>
                                  {initials(item.nombre)}
                                </div>
                                <div>
                                  <p
                                    style={{
                                      fontSize: 11,
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                      color: isSel ? "white" : "#2a5c4d",
                                    }}
                                  >
                                    {item.nombre}
                                  </p>
                                  <p
                                    style={{
                                      fontSize: 10,
                                      color: isSel
                                        ? "rgba(209,250,229,0.9)"
                                        : "#9ca3af",
                                    }}
                                  >
                                    {item.rut ? `RUT: ${item.rut}` : ""}
                                  </p>
                                </div>
                              </div>
                              <span style={S.badge(isSel)}>
                                {isSel ? "Ver Historial" : "Historial"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 20px",
            background: "rgba(249,250,251,0.5)",
            borderTop: "1px solid #f3f4f6",
            fontSize: 9,
            fontWeight: 900,
            color: "#9ca3af",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          <span>↑↓ Navegar · Enter Seleccionar · Esc Cerrar</span>
          <kbd
            style={{
              padding: "2px 6px",
              background: "white",
              border: "1px solid #e5e7eb",
              borderRadius: 4,
              fontSize: 8,
              fontFamily: "monospace",
            }}
          >
            Ctrl + K
          </kbd>
        </div>
      </div>
    </div>
  );
}

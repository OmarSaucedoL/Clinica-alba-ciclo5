// Mapea los estados de la tabla clinica.t_cita_estado
export const ESTADO_CITA = {
  PROGRAMADA: 1,
  CANCELADA: 2,
  REPROGRAMADA: 3,
  COMPLETADA: 4,
  NO_ASISTIO: 5,
};

export const ESTADO_CITA_LABELS = {
  [ESTADO_CITA.PROGRAMADA]: "Programada",
  [ESTADO_CITA.CANCELADA]: "Cancelada",
  [ESTADO_CITA.REPROGRAMADA]: "Reprogramada",
  [ESTADO_CITA.COMPLETADA]: "Completada",
  [ESTADO_CITA.NO_ASISTIO]: "No Asistió",
};

export const ESTADO_CITA_COLORS = {
  [ESTADO_CITA.PROGRAMADA]: {
    bg: "bg-emerald-50",
    text: "text-[#148F77]",
    badge: "bg-emerald-100 text-emerald-700",
    bar: "bg-[#148F77]",
  },
  [ESTADO_CITA.CANCELADA]: {
    bg: "bg-red-50",
    text: "text-red-600",
    badge: "bg-red-100 text-red-700",
    bar: "bg-red-500",
  },
  [ESTADO_CITA.REPROGRAMADA]: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    bar: "bg-blue-500",
  },
  [ESTADO_CITA.COMPLETADA]: {
    bg: "bg-gray-50",
    text: "text-gray-600",
    badge: "bg-gray-100 text-gray-700",
    bar: "bg-gray-400",
  },
  [ESTADO_CITA.NO_ASISTIO]: {
    bg: "bg-orange-50",
    text: "text-orange-600",
    badge: "bg-orange-100 text-orange-700",
    bar: "bg-orange-400",
  },
};

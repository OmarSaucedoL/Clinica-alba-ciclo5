import { useState } from "react";

export default function Dientes({
  number,
  type = "incisivo",
  events = [],
  onClick,
}) {
  const [hover, setHover] = useState(false);

  // ===== ESTADO =====
  const estado =
    events?.[0]?.tipo_evento?.toLowerCase() === "caries"
      ? "caries"
      : events?.[0]?.tipo_evento?.toLowerCase() === "extracción"
      ? "ausente"
      : "normal";

  // ===== COLORES =====
  const fill =
    estado === "caries"
      ? "#ef4444"
      : estado === "ausente"
      ? "#111827"
      : "#ffffff";

  const stroke =
    estado === "normal" ? "#333" : estado === "caries" ? "#b91c1c" : "#000";

  // ===== GEOMETRÍA REALISTA =====
  const getPath = () => {
    switch (type) {
      case "canino":
        return `
          M50 5
          C65 10, 80 25, 75 45
          C70 70, 65 95, 60 110
          C55 115, 45 115, 40 110
          C35 95, 30 70, 25 45
          C20 25, 35 10, 50 5
          Z
        `;

      case "molar":
        return `
          M20 15
          C15 30, 15 50, 20 65
          L25 85
          C30 105, 70 105, 75 85
          L80 65
          C85 50, 85 30, 80 15
          C70 5, 30 5, 20 15
          Z
        `;

      default: // incisivo
        return `
          M35 10
          C30 20, 30 40, 32 60
          L32 100
          C35 110, 65 110, 68 100
          L68 60
          C70 40, 70 20, 65 10
          C55 5, 45 5, 35 10
          Z
        `;
    }
  };

  return (
    <div
      onClick={() => onClick?.(number, events, estado)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: "clamp(25px, 4vw, 38px)",
height: "clamp(32px, 4vw, 46px)",
        position: "relative",
        cursor: "pointer",
        transform: hover ? "scale(1.08)" : "scale(1)",
        transition: "0.2s",
      }}
    >
      {/* SVG DENTAL REALISTA */}
      <svg viewBox="0 0 100 120" width="100%" height="100%">
        <path
          d={getPath()}
          fill={fill}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>

      {/* número */}
      <span
        style={{
          position: "absolute",
          top: 3,
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: 10,
          fontWeight: "bold",
        }}
      >
        {number}
      </span>

      {/* badge eventos */}
      {events.length > 0 && (
        <span
          style={{
            position: "absolute",
            bottom: 3,
            left: "50%",
            transform: "translateX(-50%)",
            fontSize: 9,
            background: "black",
            color: "white",
            borderRadius: 4,
            padding: "1px 4px",
          }}
        >
          {events.length}
        </span>
      )}

      {/* iconos estado */}
      {estado === "caries" && (
        <span style={{ position: "absolute", fontSize: 10, top: "40%" }}>
          ⚠
        </span>
      )}

      {estado === "ausente" && (
        <span style={{ position: "absolute", fontSize: 10, top: "40%" }}>
          ✖
        </span>
      )}
    </div>
  );
}
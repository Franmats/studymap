import { useEffect, useRef, useState } from "react";
import { usePomodoroStore } from "../../store/usePomodoroStore.ts";
import type { PomodoroMode } from "../../store/usePomodoroStore.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

const MODE_LABELS: Record<PomodoroMode, string> = {
  work:       "Foco",
  break:      "Descanso",
  long_break: "Descanso largo",
};
const MODE_COLORS: Record<PomodoroMode, string> = {
  work:       "#6C5CE7",
  break:      "#55EFC4",
  long_break: "#48CAE4",
};
const MODE_ICONS: Record<PomodoroMode, string> = {
  work:       "🍅",
  break:      "☕",
  long_break: "🛋️",
};

// ── SVG ring de progreso ──────────────────────────────────────────────────────
function Ring({ pct, color, size = 120 }: { pct: number; color: string; size?: number }) {
  const r     = (size - 10) / 2;
  const circ  = 2 * Math.PI * r;
  const dash  = circ * (1 - pct / 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={6} />
      <circle
        cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dash}
        style={{ transition: "stroke-dashoffset .9s linear, stroke .5s" }}
      />
    </svg>
  );
}

// ── Panel de configuración ────────────────────────────────────────────────────
function ConfigPanel({ onClose }: { onClose: () => void }) {
  const { config, updateConfig } = usePomodoroStore();

  const Row = ({ label, field, min, max, step = 1 }: {
    label: string;
    field: keyof typeof config;
    min: number; max: number; step?: number;
  }) => (
    <div className="pom-cfg-row">
      <span className="pom-cfg-label">{label}</span>
      <div className="pom-cfg-controls">
        <button className="pom-cfg-btn"
          onClick={() => updateConfig({ [field]: Math.max(min, (config[field] as number) - step) })}>−</button>
        <span className="pom-cfg-val">
          {typeof config[field] === "boolean"
            ? (config[field] ? "Sí" : "No")
            : field === "long_break_every"
            ? `cada ${config[field]}`
            : `${config[field]} min`}
        </span>
        <button className="pom-cfg-btn"
          onClick={() => updateConfig({ [field]: Math.min(max, (config[field] as number) + step) })}>+</button>
      </div>
    </div>
  );

  return (
    <div className="pom-config">
      <div className="pom-config-title">⚙️ Configuración</div>
      <Row label="Foco"            field="work_min"         min={5}  max={90} />
      <Row label="Descanso corto"  field="break_min"        min={1}  max={30} />
      <Row label="Descanso largo"  field="long_break_min"   min={5}  max={60} />
      <Row label="Largo cada"      field="long_break_every" min={2}  max={8}  />
      <div className="pom-cfg-row">
        <span className="pom-cfg-label">Auto-iniciar</span>
        <button
          className={`pom-cfg-toggle${config.auto_start ? " on" : ""}`}
          onClick={() => updateConfig({ auto_start: !config.auto_start })}
        >
          {config.auto_start ? "Sí" : "No"}
        </button>
      </div>
      <button className="pom-config-close" onClick={onClose}>Listo</button>
    </div>
  );
}

// ── Widget flotante principal ─────────────────────────────────────────────────
export function PomodoroWidget() {
  const {
    mode, secondsLeft, running, pomodorosHoy, config,
    visible, minimized,
    toggleVisible, toggleMinimized,
    start, pause, reset, skip, tick, pct,
  } = usePomodoroStore();

  const [showConfig, setShowConfig] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick interval
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => tick(), 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Título de la página cuando corre
  useEffect(() => {
    if (running) {
      document.title = `${fmt(secondsLeft)} ${MODE_ICONS[mode]} StudyMap`;
    } else {
      document.title = "StudyMap AI";
    }
    return () => { document.title = "StudyMap AI"; };
  }, [running, secondsLeft, mode]);

  // Notificación al completar (navegador)
  const lastMode = useRef(mode);
  useEffect(() => {
    if (lastMode.current !== mode) {
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification(
          mode === "work" ? "¡A trabajar! 🍅" : "¡Descansá! ☕",
          { body: mode === "work" ? "Comenzó un nuevo pomodoro" : `Completaste ${pomodorosHoy} pomodoros hoy` }
        );
      }
      lastMode.current = mode;
    }
  }, [mode]);

  const color = MODE_COLORS[mode];
  const pctVal = pct();

  // Solicitar permiso de notificaciones al abrir
  useEffect(() => {
    if (visible && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, [visible]);

  // ── FAB (siempre visible) ──────────────────────────────────────────────────
  const fab = (
    <button
      className={`pom-fab${running ? " running" : ""}`}
      style={{ "--pom-color": color } as React.CSSProperties}
      onClick={toggleVisible}
      title="Pomodoro"
    >
      <span className="pom-fab-icon">{running ? "🍅" : "🍅"}</span>
      {running && (
        <span className="pom-fab-time">{fmt(secondsLeft)}</span>
      )}
      {pomodorosHoy > 0 && !running && (
        <span className="pom-fab-badge">{pomodorosHoy}</span>
      )}
    </button>
  );

  if (!visible) return fab;

  return (
    <>
      {fab}

      {/* Overlay oscuro al abrir */}
      <div className="pom-backdrop" onClick={toggleVisible} />

      {/* Widget */}
      <div className={`pom-widget${minimized ? " minimized" : ""}`}
           style={{ "--pom-color": color } as React.CSSProperties}>

        {/* Header */}
        <div className="pom-header">
          <div className="pom-mode-label" style={{ color }}>
            {MODE_ICONS[mode]} {MODE_LABELS[mode]}
          </div>
          <div className="pom-header-actions">
            <button className="pom-icon-btn" onClick={() => setShowConfig(s => !s)} title="Configurar">⚙️</button>
            <button className="pom-icon-btn" onClick={toggleMinimized} title="Minimizar">
              {minimized ? "↑" : "↓"}
            </button>
            <button className="pom-icon-btn" onClick={toggleVisible} title="Cerrar">✕</button>
          </div>
        </div>

        {/* Contador de pomodoros del día */}
        <div className="pom-dots">
          {Array.from({ length: config.long_break_every }).map((_, i) => (
            <div
              key={i}
              className={`pom-dot${i < (pomodorosHoy % config.long_break_every) ? " done" : ""}`}
              style={i < (pomodorosHoy % config.long_break_every) ? { background: color } : {}}
            />
          ))}
          <span className="pom-dots-total">
            {pomodorosHoy > 0 && `${pomodorosHoy} hoy`}
          </span>
        </div>

        {!minimized && (
          <>
            {/* Ring + tiempo */}
            <div className="pom-ring-wrap">
              <Ring pct={pctVal} color={color} size={160} />
              <div className="pom-ring-inner">
                <div className="pom-time" style={{ color }}>{fmt(secondsLeft)}</div>
                <div className="pom-time-label">
                  {mode === "work"
                    ? `${config.work_min} min foco`
                    : mode === "long_break"
                    ? `${config.long_break_min} min`
                    : `${config.break_min} min`}
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="pom-controls">
              <button className="pom-ctrl-btn secondary" onClick={reset} title="Reiniciar">↺</button>
              <button
                className="pom-ctrl-btn primary"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
                onClick={running ? pause : start}
              >
                {running ? "⏸" : "▶"}
              </button>
              <button className="pom-ctrl-btn secondary" onClick={skip} title="Saltar">⏭</button>
            </div>

            {/* Info integración Time Control */}
            {mode === "work" && (
              <div className="pom-tc-hint">
                📚 Suma automáticamente a <strong>Estudio</strong> al completar
              </div>
            )}
          </>
        )}

        {/* Config panel */}
        {showConfig && !minimized && (
          <ConfigPanel onClose={() => setShowConfig(false)} />
        )}
      </div>
    </>
  );
}
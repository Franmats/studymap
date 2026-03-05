import { useState, useMemo } from "react";
import { useTimeControlStore } from "../../store/useTimeControlStore";
import type { ActividadConfig } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().split("T")[0]; }
function fmtFecha(s: string) {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
}
function fmtFechaCorta(s: string) {
  const d = new Date(s + "T00:00:00");
  return d.toLocaleDateString("es-AR", { weekday:"short", day:"numeric", month:"short" });
}
function diasAtras(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function pct(horas: number, max: number) {
  if (max === 0) return Math.min(100, (horas / 8) * 100);
  return Math.min(110, (horas / max) * 100);
}

// ── Barra de progreso de una categoría ───────────────────────────────────────
function CategoriaBar({
  config, horas, onEdit,
}: {
  config: ActividadConfig;
  horas: number;
  onEdit: (cfg: ActividadConfig) => void;
}) {
  const pctVal    = pct(horas, config.max_horas);
  const excedido  = config.max_horas > 0 && horas > config.max_horas;
  const bajo      = config.min_horas > 0 && horas > 0 && horas < config.min_horas;
  const cumplido  = config.min_horas > 0 && horas >= config.min_horas && !excedido;
  const sinDato   = horas === 0;

  const barColor  = excedido ? "#FF6B6B" : cumplido ? "#55EFC4" : config.color;

  return (
    <div className="tc-bar-row" onClick={() => onEdit(config)}>
      <div className="tc-bar-left">
        <span className="tc-bar-icon">{config.icon}</span>
        <div className="tc-bar-info">
          <div className="tc-bar-label">{config.label}</div>
          <div className="tc-bar-limits">
            {config.min_horas > 0 && <span>min {config.min_horas}h</span>}
            {config.min_horas > 0 && config.max_horas > 0 && <span className="tc-bar-sep">·</span>}
            {config.max_horas > 0 && <span>máx {config.max_horas}h</span>}
          </div>
        </div>
      </div>
      <div className="tc-bar-center">
        <div className="tc-bar-track">
          {/* Zona de mínimo */}
          {config.min_horas > 0 && config.max_horas > 0 && (
            <div className="tc-bar-min-mark" style={{ left:`${(config.min_horas/config.max_horas)*100}%` }} />
          )}
          <div
            className={`tc-bar-fill${excedido ? " excedido" : ""}`}
            style={{ width:`${pctVal}%`, background: barColor, boxShadow: sinDato ? "none" : `0 0 8px ${barColor}55` }}
          />
        </div>
        {/* Status pill */}
        {!sinDato && (
          <div className={`tc-status-pill${excedido ? " excedido" : bajo ? " bajo" : cumplido ? " ok" : ""}`}>
            {excedido ? "⚠ Excedido" : bajo ? "↑ Por debajo" : "✓ OK"}
          </div>
        )}
      </div>
      <div className="tc-bar-right">
        <div className="tc-bar-horas" style={{ color: sinDato ? "rgba(255,255,255,.2)" : barColor }}>
          {sinDato ? "—" : `${horas}h`}
        </div>
        <div className="tc-bar-edit">✏️</div>
      </div>
    </div>
  );
}

// ── Modal para registrar horas ────────────────────────────────────────────────
function RegistroModal({
  config, fecha, horasActuales,
  onSave, onClose,
}: {
  config: ActividadConfig;
  fecha: string;
  horasActuales: number;
  onSave: (horas: number, nota: string) => void;
  onClose: () => void;
}) {
  const [horas, setHoras] = useState(horasActuales || 0);
  const [nota,  setNota]  = useState("");

  const QUICK = [0.5, 1, 1.5, 2, 3, 4, 5, 6, 7, 8];

  return (
    <div className="tc-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-modal">
        <div className="tc-modal-handle" />
        <div className="tc-modal-header">
          <span className="tc-modal-icon">{config.icon}</span>
          <div>
            <div className="tc-modal-title">{config.label}</div>
            <div className="tc-modal-fecha">{fmtFecha(fecha)}</div>
          </div>
        </div>

        {/* Horas con +/- */}
        <div className="tc-modal-horas-row">
          <button className="tc-horas-btn" onClick={() => setHoras(h => Math.max(0, Math.round((h - 0.5)*2)/2))}>−</button>
          <div className="tc-horas-display" style={{ color: config.color }}>
            <span className="tc-horas-num">{horas}</span>
            <span className="tc-horas-unit">hs</span>
          </div>
          <button className="tc-horas-btn" onClick={() => setHoras(h => Math.min(24, Math.round((h + 0.5)*2)/2))}>+</button>
        </div>

        {/* Quick select */}
        <div className="tc-quick-row">
          {QUICK.map(q => (
            <button
              key={q}
              className={`tc-quick-btn${horas === q ? " active" : ""}`}
              style={horas === q ? { background: `${config.color}25`, borderColor: config.color, color: config.color } : {}}
              onClick={() => setHoras(q)}
            >
              {q}h
            </button>
          ))}
        </div>

        {/* Referencia de límites */}
        {(config.min_horas > 0 || config.max_horas > 0) && (
          <div className="tc-modal-limits">
            {config.min_horas > 0 && (
              <span className={horas >= config.min_horas ? "tc-limit-ok" : "tc-limit-warn"}>
                mín {config.min_horas}h {horas >= config.min_horas ? "✓" : "↑"}
              </span>
            )}
            {config.max_horas > 0 && (
              <span className={horas <= config.max_horas ? "tc-limit-ok" : "tc-limit-err"}>
                máx {config.max_horas}h {horas <= config.max_horas ? "✓" : "⚠"}
              </span>
            )}
          </div>
        )}

        {/* Nota */}
        <div className="tc-modal-field">
          <label className="tc-modal-label">Nota (opcional)</label>
          <input
            className="tc-modal-input"
            placeholder="ej: Fui a correr 45 min"
            value={nota}
            onChange={e => setNota(e.target.value)}
          />
        </div>

        <div className="tc-modal-actions">
          <button className="tc-modal-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="tc-modal-save"
            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}
            onClick={() => onSave(horas, nota)}
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de configuración de límites ────────────────────────────────────────
function ConfigModal({
  config, onSave, onClose,
}: {
  config: ActividadConfig;
  onSave: (min: number, max: number) => void;
  onClose: () => void;
}) {
  const [min, setMin] = useState(config.min_horas);
  const [max, setMax] = useState(config.max_horas);

  return (
    <div className="tc-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tc-modal">
        <div className="tc-modal-handle" />
        <div className="tc-modal-header">
          <span className="tc-modal-icon">{config.icon}</span>
          <div>
            <div className="tc-modal-title">Configurar límites</div>
            <div className="tc-modal-fecha">{config.label}</div>
          </div>
        </div>

        <div className="tc-cfg-row">
          <div className="tc-cfg-field">
            <label className="tc-modal-label">Mínimo diario (horas)</label>
            <div className="tc-cfg-input-row">
              <button className="tc-horas-btn sm" onClick={() => setMin(m => Math.max(0, m - 0.5))}>−</button>
              <div className="tc-cfg-val" style={{ color: config.color }}>{min === 0 ? "Sin mín." : `${min}h`}</div>
              <button className="tc-horas-btn sm" onClick={() => setMin(m => Math.min(max || 24, m + 0.5))}>+</button>
            </div>
            <div className="tc-cfg-hint">Cuánto querés hacer como mínimo cada día</div>
          </div>
          <div className="tc-cfg-field">
            <label className="tc-modal-label">Máximo diario (horas)</label>
            <div className="tc-cfg-input-row">
              <button className="tc-horas-btn sm" onClick={() => setMax(m => Math.max(min, m - 0.5))}>−</button>
              <div className="tc-cfg-val" style={{ color: config.color }}>{max === 0 ? "Sin máx." : `${max}h`}</div>
              <button className="tc-horas-btn sm" onClick={() => setMax(m => Math.min(24, m + 0.5))}>+</button>
            </div>
            <div className="tc-cfg-hint">Para no pasarte de este límite</div>
          </div>
        </div>

        <div className="tc-modal-actions">
          <button className="tc-modal-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="tc-modal-save"
            style={{ background: `linear-gradient(135deg, ${config.color}, ${config.color}cc)` }}
            onClick={() => onSave(min, max)}
          >
            Guardar límites
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Resumen de un día en la semana pasada ─────────────────────────────────────
function DayDot({ fecha, configs, registros }: {
  fecha: string;
  configs: ActividadConfig[];
  registros: ReturnType<typeof useTimeControlStore.getState>["registros"];
}) {
  const total = registros.filter(r => r.fecha === fecha).reduce((s, r) => s + r.horas, 0);
  const esHoy = fecha === hoy();
  return (
    <div className={`tc-daydot${esHoy ? " today" : ""}`}>
      <div className="tc-daydot-label">{fmtFechaCorta(fecha).split(",")[0]}</div>
      <div className="tc-daydot-num">{fmtFechaCorta(fecha).split(",")[1]?.trim()}</div>
      <div className="tc-daydot-bar">
        {configs.map(cfg => {
          const h = registros.find(r => r.fecha === fecha && r.categoria === cfg.categoria)?.horas ?? 0;
          return h > 0 ? (
            <div
              key={cfg.categoria}
              className="tc-daydot-seg"
              style={{ flex: h, background: cfg.color }}
              title={`${cfg.label}: ${h}h`}
            />
          ) : null;
        })}
        {total === 0 && <div className="tc-daydot-empty" />}
      </div>
      <div className="tc-daydot-total">{total > 0 ? `${total}h` : "—"}</div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function TimeControlView() {
  const {
    registros, configs,
    upsertRegistro, updateConfig,
    horasDelDia, totalHorasDelDia, horasLibresDelDia,
  } = useTimeControlStore();

  const [fechaActiva,   setFechaActiva]   = useState(hoy());
  const [editandoCfg,   setEditandoCfg]   = useState<ActividadConfig | null>(null);
  const [registrando,   setRegistrando]   = useState<ActividadConfig | null>(null);
  const [showConfig,    setShowConfig]    = useState(false);

  // Últimos 7 días para la mini vista histórica
  const ultimosDias = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => diasAtras(6 - i)),
  []);

  const totalHoy    = totalHorasDelDia(fechaActiva);
  const horasLibres = horasLibresDelDia(fechaActiva);
  const esHoy       = fechaActiva === hoy();

  // Alertas del día activo
  type Alerta = { tipo: "excedido" | "bajo"; cfg: ActividadConfig; h: number };
  const alertas = useMemo<Alerta[]>(() => {
    return configs.flatMap<Alerta>(cfg => {
      const h = horasDelDia(fechaActiva, cfg.categoria);
      if (h === 0) return [];
      if (cfg.max_horas > 0 && h > cfg.max_horas)
        return [{ tipo: "excedido", cfg, h }];
      if (cfg.min_horas > 0 && h < cfg.min_horas)
        return [{ tipo: "bajo", cfg, h }];
      return [];
    });
  }, [registros, fechaActiva, configs]);

  const handleSaveRegistro = async (horas: number, nota: string) => {
    if (!registrando) return;
    await upsertRegistro(fechaActiva, registrando.categoria, horas, nota || undefined);
    setRegistrando(null);
  };

  const handleSaveConfig = (min: number, max: number) => {
    if (!editandoCfg) return;
    updateConfig(editandoCfg.categoria, { min_horas: min, max_horas: max });
    setEditandoCfg(null);
  };

  return (
    <div className="tc-view">

      {/* ── Header ── */}
      <div className="tc-top">
        <div>
          <div className="tc-title">Control de horas</div>
          <div className="tc-sub">Gestioná tu tiempo diario</div>
        </div>
        <button className="tc-cfg-btn" onClick={() => setShowConfig(s => !s)}>
          {showConfig ? "✕ Cerrar" : "⚙ Límites"}
        </button>
      </div>

      {/* ── Mini historial — últimos 7 días ── */}
      <div className="tc-week">
        {ultimosDias.map(d => (
          <div key={d} onClick={() => setFechaActiva(d)} style={{ cursor:"pointer" }}>
            <DayDot fecha={d} configs={configs} registros={registros} />
          </div>
        ))}
      </div>

      {/* ── Resumen del día activo ── */}
      <div className="tc-day-header">
        <div className="tc-day-title">
          {esHoy ? "Hoy" : fmtFecha(fechaActiva)}
        </div>
        <div className="tc-day-totales">
          <div className="tc-day-stat">
            <span className="tc-day-stat-val">{totalHoy}h</span>
            <span className="tc-day-stat-lbl">registradas</span>
          </div>
          <div className="tc-day-stat">
            <span className="tc-day-stat-val" style={{ color: horasLibres < 3 ? "#FF6B6B" : "#55EFC4" }}>
              {horasLibres}h
            </span>
            <span className="tc-day-stat-lbl">libres</span>
          </div>
          <div className="tc-day-stat">
            <span className="tc-day-stat-val" style={{ color: alertas.length === 0 && totalHoy > 0 ? "#55EFC4" : "#FECA57" }}>
              {alertas.length === 0 && totalHoy > 0 ? "✓" : alertas.length > 0 ? alertas.length : "—"}
            </span>
            <span className="tc-day-stat-lbl">{alertas.length === 0 && totalHoy > 0 ? "Todo OK" : "alertas"}</span>
          </div>
        </div>
      </div>

      {/* ── Alertas ── */}
      {alertas.length > 0 && (
        <div className="tc-alertas">
          {alertas.map(a => (
            <div key={a.cfg.categoria} className={`tc-alerta${a.tipo === "excedido" ? " excedido" : " bajo"}`}>
              <span>{a.cfg.icon}</span>
              {a.tipo === "excedido"
                ? `${a.cfg.label}: ${a.h}h registradas — máximo es ${a.cfg.max_horas}h`
                : `${a.cfg.label}: ${a.h}h registradas — mínimo recomendado es ${a.cfg.min_horas}h`}
            </div>
          ))}
        </div>
      )}

      {/* ── Configuración de límites (expandible) ── */}
      {showConfig && (
        <div className="tc-config-panel">
          <div className="tc-config-title">Configurar límites diarios</div>
          <div className="tc-config-grid">
            {configs.map(cfg => (
              <div key={cfg.categoria} className="tc-config-card" onClick={() => setEditandoCfg(cfg)}>
                <div className="tc-config-card-top">
                  <span>{cfg.icon}</span>
                  <span className="tc-config-card-label" style={{ color: cfg.color }}>{cfg.label}</span>
                </div>
                <div className="tc-config-card-limits">
                  <span>mín: {cfg.min_horas > 0 ? `${cfg.min_horas}h` : "—"}</span>
                  <span>máx: {cfg.max_horas > 0 ? `${cfg.max_horas}h` : "—"}</span>
                </div>
                <div className="tc-config-card-edit">Editar →</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Barras por categoría ── */}
      <div className="tc-bars">
        {configs.map(cfg => (
          <CategoriaBar
            key={cfg.categoria}
            config={cfg}
            horas={horasDelDia(fechaActiva, cfg.categoria)}
            onEdit={(c) => setRegistrando(c)}
          />
        ))}
      </div>

      {/* ── Barra de tiempo libre ── */}
      <div className="tc-libre-row">
        <span className="tc-libre-label">⏳ Tiempo no registrado</span>
        <div className="tc-libre-bar-wrap">
          <div className="tc-libre-bar" style={{ width: `${Math.min(100, (horasLibres / 24) * 100)}%` }} />
        </div>
        <span className="tc-libre-val">{horasLibres}h</span>
      </div>

      {/* Modales */}
      {registrando && (
        <RegistroModal
          config={registrando}
          fecha={fechaActiva}
          horasActuales={horasDelDia(fechaActiva, registrando.categoria)}
          onSave={handleSaveRegistro}
          onClose={() => setRegistrando(null)}
        />
      )}

      {editandoCfg && (
        <ConfigModal
          config={editandoCfg}
          onSave={handleSaveConfig}
          onClose={() => setEditandoCfg(null)}
        />
      )}
    </div>
  );
}
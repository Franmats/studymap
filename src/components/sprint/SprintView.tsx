import { useState, useMemo } from "react";
import { useSprintStore } from "../../store/useSprintStore";
import { SprintForm } from "./SprintForm";
import { DailyModal } from "./DailyModal";
import { RetroModal } from "./RetroModal";
import type { SprintRow } from "../../types";

function daysLeft(fechaFin: string): number {
  const fin = new Date(fechaFin + "T00:00:00");
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  return Math.max(0, Math.round((fin.getTime() - hoy.getTime()) / 86400000));
}

function formatDate(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString("es-AR", { day:"numeric", month:"short" });
}

function today(): string { return new Date().toISOString().split("T")[0]; }

// ── Tarjeta de sprint activo ───────────────────────────────────────────────
function ActiveSprintCard({ sprint, onDaily, onRetro, onCancel, onToggleTema }:
  { sprint: SprintRow; onDaily: () => void; onRetro: () => void; onCancel: () => void; onToggleTema: (key: string, done: boolean) => void; }
) {
  const done  = sprint.temas.filter(t => t.done).length;
  const total = sprint.temas.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;
  const dias  = daysLeft(sprint.fecha_fin);
  const todayDone = sprint.dailies.some(d => d.date === today());

  // Agrupar temas por materia
  const byMateria = useMemo(() => {
    const map = new Map<string, typeof sprint.temas>();
    for (const t of sprint.temas) {
      if (!map.has(t.materia_id)) map.set(t.materia_id, []);
      map.get(t.materia_id)!.push(t);
    }
    return map;
  }, [sprint.temas]);

  return (
    <div className="sv-active-card">
      {/* Header */}
      <div className="sv-active-header">
        <div>
          <div className="sv-active-label">Sprint activo</div>
          <div className="sv-active-name">{sprint.nombre}</div>
          {sprint.objetivo && <div className="sv-active-obj">🎯 {sprint.objetivo}</div>}
        </div>
        <div className="sv-active-dias">
          <div className="sv-active-dias-num" style={{ color: dias <= 2 ? "#FF6B6B" : dias <= 5 ? "#FECA57" : "#55EFC4" }}>{dias}</div>
          <div className="sv-active-dias-lbl">días</div>
        </div>
      </div>

      {/* Fechas */}
      <div className="sv-dates">{formatDate(sprint.fecha_inicio)} → {formatDate(sprint.fecha_fin)}</div>

      {/* Progreso */}
      <div className="sv-progress-row">
        <span className="sv-progress-label">{done}/{total} temas</span>
        <span className="sv-progress-pct">{pct}%</span>
      </div>
      <div className="sv-track"><div className="sv-fill" style={{ width: `${pct}%` }} /></div>

      {/* Acciones rápidas */}
      <div className="sv-quick-actions">
        <button className={`sv-btn-daily${todayDone ? " done" : ""}`} onClick={onDaily}>
          {todayDone ? "✓ Daily hecho" : "☀️ Daily de hoy"}
        </button>
        <button className="sv-btn-retro" onClick={onRetro}>🏁 Cerrar sprint</button>
        <button className="sv-btn-cancel-sprint" onClick={onCancel}>✕</button>
      </div>

      {/* Lista de temas */}
      <div className="sv-temas-section">
        <div className="sv-temas-title">Backlog del sprint</div>
        {Array.from(byMateria.entries()).map(([mid, temas]) => (
          <div key={mid} className="sv-materia-block">
            <div className="sv-materia-tag">{temas[0].materia_nombre}</div>
            {temas.map(t => {
              const key = `${t.materia_id}__${t.unidad_num}__${t.tema_idx}`;
              return (
                <div key={key} className={`sv-tema-item${t.done ? " done" : ""}`} onClick={() => onToggleTema(key, !t.done)}>
                  <div className={`sv-tema-check${t.done ? " checked" : ""}`}>{t.done ? "✓" : ""}</div>
                  <div className="sv-tema-body">
                    <div className="sv-tema-nombre">{t.tema_nombre}</div>
                    <div className="sv-tema-unidad">U{t.unidad_num} · {t.unidad_titulo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Historial de sprints ───────────────────────────────────────────────────
function SprintHistoryCard({ sprint }: { sprint: SprintRow }) {
  const [open, setOpen] = useState(false);
  const done  = sprint.temas.filter(t => t.done).length;
  const total = sprint.temas.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <div className={`sv-history-card${sprint.status === "cancelled" ? " cancelled" : ""}`}>
      <div className="sv-history-top" onClick={() => setOpen(o => !o)}>
        <div>
          <div className="sv-history-name">{sprint.nombre}</div>
          <div className="sv-history-dates">{formatDate(sprint.fecha_inicio)} → {formatDate(sprint.fecha_fin)}</div>
        </div>
        <div className="sv-history-right">
          <div className="sv-history-pct" style={{ color: sprint.status === "cancelled" ? "rgba(255,255,255,.3)" : pct >= 80 ? "#55EFC4" : pct >= 50 ? "#FECA57" : "#FF6B6B" }}>
            {sprint.status === "cancelled" ? "—" : `${pct}%`}
          </div>
          <div className={`sv-history-badge ${sprint.status}`}>
            {sprint.status === "completed" ? "✓" : "✕"}
          </div>
          <div className="sv-history-arrow">{open ? "▲" : "▼"}</div>
        </div>
      </div>

      {open && sprint.retro && (
        <div className="sv-retro-display">
          <div className="sv-retro-stars">{"★".repeat(sprint.retro.rating)}{"☆".repeat(5 - sprint.retro.rating)}</div>
          {sprint.retro.bien     && <div className="sv-retro-row"><span>✅</span> {sprint.retro.bien}</div>}
          {sprint.retro.mejorar  && <div className="sv-retro-row"><span>🔧</span> {sprint.retro.mejorar}</div>}
          {sprint.retro.next_sprint && <div className="sv-retro-row"><span>🎯</span> {sprint.retro.next_sprint}</div>}
        </div>
      )}
    </div>
  );
}

// ── Vista principal ────────────────────────────────────────────────────────
export function SprintView() {
  const sprints      = useSprintStore(s => s.sprints);
  const activeSprint = useSprintStore(s => s.activeSprint);
  const velocity     = useSprintStore(s => s.velocity);
  const updateTema   = useSprintStore(s => s.updateTema);
  const cancelSprint = useSprintStore(s => s.cancelSprint);

  const [showForm,  setShowForm]  = useState(false);
  const [showDaily, setShowDaily] = useState(false);
  const [showRetro, setShowRetro] = useState(false);

  const active    = activeSprint();
  const history   = sprints.filter(s => s.status !== "active");
  const vel       = velocity();
  const completed = sprints.filter(s => s.status === "completed");

  return (
    <div className="sv">
      {/* Header */}
      <div className="sv-top">
        <div>
          <div className="sv-title">Sprints</div>
          <div className="sv-sub">Metodología Scrum para estudiar con foco</div>
        </div>
        {!active && (
          <button className="sv-new-btn" onClick={() => setShowForm(true)}>
            🚀 Nuevo sprint
          </button>
        )}
      </div>

      {/* Métricas de velocidad */}
      {completed.length > 0 && (
        <div className="sv-metrics">
          <div className="sv-metric">
            <div className="sv-metric-val">{completed.length}</div>
            <div className="sv-metric-lbl">Sprints completados</div>
          </div>
          <div className="sv-metric">
            <div className="sv-metric-val" style={{ color:"#a29bfe" }}>{vel}</div>
            <div className="sv-metric-lbl">Velocidad (temas/sprint)</div>
          </div>
          <div className="sv-metric">
            <div className="sv-metric-val" style={{ color:"#55EFC4" }}>
              {completed.length ? Math.round(completed.reduce((a,s) => a + s.temas.filter(t=>t.done).length/s.temas.length*100, 0) / completed.length) : 0}%
            </div>
            <div className="sv-metric-lbl">% completado promedio</div>
          </div>
        </div>
      )}

      {/* Sprint activo */}
      {active ? (
        <ActiveSprintCard
          sprint={active}
          onDaily={() => setShowDaily(true)}
          onRetro={() => setShowRetro(true)}
          onCancel={() => { if (confirm("¿Cancelar el sprint?")) cancelSprint(active.id); }}
          onToggleTema={(key, done) => updateTema(active.id, key, done)}
        />
      ) : (
        <div className="sv-empty">
          <div className="sv-empty-icon">🏃</div>
          <div className="sv-empty-title">Sin sprint activo</div>
          <div className="sv-empty-desc">Creá un sprint para organizar lo que vas a estudiar esta semana o quincena.</div>
          <button className="sv-new-btn" onClick={() => setShowForm(true)}>🚀 Crear primer sprint</button>
        </div>
      )}

      {/* Historial */}
      {history.length > 0 && (
        <div className="sv-history-section">
          <div className="sv-history-title">Historial</div>
          {history.map(s => <SprintHistoryCard key={s.id} sprint={s} />)}
        </div>
      )}

      {/* Modales */}
      {showForm  && <SprintForm   onClose={() => setShowForm(false)} />}
      {showDaily && active && <DailyModal sprint={active} onClose={() => setShowDaily(false)} />}
      {showRetro && active && <RetroModal sprint={active} onClose={() => setShowRetro(false)} />}
    </div>
  );
}
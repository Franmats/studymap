import { useState, useMemo } from "react";
import { useScheduleStore } from "../../store/useScheduleStore";
import { ClaseForm } from "./ClaseForm.tsx";
import type { ClaseRow, DiaSemana } from "../../types";

const DIAS: DiaSemana[] = ["lunes","martes","miércoles","jueves","viernes","sábado"];
const DIAS_SHORT: Record<DiaSemana, string> = {
  lunes:"Lun", martes:"Mar", "miércoles":"Mié", jueves:"Jue", viernes:"Vie", sábado:"Sáb"
};
/* const TIPO_COLOR: Record<string, string> = {
  "teórica": "#6C5CE7", "práctica": "#55EFC4", "laboratorio": "#FF9F43", "otra": "#48CAE4"
}; */
const TIPO_ICON: Record<string, string> = {
  "teórica": "📖", "práctica": "✏️", "laboratorio": "🔬", "otra": "📌"
};

// Horas de la grilla: 7 a 22
const GRID_START = 7;
const GRID_END   = 22;
const GRID_HOURS = Array.from({ length: GRID_END - GRID_START }, (_, i) => GRID_START + i);

function timeToMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// Calcula top% y height% dentro de la grilla
function clasePosition(inicio: string, fin: string) {
  const startMin = GRID_START * 60;
  const totalMin = (GRID_END - GRID_START) * 60;
  const top    = ((timeToMin(inicio) - startMin) / totalMin) * 100;
  const height = ((timeToMin(fin) - timeToMin(inicio)) / totalMin) * 100;
  return { top: Math.max(0, top), height: Math.max(2, height) };
}

// Día actual de la semana
function diaHoy(): DiaSemana | null {
  const map: Record<number, DiaSemana> = {
    1:"lunes", 2:"martes", 3:"miércoles", 4:"jueves", 5:"viernes", 6:"sábado"
  };
  return map[new Date().getDay()] ?? null;
}

// ── Chip de clase (usado en grilla y lista) ───────────────────────────────────
function ClaseChip({ clase, onClick, compact = false }: { clase: ClaseRow; onClick: () => void; compact?: boolean }) {
  return (
    <div
      className={`sch-chip${compact ? " compact" : ""}`}
      style={{ borderLeftColor: clase.materia_color, background: `${clase.materia_color}18` }}
      onClick={onClick}
    >
      <div className="sch-chip-nombre" style={{ color: clase.materia_color }}>{clase.materia_nombre}</div>
      {!compact && <div className="sch-chip-hora">{clase.hora_inicio}–{clase.hora_fin}</div>}
      <div className="sch-chip-meta">
        <span>{TIPO_ICON[clase.tipo]} {clase.tipo}</span>
        {clase.aula && <span>· {clase.aula}</span>}
      </div>
      {!compact && clase.profesor && <div className="sch-chip-prof">👤 {clase.profesor}</div>}
    </div>
  );
}

// ── Grilla semanal ────────────────────────────────────────────────────────────
function WeekGrid({ clases, hoy, onClaseClick }: {
  clases: ClaseRow[];
  hoy: DiaSemana | null;
  onClaseClick: (c: ClaseRow) => void;
}) {
  return (
    <div className="sch-grid-wrap">
      {/* Header días */}
      <div className="sch-grid-header">
        <div className="sch-grid-gutter" />
        {DIAS.map(d => (
          <div key={d} className={`sch-grid-day-header${d === hoy ? " today" : ""}`}>
            {DIAS_SHORT[d]}
            {d === hoy && <div className="sch-today-dot" />}
          </div>
        ))}
      </div>

      {/* Cuerpo */}
      <div className="sch-grid-body">
        {/* Columna de horas */}
        <div className="sch-grid-hours">
          {GRID_HOURS.map(h => (
            <div key={h} className="sch-grid-hour-label">{String(h).padStart(2,"0")}:00</div>
          ))}
        </div>

        {/* Columnas por día */}
        {DIAS.map(d => {
          const dClases = clases.filter(c => c.dia === d);
          return (
            <div key={d} className={`sch-grid-col${d === hoy ? " today" : ""}`}>
              {/* Líneas de hora */}
              {GRID_HOURS.map(h => <div key={h} className="sch-grid-hline" />)}

              {/* Clases posicionadas */}
              {dClases.map(c => {
                const { top, height } = clasePosition(c.hora_inicio, c.hora_fin);
                return (
                  <div
                    key={c.id}
                    className="sch-grid-clase"
                    style={{
                      top: `${top}%`, height: `${height}%`,
                      borderLeftColor: c.materia_color,
                      background: `${c.materia_color}20`,
                    }}
                    onClick={() => onClaseClick(c)}
                  >
                    <div className="sch-grid-clase-nombre" style={{ color: c.materia_color }}>
                      {c.materia_nombre}
                    </div>
                    <div className="sch-grid-clase-hora">{c.hora_inicio}</div>
                    <div className="sch-grid-clase-tipo">{TIPO_ICON[c.tipo]}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Lista por día ─────────────────────────────────────────────────────────────
function DayList({ clases, hoy, onClaseClick }: {
  clases: ClaseRow[];
  hoy: DiaSemana | null;
  onClaseClick: (c: ClaseRow) => void;
}) {
  const clasesByDia = useMemo(() => {
    const map = new Map<DiaSemana, ClaseRow[]>();
    DIAS.forEach(d => map.set(d, []));
    clases.forEach(c => map.get(c.dia)?.push(c));
    return map;
  }, [clases]);

  return (
    <div className="sch-list">
      {DIAS.map(d => {
        const dClases = clasesByDia.get(d) ?? [];
        return (
          <div key={d} className={`sch-list-day${d === hoy ? " today" : ""}`}>
            <div className="sch-list-day-header">
              <span className="sch-list-day-name">{DIAS_SHORT[d]}</span>
              {d === hoy && <span className="sch-list-today-badge">Hoy</span>}
              {dClases.length > 0 && (
                <span className="sch-list-count">{dClases.length} clase{dClases.length > 1 ? "s" : ""}</span>
              )}
            </div>
            {dClases.length > 0 ? (
              <div className="sch-list-clases">
                {dClases
                  .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio))
                  .map(c => <ClaseChip key={c.id} clase={c} onClick={() => onClaseClick(c)} />)
                }
              </div>
            ) : (
              <div className="sch-list-empty-day">Sin clases</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Detail drawer ─────────────────────────────────────────────────────────────
function ClaseDetail({ clase, onEdit, onDelete, onClose }: {
  clase: ClaseRow;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="sch-detail-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sch-detail">
        <div className="sch-detail-handle" />
        <div className="sch-detail-color-bar" style={{ background: clase.materia_color }} />
        <div className="sch-detail-body">
          <div className="sch-detail-nombre" style={{ color: clase.materia_color }}>{clase.materia_nombre}</div>
          <div className="sch-detail-rows">
            <div className="sch-detail-row"><span>📅</span> {clase.dia.charAt(0).toUpperCase() + clase.dia.slice(1)}</div>
            <div className="sch-detail-row"><span>🕐</span> {clase.hora_inicio} – {clase.hora_fin}</div>
            <div className="sch-detail-row"><span>{TIPO_ICON[clase.tipo]}</span> {clase.tipo.charAt(0).toUpperCase() + clase.tipo.slice(1)}</div>
            {clase.aula     && <div className="sch-detail-row"><span>🚪</span> {clase.aula}</div>}
            {clase.profesor && <div className="sch-detail-row"><span>👤</span> {clase.profesor}</div>}
          </div>
          <div className="sch-detail-actions">
            <button className="sch-detail-edit"   onClick={onEdit}>✏️ Editar</button>
            <button className="sch-detail-delete" onClick={onDelete}>🗑️ Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function ScheduleView() {
  const clases       = useScheduleStore(s => s.clases);
  const deleteClase  = useScheduleStore(s => s.deleteClase);

  const [vistaMode, setVistaMode] = useState<"grilla"|"lista">("grilla");
  const [showForm,  setShowForm]  = useState(false);
  const [editando,  setEditando]  = useState<ClaseRow | null>(null);
  const [detalle,   setDetalle]   = useState<ClaseRow | null>(null);

  const hoy = diaHoy();

  // Stats rápidas
  const totalHoras = useMemo(() => {
    const mins = clases.reduce((acc, c) => acc + timeToMin(c.hora_fin) - timeToMin(c.hora_inicio), 0);
    return Math.round(mins / 60);
  }, [clases]);

  const horasHoy = useMemo(() => {
    if (!hoy) return 0;
    const dClases = clases.filter(c => c.dia === hoy);
    const mins = dClases.reduce((acc, c) => acc + timeToMin(c.hora_fin) - timeToMin(c.hora_inicio), 0);
    return Math.round(mins / 60);
  }, [clases, hoy]);

  const handleDelete = async (c: ClaseRow) => {
    if (!confirm(`¿Eliminar ${c.materia_nombre} del ${c.dia}?`)) return;
    await deleteClase(c.id);
    setDetalle(null);
  };

  return (
    <div className="sch-view">
      {/* Header */}
      <div className="sch-top">
        <div>
          <div className="sch-title">Horarios</div>
          <div className="sch-sub">Cursada semanal</div>
        </div>
        <div className="sch-top-right">
          {/* Toggle vista */}
          <div className="sch-toggle">
            <button className={`sch-toggle-btn${vistaMode === "grilla" ? " active" : ""}`}
              onClick={() => setVistaMode("grilla")}>⊞ Grilla</button>
            <button className={`sch-toggle-btn${vistaMode === "lista" ? " active" : ""}`}
              onClick={() => setVistaMode("lista")}>≡ Lista</button>
          </div>
          <button className="sch-add-btn" onClick={() => { setEditando(null); setShowForm(true); }}>
            + Agregar
          </button>
        </div>
      </div>

      {/* Stats */}
      {clases.length > 0 && (
        <div className="sch-stats">
          <div className="sch-stat">
            <div className="sch-stat-val">{clases.length}</div>
            <div className="sch-stat-lbl">Clases / semana</div>
          </div>
          <div className="sch-stat">
            <div className="sch-stat-val" style={{ color:"#a29bfe" }}>{totalHoras}h</div>
            <div className="sch-stat-lbl">Horas totales</div>
          </div>
          {hoy && (
            <div className="sch-stat">
              <div className="sch-stat-val" style={{ color:"#55EFC4" }}>
                {clases.filter(c => c.dia === hoy).length}
              </div>
              <div className="sch-stat-lbl">Clases hoy</div>
            </div>
          )}
          {hoy && horasHoy > 0 && (
            <div className="sch-stat">
              <div className="sch-stat-val" style={{ color:"#FECA57" }}>{horasHoy}h</div>
              <div className="sch-stat-lbl">Horas hoy</div>
            </div>
          )}
        </div>
      )}

      {/* Contenido principal */}
      {clases.length === 0 ? (
        <div className="sch-empty">
          <div className="sch-empty-icon">🗓️</div>
          <div className="sch-empty-title">Sin clases cargadas</div>
          <div className="sch-empty-desc">Agregá tu horario de cursada para visualizarlo en la grilla semanal.</div>
          <button className="sch-add-btn" onClick={() => setShowForm(true)}>+ Agregar primera clase</button>
        </div>
      ) : vistaMode === "grilla" ? (
        <WeekGrid clases={clases} hoy={hoy} onClaseClick={setDetalle} />
      ) : (
        <DayList clases={clases} hoy={hoy} onClaseClick={setDetalle} />
      )}

      {/* Modales */}
      {showForm && (
        <ClaseForm
          editando={editando ?? undefined}
          onClose={() => { setShowForm(false); setEditando(null); }}
        />
      )}

      {detalle && (
        <ClaseDetail
          clase={detalle}
          onEdit={() => { setEditando(detalle); setDetalle(null); setShowForm(true); }}
          onDelete={() => handleDelete(detalle)}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  );
}
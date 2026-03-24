import { useState, useMemo } from "react";
import { useTPStore } from "../../store/useTPStore";
import { useSprintStore } from "../../store/useSprintStore";
import { useMateriaStore } from "../../store/useMateriaStore";
import type { TPRow, TPEstado, SprintRow } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().split("T")[0]; }

function fmtFecha(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function diasLabel(dias: number, estado: TPEstado): { text: string; color: string } {
  if (estado === "entregado") return { text: "✓ Entregado", color: "#55EFC4" };
  if (dias < 0) return { text: `Venció hace ${Math.abs(dias)}d`, color: "#FF6B6B" };
  if (dias === 0) return { text: "Vence hoy", color: "#FF6B6B" };
  if (dias === 1) return { text: "Mañana", color: "#FECA57" };
  if (dias <= 3) return { text: `En ${dias} días`, color: "#FF9F43" };
  if (dias <= 7) return { text: `En ${dias} días`, color: "#FECA57" };
  return { text: `En ${dias} días`, color: "rgba(255,255,255,.4)" };
}

const ESTADO_CONFIG: Record<TPEstado, { label: string; color: string; icon: string }> = {
  pendiente:   { label: "Pendiente",   color: "rgba(255,255,255,.35)", icon: "○" },
  en_progreso: { label: "En progreso", color: "#FECA57",               icon: "◑" },
  entregado:   { label: "Entregado",   color: "#55EFC4",               icon: "●" },
};

// ── Barra de progreso de fecha ─────────────────────────────────────────────────
function FechaBar({ inicio, entrega, estado }: { inicio: string; entrega: string; estado: TPEstado }) {
  const total = new Date(entrega + "T00:00:00").getTime() - new Date(inicio + "T00:00:00").getTime();
  const elapsed = new Date(hoy() + "T00:00:00").getTime() - new Date(inicio + "T00:00:00").getTime();
  const pct = Math.max(0, Math.min(100, (elapsed / total) * 100));
  const color = estado === "entregado" ? "#55EFC4" : pct > 85 ? "#FF6B6B" : pct > 60 ? "#FECA57" : "#6C5CE7";
  return (
    <div className="tp-fecha-bar">
      <div className="tp-fecha-track">
        <div className="tp-fecha-fill" style={{ width: `${estado === "entregado" ? 100 : pct}%`, background: color }} />
      </div>
      <div className="tp-fecha-labels">
        <span>{fmtFecha(inicio)}</span>
        <span style={{ color }}>{fmtFecha(entrega)}</span>
      </div>
    </div>
  );
}

// ── Card de TP ────────────────────────────────────────────────────────────────
function TPCard({ tp, onEdit, onAddToSprint }: {
  tp: TPRow;
  onEdit: (tp: TPRow) => void;
  onAddToSprint: (tp: TPRow) => void;
}) {
  const { setEstado, deleteTP, diasHasta } = useTPStore();
  const dias    = diasHasta(tp.fecha_entrega);
  const dLabel  = diasLabel(dias, tp.estado);

  const ESTADOS: TPEstado[] = ["pendiente", "en_progreso", "entregado"];

  return (
    <div className={`tp-card${tp.estado === "entregado" ? " entregado" : ""}`}
         style={{ "--tp-color": tp.materia_color } as React.CSSProperties}>

      {/* Header */}
      <div className="tp-card-top">
        <div className="tp-card-materia" style={{ color: tp.materia_color }}>
          <span className="tp-card-materia-dot" style={{ background: tp.materia_color }} />
          {tp.materia_nombre}
        </div>
        <div className="tp-card-actions">
          <button className="tp-icon-btn" onClick={() => onAddToSprint(tp)} title="Agregar a sprint">🚀</button>
          <button className="tp-icon-btn" onClick={() => onEdit(tp)} title="Editar">✏️</button>
          <button className="tp-icon-btn danger" onClick={() => deleteTP(tp.id)} title="Eliminar">🗑</button>
        </div>
      </div>

      {/* Título */}
      <div className="tp-card-titulo">{tp.titulo}</div>
      {tp.descripcion && <div className="tp-card-desc">{tp.descripcion}</div>}

      {/* Barra de progreso temporal */}
      <FechaBar inicio={tp.fecha_inicio} entrega={tp.fecha_entrega} estado={tp.estado} />

      {/* Footer */}
      <div className="tp-card-footer">
        {/* Estado selector */}
        <div className="tp-estado-row">
          {ESTADOS.map(e => (
            <button
              key={e}
              className={`tp-estado-btn${tp.estado === e ? " active" : ""}`}
              style={tp.estado === e ? {
                background: `${ESTADO_CONFIG[e].color}18`,
                borderColor: `${ESTADO_CONFIG[e].color}55`,
                color: ESTADO_CONFIG[e].color,
              } : {}}
              onClick={() => setEstado(tp.id, e)}
            >
              {ESTADO_CONFIG[e].icon} {ESTADO_CONFIG[e].label}
            </button>
          ))}
        </div>

        {/* Días restantes */}
        <div className="tp-dias-badge" style={{ color: dLabel.color }}>
          {dLabel.text}
        </div>
      </div>
    </div>
  );
}

// ── Modal de creación / edición ───────────────────────────────────────────────
function TPForm({ tp, onClose }: { tp?: TPRow; onClose: () => void }) {
  const { createTP, updateTP } = useTPStore();
  const { materias } = useMateriaStore();

  const [materiaId,   setMateriaId]   = useState(tp?.materia_id   ?? "");
  const [titulo,      setTitulo]      = useState(tp?.titulo        ?? "");
  const [descripcion, setDescripcion] = useState(tp?.descripcion   ?? "");
  const [fechaInicio, setFechaInicio] = useState(tp?.fecha_inicio  ?? hoy());
  const [fechaEntrega,setFechaEntrega]= useState(tp?.fecha_entrega ?? "");
  const [saving,      setSaving]      = useState(false);

  const materiaSeleccionada = materias.find(m => m.id === materiaId);

  const handleSave = async () => {
    if (!materiaId || !titulo.trim() || !fechaEntrega) return;
    setSaving(true);
    const data = {
      materia_id:     materiaId,
      materia_nombre: materiaSeleccionada?.nombre ?? "",
      materia_color:  materiaSeleccionada?.color  ?? "#6C5CE7",
      titulo:         titulo.trim(),
      descripcion:    descripcion.trim() || null,
      fecha_inicio:   fechaInicio,
      fecha_entrega:  fechaEntrega,
      estado:         (tp?.estado ?? "pendiente") as TPEstado,
    };
    if (tp) await updateTP(tp.id, data);
    else     await createTP(data);
    setSaving(false);
    onClose();
  };

  return (
    <div className="tp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal">
        <div className="tp-modal-handle" />
        <div className="tp-modal-header">
          <div className="tp-modal-title">{tp ? "Editar TP" : "Nuevo TP"}</div>
          <button className="tp-icon-btn" onClick={onClose}>✕</button>
        </div>

        {/* Materia */}
        <div className="tp-field">
          <label className="tp-label">Materia</label>
          <div className="tp-select-wrap">
            {materias.length === 0 ? (
              <div className="tp-empty-materias">No tenés materias cargadas aún</div>
            ) : (
              <div className="tp-materia-grid">
                {materias.map(m => (
                  <button
                    key={m.id}
                    className={`tp-materia-chip${materiaId === m.id ? " active" : ""}`}
                    style={materiaId === m.id ? { borderColor: m.color ?? undefined, background: `${m.color ?? "#6C5CE7"}18`, color: m.color ?? undefined } : {}}
                    onClick={() => setMateriaId(m.id)}
                  >
                    <span className="tp-materia-chip-dot" style={{ background: m.color ?? undefined }} />
                    {m.nombre.length > 22 ? m.nombre.slice(0, 22) + "…" : m.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Título */}
        <div className="tp-field">
          <label className="tp-label">Título</label>
          <input
            className="tp-input"
            placeholder="ej: TP Nro 2 — Árboles binarios"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
          />
        </div>

        {/* Descripción */}
        <div className="tp-field">
          <label className="tp-label">Descripción <span style={{opacity:.4}}>(opcional)</span></label>
          <textarea
            className="tp-input tp-textarea"
            placeholder="Consigna, objetivos, notas..."
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
          />
        </div>

        {/* Fechas */}
        <div className="tp-fecha-row">
          <div className="tp-field">
            <label className="tp-label">Fecha de inicio</label>
            <input
              className="tp-input"
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
            />
          </div>
          <div className="tp-field">
            <label className="tp-label">Fecha de entrega</label>
            <input
              className="tp-input"
              type="date"
              value={fechaEntrega}
              min={fechaInicio}
              onChange={e => setFechaEntrega(e.target.value)}
            />
          </div>
        </div>

        {/* Preview duración */}
        {fechaInicio && fechaEntrega && (
          <div className="tp-duracion-preview">
            ⏱ {Math.ceil((new Date(fechaEntrega + "T00:00:00").getTime() - new Date(fechaInicio + "T00:00:00").getTime()) / (1000*60*60*24))} días para completarlo
          </div>
        )}

        <div className="tp-modal-actions">
          <button className="tp-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="tp-btn-save"
            disabled={!materiaId || !titulo.trim() || !fechaEntrega || saving}
            onClick={handleSave}
          >
            {saving ? "Guardando…" : tp ? "Guardar cambios" : "Crear TP"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal de integración con Sprint ──────────────────────────────────────────
function SprintIntegrationModal({ tp, onClose }: { tp: TPRow; onClose: () => void }) {
  const { sprints, addTPToSprint } = useSprintStore() as any;
  const [selectedSprint, setSelectedSprint] = useState<string>("");
  const [adding, setAdding] = useState(false);

  // Solo sprints activos
  const activeSprints: SprintRow[] = (sprints ?? []).filter((s: SprintRow) => s.status === "active");

  const handleAdd = async () => {
    if (!selectedSprint) return;
    setAdding(true);
    await addTPToSprint?.(selectedSprint, tp);
    setAdding(false);
    onClose();
  };

  return (
    <div className="tp-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="tp-modal" style={{ maxWidth: 420 }}>
        <div className="tp-modal-handle" />
        <div className="tp-modal-header">
          <div className="tp-modal-title">Agregar a Sprint 🚀</div>
          <button className="tp-icon-btn" onClick={onClose}>✕</button>
        </div>

        <div className="tp-sprint-tp-preview">
          <span className="tp-sprint-tp-dot" style={{ background: tp.materia_color }} />
          <div>
            <div className="tp-sprint-tp-titulo">{tp.titulo}</div>
            <div className="tp-sprint-tp-materia" style={{ color: tp.materia_color }}>{tp.materia_nombre}</div>
          </div>
        </div>

        {activeSprints.length === 0 ? (
          <div className="tp-sprint-empty">
            No tenés sprints activos. Creá uno primero en la sección Sprints.
          </div>
        ) : (
          <>
            <div className="tp-label" style={{ marginBottom: 10 }}>Elegí un sprint activo</div>
            <div className="tp-sprint-list">
              {activeSprints.map((s: SprintRow) => (
                <button
                  key={s.id}
                  className={`tp-sprint-option${selectedSprint === s.id ? " active" : ""}`}
                  onClick={() => setSelectedSprint(s.id)}
                >
                  <div className="tp-sprint-option-name">{s.nombre}</div>
                  <div className="tp-sprint-option-dates">
                    {fmtFecha(s.fecha_inicio)} → {fmtFecha(s.fecha_fin)}
                  </div>
                  <div className="tp-sprint-option-temas">
                    {s.temas.length} temas · {s.temas.filter(t => t.done).length} completados
                  </div>
                </button>
              ))}
            </div>

            <div className="tp-modal-actions">
              <button className="tp-btn-cancel" onClick={onClose}>Cancelar</button>
              <button
                className="tp-btn-save"
                disabled={!selectedSprint || adding}
                onClick={handleAdd}
              >
                {adding ? "Agregando…" : "Agregar al sprint"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function TPView() {
  const { tps, tpsVencidos, tpsProximos } = useTPStore();
  const { materias } = useMateriaStore();

  const [showForm,       setShowForm]       = useState(false);
  const [editingTP,      setEditingTP]      = useState<TPRow | undefined>();
  const [sprintTP,       setSprintTP]       = useState<TPRow | undefined>();
  const [filtroMateria,  setFiltroMateria]  = useState<string>("todas");
  const [filtroEstado,   setFiltroEstado]   = useState<string>("todos");

  const vencidos  = tpsVencidos();
  const proximos  = tpsProximos(5);

  const tpsFiltrados = useMemo(() => {
    return tps.filter(tp => {
      if (filtroMateria !== "todas" && tp.materia_id !== filtroMateria) return false;
      if (filtroEstado  !== "todos" && tp.estado     !== filtroEstado)  return false;
      return true;
    });
  }, [tps, filtroMateria, filtroEstado]);

  // Agrupar por materia para la vista
  const tpsPorMateria = useMemo(() => {
    const groups: Record<string, { nombre: string; color: string; tps: TPRow[] }> = {};
    tpsFiltrados.forEach(tp => {
      if (!groups[tp.materia_id]) {
        groups[tp.materia_id] = { nombre: tp.materia_nombre, color: tp.materia_color, tps: [] };
      }
      groups[tp.materia_id].tps.push(tp);
    });
    return Object.entries(groups);
  }, [tpsFiltrados]);

  const handleEdit = (tp: TPRow) => { setEditingTP(tp); setShowForm(true); };

  return (
    <div className="tp-view">

      {/* ── Header ── */}
      <div className="tp-top">
        <div>
          <div className="tp-title">Trabajos Prácticos</div>
          <div className="tp-sub">{tps.length} TP{tps.length !== 1 ? "s" : ""} en total</div>
        </div>
        <button className="tp-new-btn" onClick={() => { setEditingTP(undefined); setShowForm(true); }}>
          + Nuevo TP
        </button>
      </div>

      {/* ── Alertas urgentes ── */}
      {(vencidos.length > 0 || proximos.length > 0) && (
        <div className="tp-alertas">
          {vencidos.length > 0 && (
            <div className="tp-alerta vencido">
              ⚠️ {vencidos.length} TP{vencidos.length > 1 ? "s" : ""} vencido{vencidos.length > 1 ? "s" : ""} sin entregar:
              {" "}{vencidos.map(t => t.titulo).join(", ")}
            </div>
          )}
          {proximos.length > 0 && (
            <div className="tp-alerta proximo">
              🔔 {proximos.length} TP{proximos.length > 1 ? "s" : ""} vence{proximos.length > 1 ? "n" : ""} en los próximos 5 días
            </div>
          )}
        </div>
      )}

      {/* ── Filtros ── */}
      {tps.length > 0 && (
        <div className="tp-filtros">
          <div className="tp-filtro-group">
            <button className={`tp-filtro-btn${filtroEstado === "todos" ? " active" : ""}`}
              onClick={() => setFiltroEstado("todos")}>Todos</button>
            <button className={`tp-filtro-btn${filtroEstado === "pendiente" ? " active" : ""}`}
              onClick={() => setFiltroEstado("pendiente")}>Pendientes</button>
            <button className={`tp-filtro-btn${filtroEstado === "en_progreso" ? " active" : ""}`}
              onClick={() => setFiltroEstado("en_progreso")}>En progreso</button>
            <button className={`tp-filtro-btn${filtroEstado === "entregado" ? " active" : ""}`}
              onClick={() => setFiltroEstado("entregado")}>Entregados</button>
          </div>
          {materias.length > 1 && (
            <select
              className="tp-filtro-select"
              value={filtroMateria}
              onChange={e => setFiltroMateria(e.target.value)}
            >
              <option value="todas">Todas las materias</option>
              {materias.map(m => (
                <option key={m.id} value={m.id}>{m.nombre}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* ── Empty state ── */}
      {tps.length === 0 && (
        <div className="tp-empty">
          <div className="tp-empty-icon">📝</div>
          <div className="tp-empty-title">Sin TPs cargados</div>
          <div className="tp-empty-sub">Agregá tus trabajos prácticos para no perder ninguna fecha de entrega.</div>
          <button className="tp-new-btn" onClick={() => setShowForm(true)}>+ Crear primer TP</button>
        </div>
      )}

      {/* ── Lista agrupada por materia ── */}
      {tpsPorMateria.map(([materiaId, grupo]) => (
        <div key={materiaId} className="tp-grupo">
          <div className="tp-grupo-header">
            <span className="tp-grupo-dot" style={{ background: grupo.color }} />
            <span className="tp-grupo-nombre">{grupo.nombre}</span>
            <span className="tp-grupo-count">{grupo.tps.length}</span>
          </div>
          <div className="tp-cards">
            {grupo.tps.map(tp => (
              <TPCard
                key={tp.id}
                tp={tp}
                onEdit={handleEdit}
                onAddToSprint={(t) => setSprintTP(t)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Modales */}
      {showForm && (
        <TPForm tp={editingTP} onClose={() => { setShowForm(false); setEditingTP(undefined); }} />
      )}
      {sprintTP && (
        <SprintIntegrationModal tp={sprintTP} onClose={() => setSprintTP(undefined)} />
      )}
    </div>
  );
}
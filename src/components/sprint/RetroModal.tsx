import { useState } from "react";
import { useSprintStore } from "../../store/useSprintStore";
import type { SprintRow } from "../../types";

interface Props { sprint: SprintRow; onClose: () => void; }

export function RetroModal({ sprint, onClose }: Props) {
  const closeSprint = useSprintStore(s => s.closeSprint);

  const [bien,      setBien]      = useState("");
  const [mejorar,   setMejorar]   = useState("");
  const [nextSprint, setNextSprint] = useState("");
  const [rating,    setRating]    = useState(0);
  const [saving,    setSaving]    = useState(false);

  const done     = sprint.temas.filter(t => t.done).length;
  const total    = sprint.temas.length;
  const pct      = Math.round((done / total) * 100);

  const handleClose = async () => {
    if (!rating) return;
    setSaving(true);
    await closeSprint(sprint.id, { bien, mejorar, next_sprint: nextSprint, rating });
    setSaving(false);
    onClose();
  };

  return (
    <div className="retro-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="retro-modal">
        <div className="retro-handle" />
        <div className="retro-title">🏁 Retrospectiva</div>
        <div className="retro-sprint-name">"{sprint.nombre}"</div>

        {/* Stats del sprint */}
        <div className="retro-stats">
          <div className="retro-stat">
            <div className="retro-stat-val" style={{ color: pct >= 80 ? "#55EFC4" : pct >= 50 ? "#FECA57" : "#FF6B6B" }}>{pct}%</div>
            <div className="retro-stat-lbl">Completado</div>
          </div>
          <div className="retro-stat">
            <div className="retro-stat-val">{done}/{total}</div>
            <div className="retro-stat-lbl">Temas</div>
          </div>
          <div className="retro-stat">
            <div className="retro-stat-val">{sprint.dailies.length}</div>
            <div className="retro-stat-lbl">Dailies</div>
          </div>
        </div>

        {/* Rating */}
        <div className="retro-field">
          <label className="retro-label">¿Cómo fue el sprint?</label>
          <div className="retro-stars">
            {[1,2,3,4,5].map(s => (
              <button key={s} className={`retro-star${rating >= s ? " active" : ""}`} onClick={() => setRating(s)}>★</button>
            ))}
          </div>
        </div>

        <div className="retro-field">
          <label className="retro-label">✅ ¿Qué salió bien?</label>
          <textarea className="retro-textarea" rows={2} value={bien} onChange={e => setBien(e.target.value)} placeholder="ej: Mantuve constancia, entendí los temas difíciles" />
        </div>

        <div className="retro-field">
          <label className="retro-label">🔧 ¿Qué mejorar?</label>
          <textarea className="retro-textarea" rows={2} value={mejorar} onChange={e => setMejorar(e.target.value)} placeholder="ej: Me comprometí con demasiados temas, me distraje" />
        </div>

        <div className="retro-field">
          <label className="retro-label">🎯 ¿Qué vas a hacer diferente en el próximo?</label>
          <textarea className="retro-textarea" rows={2} value={nextSprint} onChange={e => setNextSprint(e.target.value)} placeholder="ej: Menos temas, más foco en práctica" />
        </div>

        <div className="retro-actions">
          <button className="retro-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="retro-btn-save" onClick={handleClose} disabled={!rating || saving}>
            {saving ? "Cerrando…" : "Cerrar sprint 🏁"}
          </button>
        </div>
      </div>
    </div>
  );
}
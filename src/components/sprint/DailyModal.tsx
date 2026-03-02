import { useState } from "react";
import { useSprintStore } from "../../store/useSprintStore";
import type { SprintRow } from "../../types";

interface Props { sprint: SprintRow; onClose: () => void; }

function today() { return new Date().toISOString().split("T")[0]; }

export function DailyModal({ sprint, onClose }: Props) {
  const addDaily = useSprintStore(s => s.addDaily);
  const todayEntry = sprint.dailies.find(d => d.date === today());

  const [nota,   setNota]   = useState(todayEntry?.nota ?? "");
  const [saving, setSaving] = useState(false);

  const temasDoneHoy = sprint.temas.filter(t => t.done).length;
  const totalTemas   = sprint.temas.length;

  const handleSave = async () => {
    setSaving(true);
    await addDaily(sprint.id, {
      date:       today(),
      temas_done: temasDoneHoy,
      nota:       nota.trim() || undefined,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div className="dm-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="dm-modal">
        <div className="dm-handle" />
        <div className="dm-title">☀️ Daily de hoy</div>
        <div className="dm-date">{new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}</div>

        {/* Progreso actual */}
        <div className="dm-progress-card">
          <div className="dm-progress-top">
            <span className="dm-progress-label">Progreso del sprint</span>
            <span className="dm-progress-pct">{Math.round((temasDoneHoy / totalTemas) * 100)}%</span>
          </div>
          <div className="dm-track"><div className="dm-fill" style={{ width: `${(temasDoneHoy / totalTemas) * 100}%` }} /></div>
          <div className="dm-progress-sub">{temasDoneHoy} de {totalTemas} temas completados</div>
        </div>

        {/* Nota del día */}
        <div className="dm-field">
          <label className="dm-label">¿Cómo te fue hoy? (opcional)</label>
          <textarea
            className="dm-textarea"
            placeholder="Qué estudiaste, qué trabas tuviste, cómo te sentiste…"
            value={nota}
            onChange={e => setNota(e.target.value)}
            rows={3}
            autoFocus
          />
        </div>

        {todayEntry && (
          <div className="dm-already">
            ✓ Ya registraste un daily hoy — esto lo va a reemplazar
          </div>
        )}

        <div className="dm-actions">
          <button className="dm-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="dm-btn-save" onClick={handleSave} disabled={saving}>
            {saving ? "Guardando…" : "Guardar daily ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
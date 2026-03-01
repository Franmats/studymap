import { useState } from "react";
import type { ExamenRow, ExamenTipo, MateriaRow } from "../../types";

const TIPOS: { value: ExamenTipo; label: string; emoji: string }[] = [
  { value: "parcial",       label: "Parcial",       emoji: "📝" },
  { value: "final",         label: "Final",         emoji: "🎓" },
  { value: "recuperatorio", label: "Recuperatorio", emoji: "🔄" },
  { value: "otro",          label: "Otro",          emoji: "📌" },
];

const CSS = `
  .ef-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,.6); backdrop-filter: blur(4px);
    display: flex; align-items: flex-end; justify-content: center;
    padding: 0;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
  @keyframes slideUp { from { transform:translateY(100%) } to { transform:translateY(0) } }

  .ef-modal {
    background: #1a1535; border-radius: 20px 20px 0 0;
    padding: 24px 20px 40px; width: 100%; max-width: 520px;
    border-top: 1px solid rgba(255,255,255,.1);
    animation: slideUp .25s ease;
  }
  .ef-handle { width: 40px; height: 4px; background: rgba(255,255,255,.15);
    border-radius: 2px; margin: 0 auto 20px; }
  .ef-title { font-size: 17px; font-weight: 800; color: #fff; margin-bottom: 20px; }
  .ef-field { margin-bottom: 14px; }
  .ef-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.4);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; display: block; }
  .ef-input {
    width: 100%; background: rgba(255,255,255,.06);
    border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
    padding: 11px 14px; color: #fff; font-size: 14px;
    outline: none; transition: border-color .2s;
    -webkit-appearance: none; box-sizing: border-box;
  }
  .ef-input:focus { border-color: #6C5CE7; }
  .ef-input::placeholder { color: rgba(255,255,255,.25); }
  .ef-tipos { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; }
  .ef-tipo {
    background: rgba(255,255,255,.05); border: 1.5px solid rgba(255,255,255,.08);
    border-radius: 10px; padding: 10px 6px; text-align: center;
    cursor: pointer; transition: all .15s; -webkit-tap-highlight-color: transparent;
  }
  .ef-tipo.active { background: rgba(108,92,231,.25); border-color: #6C5CE7; }
  .ef-tipo-emoji { font-size: 18px; margin-bottom: 3px; }
  .ef-tipo-lbl { font-size: 10px; color: rgba(255,255,255,.5); font-weight: 600; }
  .ef-tipo.active .ef-tipo-lbl { color: #a29bfe; }
  .ef-actions { display: flex; gap: 10px; margin-top: 20px; }
  .ef-btn-cancel { flex: 1; background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.1); color: rgba(255,255,255,.6);
    padding: 13px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 600; }
  .ef-btn-save { flex: 2; background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    border: none; color: #fff; padding: 13px; border-radius: 12px;
    cursor: pointer; font-size: 14px; font-weight: 700;
    box-shadow: 0 4px 14px #6C5CE755; }
  .ef-btn-save:disabled { opacity: .5; cursor: not-allowed; }
  .ef-materia-select { appearance: none; -webkit-appearance: none; }

  @media (min-width: 600px) {
    .ef-overlay { align-items: center; padding: 20px; }
    .ef-modal { border-radius: 20px; max-width: 460px; padding: 28px 24px 28px; }
  }
`;

interface Props {
  materias: MateriaRow[];
  examen?: ExamenRow;           // si viene, es edición; si no, es creación
  defaultMateriaId?: string;    // pre-selecciona la materia
  onSave: (data: {
    materia_id: string;
    titulo: string;
    fecha: string;
    tipo: ExamenTipo;
    notas?: string;
  }) => Promise<void>;
  onClose: () => void;
}

export function ExamenForm({ materias, examen, defaultMateriaId, onSave, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [materiaId, setMateriaId] = useState(examen?.materia_id ?? defaultMateriaId ?? materias[0]?.id ?? "");
  const [titulo,    setTitulo]    = useState(examen?.titulo ?? "");
  const [fecha,     setFecha]     = useState(examen?.fecha ?? today);
  const [tipo,      setTipo]      = useState<ExamenTipo>(examen?.tipo ?? "parcial");
  const [notas,     setNotas]     = useState(examen?.notas ?? "");
  const [saving,    setSaving]    = useState(false);

  const handleSave = async () => {
    if (!titulo.trim() || !fecha || !materiaId) return;
    setSaving(true);
    await onSave({ materia_id: materiaId, titulo: titulo.trim(), fecha, tipo, notas: notas || undefined });
    setSaving(false);
    onClose();
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="ef-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="ef-modal">
          <div className="ef-handle" />
          <div className="ef-title">{examen ? "Editar examen" : "➕ Nuevo examen"}</div>

          {/* Materia */}
          <div className="ef-field">
            <label className="ef-label">Materia</label>
            <select
              className="ef-input ef-materia-select"
              value={materiaId}
              onChange={(e) => setMateriaId(e.target.value)}
              style={{ cursor: "pointer" }}
            >
              {materias.map((m) => (
                <option key={m.id} value={m.id} style={{ background: "#1a1535" }}>{m.nombre}</option>
              ))}
            </select>
          </div>

          {/* Título */}
          <div className="ef-field">
            <label className="ef-label">Nombre del examen</label>
            <input
              className="ef-input"
              placeholder="Ej: Primer parcial, Final..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>

          {/* Fecha */}
          <div className="ef-field">
            <label className="ef-label">Fecha</label>
            <input
              className="ef-input"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              style={{ colorScheme: "dark" }}
            />
          </div>

          {/* Tipo */}
          <div className="ef-field">
            <label className="ef-label">Tipo</label>
            <div className="ef-tipos">
              {TIPOS.map((t) => (
                <div
                  key={t.value}
                  className={`ef-tipo${tipo === t.value ? " active" : ""}`}
                  onClick={() => setTipo(t.value)}
                >
                  <div className="ef-tipo-emoji">{t.emoji}</div>
                  <div className="ef-tipo-lbl">{t.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Notas opcionales */}
          <div className="ef-field">
            <label className="ef-label">Notas (opcional)</label>
            <textarea
              className="ef-input"
              placeholder="Temas a repasar, bibliografía..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              style={{ resize: "none", fontFamily: "inherit" }}
            />
          </div>

          <div className="ef-actions">
            <button className="ef-btn-cancel" onClick={onClose}>Cancelar</button>
            <button
              className="ef-btn-save"
              onClick={handleSave}
              disabled={saving || !titulo.trim() || !fecha}
            >
              {saving ? "Guardando…" : examen ? "Guardar cambios" : "Agregar examen"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
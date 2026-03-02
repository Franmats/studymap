import { useState } from "react";
import { useMateriaStore } from "../../store/useMateriaStore";
import { useScheduleStore } from "../../store/useScheduleStore";
import type { ClaseRow, DiaSemana, ClaseTipo } from "../../types";

const DIAS: DiaSemana[] = ["lunes","martes","miércoles","jueves","viernes","sábado"];
const TIPOS: { value: ClaseTipo; label: string; icon: string }[] = [
  { value: "teórica",      label: "Teórica",      icon: "📖" },
  { value: "práctica",     label: "Práctica",     icon: "✏️" },
  { value: "laboratorio",  label: "Laboratorio",  icon: "🔬" },
  { value: "otra",         label: "Otra",         icon: "📌" },
];
const MATERIA_COLORS = [
  "#6C5CE7","#FF6B6B","#55EFC4","#FECA57",
  "#FF9F43","#48CAE4","#fd79a8","#00b894",
];

// Genera opciones de hora de 7:00 a 23:00 cada 30 min
function horaOptions() {
  const opts: string[] = [];
  for (let h = 7; h <= 23; h++) {
    opts.push(`${String(h).padStart(2,"0")}:00`);
    if (h < 23) opts.push(`${String(h).padStart(2,"0")}:30`);
  }
  return opts;
}
const HORAS = horaOptions();

interface Props {
  editando?: ClaseRow;
  onClose: () => void;
}

export function ClaseForm({ editando, onClose }: Props) {
  const materias     = useMateriaStore(s => s.materias);
  const createClase  = useScheduleStore(s => s.createClase);
  const updateClase  = useScheduleStore(s => s.updateClase);

  const [materiaId,  setMateriaId]  = useState(editando?.materia_id  ?? "");
  const [dia,        setDia]        = useState<DiaSemana>(editando?.dia ?? "lunes");
  const [horaInicio, setHoraInicio] = useState(editando?.hora_inicio ?? "08:00");
  const [horaFin,    setHoraFin]    = useState(editando?.hora_fin    ?? "10:00");
  const [tipo,       setTipo]       = useState<ClaseTipo>(editando?.tipo ?? "teórica");
  const [profesor,   setProfesor]   = useState(editando?.profesor ?? "");
  const [aula,       setAula]       = useState(editando?.aula     ?? "");
  const [saving,     setSaving]     = useState(false);

  const materiaObj   = materias.find(m => m.id === materiaId);
  const matColor     = materiaObj
    ? MATERIA_COLORS[materias.findIndex(m => m.id === materiaId) % MATERIA_COLORS.length]
    : "#6C5CE7";

  const handleSave = async () => {
    if (!materiaId || !dia || !horaInicio || !horaFin) return;
    setSaving(true);
    const payload = {
      materia_id:     materiaId,
      materia_nombre: materiaObj?.nombre ?? "",
      materia_color:  matColor,
      dia, hora_inicio: horaInicio, hora_fin: horaFin,
      tipo, profesor: profesor.trim() || null, aula: aula.trim() || null,
    };
    if (editando) await updateClase(editando.id, payload);
    else          await createClase(payload);
    setSaving(false);
    onClose();
  };

  const valid = !!materiaId && horaInicio < horaFin;

  return (
    <div className="cf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="cf-modal">
        <div className="cf-handle" />
        <div className="cf-title">{editando ? "✏️ Editar clase" : "➕ Nueva clase"}</div>

        {/* Materia */}
        <div className="cf-field">
          <label className="cf-label">Materia</label>
          <select className="cf-select" value={materiaId} onChange={e => setMateriaId(e.target.value)}>
            <option value="">Seleccioná una materia…</option>
            {materias.map(m => (
              <option key={m.id} value={m.id}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {/* Día */}
        <div className="cf-field">
          <label className="cf-label">Día</label>
          <div className="cf-dias">
            {DIAS.map(d => (
              <button key={d}
                className={`cf-dia-btn${dia === d ? " active" : ""}`}
                onClick={() => setDia(d)}
              >
                {d.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Horario */}
        <div className="cf-field">
          <label className="cf-label">Horario</label>
          <div className="cf-hora-row">
            <select className="cf-select cf-hora" value={horaInicio} onChange={e => setHoraInicio(e.target.value)}>
              {HORAS.map(h => <option key={h} value={h}>{h}</option>)}
            </select>
            <span className="cf-hora-sep">→</span>
            <select className="cf-select cf-hora" value={horaFin} onChange={e => setHoraFin(e.target.value)}>
              {HORAS.filter(h => h > horaInicio).map(h => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          {horaInicio >= horaFin && (
            <div className="cf-error">La hora de fin debe ser mayor a la de inicio</div>
          )}
        </div>

        {/* Tipo */}
        <div className="cf-field">
          <label className="cf-label">Tipo</label>
          <div className="cf-tipos">
            {TIPOS.map(t => (
              <button key={t.value}
                className={`cf-tipo-btn${tipo === t.value ? " active" : ""}`}
                onClick={() => setTipo(t.value)}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Profesor y Aula */}
        <div className="cf-row-2">
          <div className="cf-field">
            <label className="cf-label">Profesor (opcional)</label>
            <input className="cf-input" placeholder="ej: García" value={profesor} onChange={e => setProfesor(e.target.value)} />
          </div>
          <div className="cf-field">
            <label className="cf-label">Aula (opcional)</label>
            <input className="cf-input" placeholder="ej: Aula 12" value={aula} onChange={e => setAula(e.target.value)} />
          </div>
        </div>

        {/* Preview chip */}
        {materiaObj && (
          <div className="cf-preview" style={{ borderColor: matColor, background: `${matColor}15` }}>
            <div className="cf-preview-dot" style={{ background: matColor }} />
            <span style={{ color: matColor, fontWeight: 700 }}>{materiaObj.nombre}</span>
            <span className="cf-preview-sep">·</span>
            <span>{dia} {horaInicio}–{horaFin}</span>
            <span className="cf-preview-sep">·</span>
            <span>{TIPOS.find(t => t.value === tipo)?.icon} {tipo}</span>
          </div>
        )}

        <div className="cf-actions">
          <button className="cf-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="cf-btn-save" onClick={handleSave} disabled={!valid || saving}>
            {saving ? "Guardando…" : editando ? "Guardar cambios" : "Agregar clase"}
          </button>
        </div>
      </div>
    </div>
  );
}
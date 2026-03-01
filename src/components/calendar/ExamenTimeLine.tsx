import type { ExamenRow, MateriaRow, ExamenTipo } from "../../types";

const TIPO_CONFIG: Record<ExamenTipo, { emoji: string; color: string; bg: string }> = {
  parcial:       { emoji: "📝", color: "#6C5CE7", bg: "rgba(108,92,231,.15)" },
  final:         { emoji: "🎓", color: "#FF6B6B", bg: "rgba(255,107,107,.15)" },
  recuperatorio: { emoji: "🔄", color: "#FF9F43", bg: "rgba(255,159,67,.15)"  },
  otro:          { emoji: "📌", color: "#48CAE4", bg: "rgba(72,202,228,.15)"  },
};

const CSS = `
  @keyframes tl-enter {
    from { opacity:0; transform:translateX(-12px); }
    to   { opacity:1; transform:translateX(0); }
  }

  .tl { display: flex; flex-direction: column; gap: 8px; }
  .tl-empty { text-align: center; padding: 32px 20px;
    background: rgba(255,255,255,.025); border-radius: 14px;
    border: 2px dashed rgba(255,255,255,.08); }
  .tl-empty-icon { font-size: 32px; margin-bottom: 8px; }
  .tl-empty-txt { font-size: 13px; color: rgba(255,255,255,.35); }

  .tl-section-label { font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    color: rgba(255,255,255,.3); text-transform: uppercase; margin: 12px 0 6px; }
  .tl-section-label:first-child { margin-top: 0; }

  .tl-item {
    display: flex; align-items: center; gap: 12px;
    background: rgba(255,255,255,.04); border-radius: 13px;
    padding: 12px 14px; border: 1px solid rgba(255,255,255,.07);
    transition: background .2s, transform .2s, border-color .2s;
    animation: tl-enter .3s ease both;
    animation-delay: var(--tl-delay, 0ms);
    cursor: default;
  }
  .tl-item:hover {
    background: rgba(255,255,255,.07);
    transform: translateX(4px);
    border-color: rgba(255,255,255,.13);
  }
  .tl-item.pasado { opacity: .55; }
  .tl-item.hoy { border-color: #FECA57; background: rgba(254,202,87,.07); }

  .tl-badge { width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center; font-size: 20px;
    transition: transform .2s; }
  .tl-item:hover .tl-badge { transform: scale(1.1) rotate(-5deg); }

  .tl-info { flex: 1; min-width: 0; }
  .tl-nombre { font-size: 14px; font-weight: 700; color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .tl-materia { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .tl-right { text-align: right; flex-shrink: 0; }
  .tl-dias { font-size: 16px; font-weight: 900; line-height: 1; }
  .tl-dias-lbl { font-size: 9px; color: rgba(255,255,255,.3); font-weight: 600;
    text-transform: uppercase; margin-top: 2px; }
  .tl-hoy-badge { font-size: 10px; font-weight: 700; color: #FECA57;
    background: rgba(254,202,87,.15); padding: 3px 8px; border-radius: 20px; }

  .tl-actions { display: flex; gap: 6px; margin-left: 6px; flex-shrink: 0; }
  .tl-btn { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.5); border-radius: 7px; padding: 5px 8px;
    cursor: pointer; font-size: 11px; font-weight: 600;
    -webkit-tap-highlight-color: transparent;
    transition: background .15s, transform .15s; }
  .tl-btn:hover { background: rgba(255,255,255,.12); }
  .tl-btn:active { transform: scale(.9); }
  .tl-btn.aprobado   { background: rgba(85,239,196,.15); border-color: rgba(85,239,196,.3); color: #55EFC4; }
  .tl-btn.desaprobado { background: rgba(255,107,107,.15); border-color: rgba(255,107,107,.3); color: #FF6B6B; }
`;

function getDiasRestantes(fecha: string) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const exam = new Date(fecha + "T00:00:00");
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000);
}
function formatFecha(fecha: string) {
  return new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
    day: "numeric", month: "short", weekday: "short",
  });
}

interface Props {
  examenes: ExamenRow[];
  materias: MateriaRow[];
  onEdit:             (e: ExamenRow) => void;
  onDelete:           (id: string) => void;
  onToggleAprobado:   (e: ExamenRow) => void;
}

export function ExamenTimeline({ examenes, materias, onEdit, onDelete, onToggleAprobado }: Props) {
  const materiaMap = Object.fromEntries(materias.map((m) => [m.id, m]));

  const proximos = examenes.filter((e) => getDiasRestantes(e.fecha) >= 0);
  const pasados  = examenes.filter((e) => getDiasRestantes(e.fecha) < 0);

  if (examenes.length === 0) return (
    <>
      <style>{CSS}</style>
      <div className="tl-empty">
        <div className="tl-empty-icon">📭</div>
        <div className="tl-empty-txt">No hay exámenes cargados todavía</div>
      </div>
    </>
  );

  let globalIdx = 0;

  const renderItem = (examen: ExamenRow) => {
    const dias     = getDiasRestantes(examen.fecha);
    const cfg      = TIPO_CONFIG[examen.tipo] ?? TIPO_CONFIG.otro;
    const materia  = materiaMap[examen.materia_id];
    const esHoy    = dias === 0;
    const esPasado = dias < 0;
    const delay    = globalIdx++ * 55;

    return (
      <div
        key={examen.id}
        className={`tl-item${esPasado ? " pasado" : ""}${esHoy ? " hoy" : ""}`}
        style={{ "--tl-delay": `${delay}ms` } as React.CSSProperties}
      >
        <div className="tl-badge" style={{ background: cfg.bg }}>{cfg.emoji}</div>

        <div className="tl-info">
          <div className="tl-nombre">{examen.titulo}</div>
          <div className="tl-materia">{materia?.nombre ?? "—"} · {formatFecha(examen.fecha)}</div>
        </div>

        <div className="tl-right">
          {esHoy ? (
            <div className="tl-hoy-badge">¡Hoy!</div>
          ) : (
            <>
              <div className="tl-dias" style={{ color: esPasado ? "rgba(255,255,255,.35)" : cfg.color }}>
                {esPasado ? `-${Math.abs(dias)}` : dias}
              </div>
              <div className="tl-dias-lbl">{esPasado ? "días" : dias === 1 ? "día" : "días"}</div>
            </>
          )}
        </div>

        <div className="tl-actions">
          {esPasado && (
            <button
              className={`tl-btn ${examen.aprobado === true ? "aprobado" : examen.aprobado === false ? "desaprobado" : ""}`}
              onClick={() => onToggleAprobado(examen)}
            >
              {examen.aprobado === true ? "✓ Aprobé" : examen.aprobado === false ? "✗ No aprobé" : "Resultado"}
            </button>
          )}
          <button className="tl-btn" onClick={() => onEdit(examen)}>✏️</button>
          <button className="tl-btn" onClick={() => onDelete(examen.id)}>🗑</button>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="tl">
        {proximos.length > 0 && (
          <>
            <div className="tl-section-label">📅 Próximos</div>
            {proximos.map(renderItem)}
          </>
        )}
        {pasados.length > 0 && (
          <>
            <div className="tl-section-label">🕐 Pasados</div>
            {[...pasados].reverse().map(renderItem)}
          </>
        )}
      </div>
    </>
  );
}
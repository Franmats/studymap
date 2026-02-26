import type { MateriaRow } from "../types";

const CSS = `
  .mi {
    background: rgba(255,255,255,.055);
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,.08);
    overflow: hidden;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    transition: background .2s;
    active-opacity: .7;
  }
  .mi:active { background: rgba(255,255,255,.09); }

  .mi-main {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px 10px;
  }
  .mi-avatar {
    width: 42px; height: 42px; border-radius: 12px; flex-shrink: 0;
    background: linear-gradient(135deg, rgba(108,92,231,.35), rgba(162,155,254,.35));
    border: 1px solid rgba(162,155,254,.25);
    display: flex; align-items: center; justify-content: center;
    font-size: 20px;
  }
  .mi-info { flex: 1; min-width: 0; }
  .mi-name { font-weight: 700; color: #fff; font-size: 14px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mi-desc { font-size: 11px; color: rgba(255,255,255,.38); margin-top: 2px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mi-pct {
    font-size: 18px; font-weight: 900; flex-shrink: 0;
    min-width: 44px; text-align: right;
  }
  .mi-pct-lbl { font-size: 9px; color: rgba(255,255,255,.28); font-weight: 600; }

  .mi-footer {
    display: flex;
    align-items: center;
    padding: 0 14px 12px;
    gap: 8px;
  }
  .mi-bar-wrap { flex: 1; }
  .mi-bar-track { height: 4px; background: rgba(255,255,255,.07); border-radius: 99px; overflow: hidden; }
  .mi-bar-fill { height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #6C5CE7, #55EFC4); transition: width .4s ease; }
  .mi-del {
    background: rgba(255,107,107,.12);
    border: 1px solid rgba(255,107,107,.25);
    color: #FF6B6B; border-radius: 8px;
    padding: 5px 10px; cursor: pointer;
    font-size: 11px; font-weight: 700;
    flex-shrink: 0; -webkit-tap-highlight-color: transparent;
  }
  .mi-del:active { background: rgba(255,107,107,.22); }

  @media (min-width: 600px) {
    .mi-main { padding: 16px 18px 10px; gap: 14px; }
    .mi-footer { padding: 0 18px 14px; }
    .mi-name { font-size: 15px; }
    .mi-avatar { width: 44px; height: 44px; }
  }
`;

interface Props {
  materia: MateriaRow;
  onOpen: (materia: MateriaRow) => void;
  onDelete: (id: string) => void;
}

const SUBJECT_ICONS: Record<string, string> = {
  default: "📖",
  math: "➗", fisica: "⚛️", quimica: "🧪", historia: "🏛️",
  biologia: "🧬", programacion: "💻", economia: "📊",
  filosofia: "🤔", literatura: "✍️", ingles: "🌍",
};

function getIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(SUBJECT_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return SUBJECT_ICONS.default;
}

export function MateriaItem({ materia, onOpen, onDelete }: Props) {
  const pct = materia.progress_percent;
  const isDone = pct === 100;
  const pctColor = isDone ? "#55EFC4" : pct > 50 ? "#a29bfe" : "#FF9F43";

  return (
    <>
      <style>{CSS}</style>
      <div className="mi" onClick={() => onOpen(materia)}>
        <div className="mi-main">
          <div className="mi-avatar">{getIcon(materia.nombre)}</div>
          <div className="mi-info">
            <div className="mi-name">{materia.nombre}</div>
            <div className="mi-desc">{materia.descripcion ?? "Sin descripción"}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="mi-pct" style={{ color: pctColor }}>{pct}%</div>
            <div className="mi-pct-lbl">progreso</div>
          </div>
        </div>

        <div className="mi-footer">
          <div className="mi-bar-wrap">
            <div className="mi-bar-track">
              <div className="mi-bar-fill" style={{ width: `${pct}%` }}/>
            </div>
          </div>
          <button
            className="mi-del"
            onClick={e => { e.stopPropagation(); onDelete(materia.id); }}
          >
            🗑
          </button>
        </div>
      </div>
    </>
  );
}
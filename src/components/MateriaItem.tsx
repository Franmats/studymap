import { memo } from "react";
import type { MateriaRow } from "../types";
import { EtiquetaSelector } from "./EtiquetaSelector";


const SUBJECT_ICONS: Record<string, string> = {
  default:"📖", math:"➗", fisica:"⚛️", quimica:"🧪", historia:"🏛️",
  biologia:"🧬", programacion:"💻", economia:"📊",
  filosofia:"🤔", literatura:"✍️", ingles:"🌍",
};
function getIcon(name: string) {
  const l = name.toLowerCase();
  for (const [k, v] of Object.entries(SUBJECT_ICONS)) if (l.includes(k)) return v;
  return SUBJECT_ICONS.default;
}

interface Props {
  materia:        MateriaRow;
  index?:         number;
  onOpen:         (m: MateriaRow) => void;
  onDelete:       (id: string) => void;
  onEtiqueta:     (id: string, etiqueta: string | null) => void;
}

export const MateriaItem = memo(function MateriaItem({ materia, index = 0, onOpen, onDelete, onEtiqueta }: Props) {
  const pct      = materia.progress_percent;
  const isDone   = pct === 100;
  const pctColor = isDone ? "#55EFC4" : pct > 50 ? "#a29bfe" : "#FF9F43";

  return (
    <>      <div
        className={`mi${isDone ? " done-glow" : ""}`}
        style={{ "--mi-delay":`${index * 60}ms` } as React.CSSProperties}
        onClick={() => onOpen(materia)}
      >
        <div className="mi-main">
          <div className="mi-avatar">{getIcon(materia.nombre)}</div>
          <div className="mi-info">
            <div className="mi-name">{materia.nombre}</div>
            <div className="mi-desc">{materia.descripcion ?? "Sin descripción"}</div>
          </div>
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div className="mi-pct" style={{ color:pctColor }}>{pct}%</div>
            <div className="mi-pct-lbl">progreso</div>
          </div>
        </div>

        <div className="mi-footer">
          <div className="mi-bar-wrap">
            <div className="mi-bar-track">
              <div className="mi-bar-fill" style={{ width:`${pct}%` }}/>
            </div>
          </div>
          <div className="mi-actions" onClick={(e) => e.stopPropagation()}>
            <EtiquetaSelector
              etiqueta={materia.etiqueta}
              onChange={(e) => onEtiqueta(materia.id, e)}
            />
            <button className="mi-del" onClick={() => onDelete(materia.id)}>🗑</button>
          </div>
        </div>
      </div>
    </>
  );
}
);
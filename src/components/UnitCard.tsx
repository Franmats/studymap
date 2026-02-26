import { useState } from "react";
import type { Unidad } from "../types";
import { ProgressRing } from "./ProgressRing";

const CSS = `
  .uc {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    transition: box-shadow .25s, border-color .25s;
    border: 2px solid #eee;
  }
  .uc.open { border-color: var(--uc-color); box-shadow: 0 6px 24px var(--uc-shadow); }

  /* ── HEADER ROW ── */
  .uc-hdr {
    display: flex; align-items: center; gap: 10px;
    padding: 13px 14px;
    cursor: pointer; user-select: none;
    -webkit-tap-highlight-color: transparent;
    transition: background .2s;
  }
  .uc.open .uc-hdr { background: var(--uc-light); }

  .uc-num {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: var(--uc-color); color: #fff;
    display: flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 14px;
  }

  .uc-meta { flex: 1; min-width: 0; }
  .uc-title-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 2px; }
  .uc-title { font-weight: 700; font-size: 13px; color: #1a1a2e; line-height: 1.3; }
  .uc-diff { font-size: 12px; flex-shrink: 0; }
  .uc-weeks { font-size: 10px; padding: 2px 7px; border-radius: 20px; font-weight: 700;
    background: var(--uc-light); color: var(--uc-text); flex-shrink: 0; white-space: nowrap; }
  .uc-desc { font-size: 11px; color: #999; line-height: 1.35;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .uc-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .uc-ring-wrap { position: relative; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .uc-ring-pct { position: absolute; font-size: 9px; font-weight: 700; color: #1a1a2e; }

  /* status select */
  .uc-select {
    border-radius: 8px; padding: 4px 6px; font-size: 10px;
    font-weight: 700; background: #fff; cursor: pointer;
    border: 1.5px solid;
    max-width: 95px;
  }

  .uc-chevron { font-size: 16px; font-weight: 700; flex-shrink: 0;
    transition: transform .25s; color: var(--uc-color); }
  .uc.open .uc-chevron { transform: rotate(90deg); }

  /* ── BODY ── */
  .uc-body {
    padding: 0 14px 14px;
    border-top: 1px dashed rgba(0,0,0,.08);
    animation: fadeUp .2s ease;
  }

  .uc-prereqs { margin: 10px 0 6px; }
  .uc-prereqs-lbl { font-size: 10px; color: #bbb; font-weight: 700; letter-spacing: .5px; }
  .uc-prereq-tag { display: inline-block; font-size: 10px; background: #f0f0f0; color: #666;
    padding: 2px 8px; border-radius: 10px; margin: 2px 3px 2px 0; font-weight: 700; }

  .uc-temas-lbl { font-size: 10px; font-weight: 700; color: #bbb;
    letter-spacing: 1px; text-transform: uppercase; margin: 12px 0 8px; }
  .uc-temas { display: flex; flex-direction: column; gap: 5px; }

  .uc-tema {
    display: flex; align-items: flex-start; gap: 9px;
    padding: 9px 11px; border-radius: 10px; cursor: pointer;
    border: 1px solid transparent; transition: all .18s;
    -webkit-tap-highlight-color: transparent;
  }
  .uc-tema.done { background: var(--uc-light); border-color: var(--uc-border); }
  .uc-tema:not(.done) { background: #f8f9fa; }
  .uc-tema:active { opacity: .75; }

  .uc-tema-check {
    width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: #fff; font-weight: 700; transition: background .18s;
  }
  .uc-tema.done .uc-tema-check { background: var(--uc-color); }
  .uc-tema:not(.done) .uc-tema-check { background: #ddd; color: #999; }

  .uc-tema-text {
    font-size: 13px; line-height: 1.4; padding-top: 2px;
    transition: color .18s;
  }
  .uc-tema.done .uc-tema-text { color: var(--uc-text); text-decoration: line-through; opacity: .7; }
  .uc-tema:not(.done) .uc-tema-text { color: #444; }

  @media (min-width: 600px) {
    .uc-hdr { padding: 15px 18px; gap: 12px; }
    .uc-body { padding: 0 18px 16px; }
    .uc-num { width: 40px; height: 40px; font-size: 16px; }
    .uc-title { font-size: 14px; }
    .uc-desc { font-size: 12px; }
    .uc-select { font-size: 11px; max-width: 110px; }
    .uc-tema { padding: 9px 13px; }
    .uc-tema-text { font-size: 13px; }
  }
`;

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",   color: "#adb5bd", icon: "○" },
  in_progress: { label: "En progreso", color: "#FF9F43", icon: "◐" },
  done:        { label: "Completado",  color: "#55EFC4", icon: "●" },
} as const;

const DIFF_BADGE: Record<string, string> = { baja: "🟢", media: "🟡", alta: "🔴" };

interface ColorSet { bg: string; light: string; text: string; }
interface Props {
  unit: Unidad;
  colorSet: ColorSet;
  index: number;
  onStatusChange: (unitNum: number, status: string) => void;
  onToggleTema: (unitNum: number, temaIdx: number) => void;
}

export function UnitCard({ unit, colorSet, index, onStatusChange, onToggleTema }: Props) {
  const [expanded, setExpanded] = useState(false);
  const doneCount = unit.temas.filter((_, i) => unit.temaStatus?.[i] === "done").length;
  const progress  = unit.temas.length > 0 ? Math.round((doneCount / unit.temas.length) * 100) : 0;
  const status    = unit.status ?? "pending";

  const cssVars = {
    "--uc-color":  colorSet.bg,
    "--uc-light":  colorSet.light,
    "--uc-text":   colorSet.text,
    "--uc-shadow": colorSet.bg + "33",
    "--uc-border": colorSet.bg + "55",
  } as React.CSSProperties;

  return (
    <>
      <style>{CSS}</style>
      <div className={`uc${expanded ? " open" : ""}`} style={cssVars}>

        {/* HEADER */}
        <div className="uc-hdr" onClick={() => setExpanded(e => !e)}>
          <div className="uc-num">{index + 1}</div>

          <div className="uc-meta">
            <div className="uc-title-row">
              <span className="uc-title">{unit.titulo}</span>
              <span className="uc-diff">{DIFF_BADGE[unit.dificultad] ?? "⚪"}</span>
              <span className="uc-weeks">{unit.semanas_estimadas} sem.</span>
            </div>
            {unit.descripcion && <div className="uc-desc">{unit.descripcion}</div>}
          </div>

          <div className="uc-right">
            <div className="uc-ring-wrap">
              <ProgressRing progress={progress} size={38} stroke={3}/>
              <span className="uc-ring-pct">{progress}%</span>
            </div>

            <select
              className="uc-select"
              value={status}
              style={{ borderColor: STATUS_CONFIG[status].color, color: STATUS_CONFIG[status].color }}
              onClick={e => e.stopPropagation()}
              onChange={e => onStatusChange(unit.numero, e.target.value)}
            >
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.icon} {v.label}</option>
              ))}
            </select>

            <span className="uc-chevron">›</span>
          </div>
        </div>

        {/* BODY */}
        {expanded && (
          <div className="uc-body">
            {unit.prerequisitos?.length > 0 && (
              <div className="uc-prereqs">
                <span className="uc-prereqs-lbl">PREREQUISITOS </span>
                {unit.prerequisitos.map(p => (
                  <span key={p} className="uc-prereq-tag">Unidad {p}</span>
                ))}
              </div>
            )}

            <div className="uc-temas-lbl">Temas</div>
            <div className="uc-temas">
              {unit.temas.map((tema, i) => {
                const isDone = unit.temaStatus?.[i] === "done";
                return (
                  <div
                    key={i}
                    className={`uc-tema${isDone ? " done" : ""}`}
                    onClick={() => onToggleTema(unit.numero, i)}
                  >
                    <span className="uc-tema-check">{isDone ? "✓" : i + 1}</span>
                    <span className="uc-tema-text">{tema}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
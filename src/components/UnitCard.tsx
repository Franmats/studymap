import { useState, useRef, useEffect } from "react";
import type { Unidad } from "../types";
import { ProgressRing } from "./ProgressRing";
import { NotasPanel }   from "./NotasPanel";


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
  onToggleTema:   (unitNum: number, temaIdx: number) => void;
  onNotaSave:     (unitNum: number, temaIdx: number, nota: string) => Promise<void>;
}

export function UnitCard({ unit, colorSet, index, onStatusChange, onToggleTema, onNotaSave }: Props) {
  const [expanded, setExpanded] = useState(false);
  const bodyRef  = useRef<HTMLDivElement>(null);

  // Guardamos qué checks están animando para evitar conflictos
  const [checkAnims, setCheckAnims] = useState<Record<number, "pop" | "shake" | "">>({});

  const doneCount = unit.temas.filter((_, i) => unit.temaStatus?.[i] === "done").length;
  const progress  = unit.temas.length > 0 ? Math.round((doneCount / unit.temas.length) * 100) : 0;
  const status    = unit.status ?? "pending";
  const allDone   = doneCount === unit.temas.length && unit.temas.length > 0;

  // Animación de apertura con max-height, luego ResizeObserver para contenido dinámico
  useEffect(() => {
    if (!bodyRef.current) return;
    const el = bodyRef.current;

    if (expanded) {
      el.style.maxHeight = el.scrollHeight + "px";

      // Una vez abierto, usar ResizeObserver para seguir el crecimiento del contenido
      const ro = new ResizeObserver(() => {
        if (el.style.maxHeight !== "none") {
          el.style.maxHeight = el.scrollHeight + "px";
        }
      });
      ro.observe(el);

      const onEnd = () => {
        el.style.maxHeight = "none";  // liberar el límite
        ro.disconnect();
      };
      el.addEventListener("transitionend", onEnd, { once: true });

      return () => ro.disconnect();
    } else {
      // Cerrar: fijar altura actual y animar a 0
      if (el.style.maxHeight === "none" || !el.style.maxHeight) {
        el.style.maxHeight = el.scrollHeight + "px";
        void el.offsetHeight; // forzar reflow
      }
      el.style.maxHeight = "0px";
    }
  }, [expanded]);

  const handleToggleTema = (temaIdx: number) => {
    const willBeDone = unit.temaStatus?.[temaIdx] !== "done";
    onToggleTema(unit.numero, temaIdx);

    // Animar el check
    const anim = willBeDone ? "pop" : "shake";
    setCheckAnims(prev => ({ ...prev, [temaIdx]: anim }));
    // Limpiar después de que termine la animación
    setTimeout(() => setCheckAnims(prev => ({ ...prev, [temaIdx]: "" })), 400);
  };

  const cssVars = {
    "--uc-color":      colorSet.bg,
    "--uc-light":      colorSet.light,
    "--uc-text":       colorSet.text,
    "--uc-shadow":     colorSet.bg + "33",
    "--uc-border":     colorSet.bg + "55",
    "--uc-border-col": "#eee",
    "--uc-delay":      `${index * 50}ms`,
  } as React.CSSProperties;

  return (
    <>      <div className={`uc${expanded ? " open" : ""}${allDone ? " all-done" : ""}`} style={cssVars}>

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

        {/* BODY — siempre en DOM, animado con max-height */}
        <div
          ref={bodyRef}
          className={`uc-body-wrap${expanded ? " open" : " closed"}`}
          style={{ maxHeight: 0 }}
        >
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
                    onClick={() => handleToggleTema(i)}
                  >
                    <span className={`uc-tema-check${checkAnims[i] ? ` ${checkAnims[i]}` : ""}`}>
                      {isDone ? "✓" : i + 1}
                    </span>
                    <div style={{ flex:1 }}>
                      <span className="uc-tema-text">{tema}</span>
                      {/* Notas por tema — click no propaga al toggle */}
                      <div onClick={(e) => e.stopPropagation()}>
                        <NotasPanel
                          nota={unit.notas?.[i] ?? ""}
                          onSave={(nota) => onNotaSave(unit.numero, i, nota)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// ExamBanner — alerta in-app de exámenes próximos
// Se muestra al abrir la app si hay exámenes en los próximos N días.
// El usuario puede cerrarla (se recuerda por sesión, no entre recargas).
// ─────────────────────────────────────────────────────────────────────────────
import { useState} from "react";
import { useExamenStore }  from "../store/useExamenStore";
import { useMateriaStore } from "../store/useMateriaStore";
import type { ExamenRow }  from "../types";

const UMBRAL_DIAS = 7; // mostrar si faltan ≤ 7 días

const CSS = `
  @keyframes eb-enter {
    from { opacity:0; transform:translateY(-12px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes eb-exit {
    from { opacity:1; transform:translateY(0) scale(1); max-height:200px; }
    to   { opacity:0; transform:translateY(-8px) scale(.98); max-height:0; padding:0; margin:0; }
  }

  .eb {
    border-radius: 16px; margin-bottom: 14px; overflow: hidden;
    animation: eb-enter .35s cubic-bezier(.34,1.2,.64,1);
  }
  .eb.closing { animation: eb-exit .25s ease forwards; }

  /* Urgencia = hoy/mañana → rojo; ≤3 días → naranja; resto → amarillo */
  .eb.urgente  { background: rgba(255,107,107,.1);  border: 1px solid rgba(255,107,107,.3); }
  .eb.proximo  { background: rgba(255,159,67,.08);  border: 1px solid rgba(255,159,67,.3);  }
  .eb.normal   { background: rgba(254,202,87,.07);  border: 1px solid rgba(254,202,87,.25); }

  .eb-inner { padding: 14px 16px; }

  .eb-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:10px; }
  .eb-title-row { display:flex; align-items:center; gap:8px; }
  .eb-icon  { font-size:20px; flex-shrink:0; }
  .eb-title { font-size:13px; font-weight:800; color:#fff; }
  .eb-close {
    background:none; border:none; color:rgba(255,255,255,.35);
    font-size:18px; cursor:pointer; padding:0 0 0 8px; flex-shrink:0; line-height:1;
    -webkit-tap-highlight-color:transparent;
    transition: color .15s;
  }
  .eb-close:hover { color:rgba(255,255,255,.7); }

  .eb-list { display:flex; flex-direction:column; gap:6px; }
  .eb-item {
    display:flex; align-items:center; gap:10px;
    padding:9px 12px; border-radius:11px;
    background:rgba(255,255,255,.05);
    transition:background .2s;
  }
  .eb-item:hover { background:rgba(255,255,255,.09); }

  .eb-dias-badge {
    min-width:38px; text-align:center; padding:3px 7px;
    border-radius:8px; flex-shrink:0;
    font-size:11px; font-weight:800; line-height:1.3;
  }
  .urgente .eb-dias-badge { background:rgba(255,107,107,.25); color:#FF6B6B; }
  .proximo .eb-dias-badge { background:rgba(255,159,67,.25);  color:#FF9F43; }
  .normal  .eb-dias-badge { background:rgba(254,202,87,.2);   color:#FECA57; }

  .eb-item-info { flex:1; min-width:0; }
  .eb-item-nombre  { font-size:13px; font-weight:700; color:#fff;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .eb-item-materia { font-size:10px; color:rgba(255,255,255,.38); margin-top:1px;
    white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .eb-item-tipo    { font-size:10px; font-weight:600; color:rgba(255,255,255,.3); flex-shrink:0; }

  .eb-footer { margin-top:10px; text-align:right; }
  .eb-footer-btn {
    font-size:11px; font-weight:700; color:rgba(255,255,255,.4);
    background:none; border:none; cursor:pointer; padding:0;
    -webkit-tap-highlight-color:transparent;
    transition:color .15s;
  }
  .eb-footer-btn:hover { color:rgba(255,255,255,.75); }
`;

function getDias(fecha: string) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const exam = new Date(fecha + "T00:00:00");
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000);
}

function diasLabel(dias: number) {
  if (dias === 0) return "¡Hoy!";
  if (dias === 1) return "Mañana";
  return `${dias}d`;
}

function urgenciaClass(minDias: number) {
  if (minDias <= 1) return "urgente";
  if (minDias <= 3) return "proximo";
  return "normal";
}

function urgenciaIcon(minDias: number) {
  if (minDias <= 1) return "🚨";
  if (minDias <= 3) return "⚠️";
  return "📅";
}

function urgenciaTitulo(minDias: number, count: number) {
  if (minDias === 0) return `¡Tenés ${count > 1 ? `${count} exámenes` : "un examen"} hoy!`;
  if (minDias === 1) return `${count > 1 ? `${count} exámenes` : "Un examen"} mañana`;
  if (minDias <= 3)  return `${count > 1 ? `${count} exámenes` : "Un examen"} en los próximos días`;
  return `${count > 1 ? `${count} exámenes` : "Un examen"} próximamente`;
}

interface Props {
  onVerCalendario: () => void;
}

export function ExamBanner({ onVerCalendario }: Props) {
  const examenes = useExamenStore((s) => s.examenes);
  const materias = useMateriaStore((s) => s.materias);
  const [cerrado, setCerrado]   = useState(false);
  const [closing, setClosing]   = useState(false);

  const materiaMap = Object.fromEntries(materias.map((m) => [m.id, m]));

  // Filtrar exámenes dentro del umbral
  const proximos: (ExamenRow & { dias: number })[] = examenes
    .map((e) => ({ ...e, dias: getDias(e.fecha) }))
    .filter((e) => e.dias >= 0 && e.dias <= UMBRAL_DIAS)
    .sort((a, b) => a.dias - b.dias);

  // No mostrar si no hay nada o fue cerrado
  if (cerrado || proximos.length === 0) return null;

  const minDias = proximos[0].dias;
  const clase   = urgenciaClass(minDias);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setCerrado(true), 240);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className={`eb ${clase}${closing ? " closing" : ""}`}>
        <div className="eb-inner">
          <div className="eb-header">
            <div className="eb-title-row">
              <span className="eb-icon">{urgenciaIcon(minDias)}</span>
              <span className="eb-title">{urgenciaTitulo(minDias, proximos.length)}</span>
            </div>
            <button className="eb-close" onClick={handleClose}>×</button>
          </div>

          <div className="eb-list">
            {proximos.slice(0, 3).map((e) => (
              <div key={e.id} className="eb-item">
                <div className="eb-dias-badge">{diasLabel(e.dias)}</div>
                <div className="eb-item-info">
                  <div className="eb-item-nombre">{e.titulo}</div>
                  <div className="eb-item-materia">{materiaMap[e.materia_id]?.nombre ?? "—"}</div>
                </div>
                <div className="eb-item-tipo">{e.tipo}</div>
              </div>
            ))}
            {proximos.length > 3 && (
              <div style={{ fontSize:11, color:"rgba(255,255,255,.3)", textAlign:"center", padding:"2px 0" }}>
                +{proximos.length - 3} más
              </div>
            )}
          </div>

          <div className="eb-footer">
            <button className="eb-footer-btn" onClick={() => { handleClose(); onVerCalendario(); }}>
              Ver calendario →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
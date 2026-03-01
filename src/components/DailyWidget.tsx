
import { useSesionStore } from "../store/useSesionStore";

const CSS = `
  @keyframes dw-enter {
    from { opacity:0; transform:translateY(-10px) scale(.98); }
    to   { opacity:1; transform:translateY(0) scale(1); }
  }
  @keyframes dw-bar-fill {
    from { width: 0%; }
    to   { width: var(--dw-pct); }
  }
  @keyframes dw-streak-pop {
    0%   { transform: scale(.8) rotate(-10deg); opacity:0; }
    60%  { transform: scale(1.2) rotate(4deg); }
    100% { transform: scale(1) rotate(0deg); opacity:1; }
  }
  @keyframes dw-fire {
    0%,100% { transform: scaleY(1) translateY(0); }
    50%     { transform: scaleY(1.15) translateY(-2px); }
  }

  .dw {
    background: linear-gradient(135deg, rgba(108,92,231,.12), rgba(162,155,254,.06));
    border: 1px solid rgba(162,155,254,.2);
    border-radius: 18px; padding: 16px 18px;
    margin-bottom: 18px;
    animation: dw-enter .4s cubic-bezier(.34,1.2,.64,1);
  }

  /* ── TOP ROW: streak + saludo ── */
  .dw-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }

  .dw-greeting { flex: 1; min-width: 0; }
  .dw-greeting-title { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -.2px; }
  .dw-greeting-sub   { font-size: 11px; color: rgba(255,255,255,.38); margin-top: 2px; }

  .dw-streak {
    display: flex; flex-direction: column; align-items: center;
    background: rgba(254,202,87,.1); border: 1px solid rgba(254,202,87,.25);
    border-radius: 12px; padding: 8px 12px; min-width: 56px;
    cursor: default; flex-shrink: 0;
    animation: dw-streak-pop .5s cubic-bezier(.34,1.56,.64,1) .2s both;
  }
  .dw-streak-fire {
    font-size: 20px; line-height: 1;
    animation: dw-fire 1.8s ease-in-out infinite;
    display: inline-block;
  }
  .dw-streak-num  { font-size: 20px; font-weight: 900; color: #FECA57; line-height: 1; margin-top: 1px; }
  .dw-streak-lbl  { font-size: 8px; font-weight: 700; color: rgba(254,202,87,.6);
    text-transform: uppercase; letter-spacing: .5px; margin-top: 1px; }

  /* ── META BARRA ── */
  .dw-meta-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px; }
  .dw-meta-label { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.5); }
  .dw-meta-count { font-size: 11px; font-weight: 700; color: #a29bfe; }

  .dw-bar-track {
    height: 8px; background: rgba(255,255,255,.07);
    border-radius: 99px; overflow: hidden; margin-bottom: 12px;
    position: relative;
  }
  .dw-bar-fill {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #6C5CE7, #55EFC4);
    animation: dw-bar-fill .8s cubic-bezier(.34,1.2,.64,1) .3s both;
    width: var(--dw-pct);
    transition: width .4s cubic-bezier(.34,1.2,.64,1);
    position: relative; overflow: hidden;
  }
  /* Shimmer corriendo sobre la barra */
  .dw-bar-fill::after {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.35), transparent);
    animation: dw-bar-fill 2s ease 1s infinite;
    width: 50%; background-size: 200% 100%;
  }
  .dw-bar-fill.done {
    background: linear-gradient(90deg, #55EFC4, #00b894);
  }

  /* ── RESUMEN DE MATERIAS ESTUDIADAS HOY ── */
  .dw-materias { display: flex; flex-direction: column; gap: 5px; }
  .dw-materia-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 10px; background: rgba(255,255,255,.04);
    border-radius: 9px;
    animation: dw-enter .3s ease both;
  }
  .dw-materia-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #6C5CE7, #a29bfe); }
  .dw-materia-nombre { flex: 1; font-size: 12px; font-weight: 600; color: rgba(255,255,255,.75);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dw-materia-temas { font-size: 11px; color: rgba(255,255,255,.35); font-weight: 600; flex-shrink: 0; }

  .dw-empty-hint {
    font-size: 12px; color: rgba(255,255,255,.28); text-align: center;
    padding: 8px 0; font-style: italic;
  }

  /* ── EDITAR META ── */
  .dw-footer { display: flex; align-items: center; justify-content: flex-end;
    margin-top: 10px; gap: 6px; }
  .dw-meta-edit { display: flex; align-items: center; gap: 5px; }
  .dw-meta-lbl  { font-size: 10px; color: rgba(255,255,255,.28); font-weight: 600; }
  .dw-meta-btn  {
    width: 22px; height: 22px; border-radius: 6px;
    background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.5); cursor: pointer; font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s, transform .1s;
    -webkit-tap-highlight-color: transparent;
  }
  .dw-meta-btn:hover { background: rgba(255,255,255,.14); }
  .dw-meta-btn:active { transform: scale(.88); }
  .dw-meta-val { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.55); min-width: 20px; text-align: center; }

  /* ── COMPLETADO ── */
  .dw-done-badge {
    text-align: center; padding: 10px;
    background: rgba(85,239,196,.08); border-radius: 10px;
    border: 1px solid rgba(85,239,196,.2);
    font-size: 12px; color: #55EFC4; font-weight: 700;
  }

  @media (min-width: 720px) {
    .dw { padding: 20px 22px; }
    .dw-greeting-title { font-size: 16px; }
  }
`;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "¡Buenos días! 🌅";
  if (h < 19) return "¡Buenas tardes! ☀️";
  return "¡Buenas noches! 🌙";
}

function formatFecha(): string {
  return new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" });
}

export function DailyWidget() {
  const { metaDiaria, setMetaDiaria, getHoy, getStreak } = useSesionStore();

  // Los selectores son funciones — las llamamos directamente.
  // No es necesario subscribirse al store para valores que no cambian durante el render.
  const sesionHoy = getHoy();
  const streak    = getStreak();
  const temasHoy  = sesionHoy?.temas_count ?? 0;
  const pct       = Math.min(100, Math.round((temasHoy / metaDiaria) * 100));
  const done      = pct >= 100;

  return (
    <>
      <style>{CSS}</style>
      <div className="dw">

        {/* TOP: saludo + streak */}
        <div className="dw-top">
          <div className="dw-greeting">
            <div className="dw-greeting-title">{getGreeting()}</div>
            <div className="dw-greeting-sub">{formatFecha()}</div>
          </div>

          <div className="dw-streak">
            <span className="dw-streak-fire">🔥</span>
            <span className="dw-streak-num">{streak}</span>
            <span className="dw-streak-lbl">{streak === 1 ? "día" : "días"}</span>
          </div>
        </div>

        {/* Barra de meta */}
        <div className="dw-meta-row">
          <span className="dw-meta-label">Meta del día</span>
          <span className="dw-meta-count">{temasHoy} / {metaDiaria} temas</span>
        </div>
        <div className="dw-bar-track">
          <div
            className={`dw-bar-fill${done ? " done" : ""}`}
            style={{ "--dw-pct": `${pct}%` } as React.CSSProperties}
          />
        </div>

        {/* Badge de meta cumplida */}
        {done && (
          <div className="dw-done-badge">
            🎉 ¡Meta del día cumplida! Estudiaste {temasHoy} temas hoy.
          </div>
        )}

        {/* Resumen de materias estudiadas hoy */}
        {!done && sesionHoy?.materias && sesionHoy.materias.length > 0 && (
          <div className="dw-materias">
            {sesionHoy.materias.map((m) => (
              <div key={m.materia_id} className="dw-materia-item">
                <div className="dw-materia-dot" />
                <span className="dw-materia-nombre">{m.nombre}</span>
                <span className="dw-materia-temas">{m.temas_count} tema{m.temas_count !== 1 ? "s" : ""}</span>
              </div>
            ))}
          </div>
        )}

        {!done && !sesionHoy && (
          <div className="dw-empty-hint">Marcá un tema para arrancar el día 🚀</div>
        )}

        {/* Controles de meta */}
        <div className="dw-footer">
          <div className="dw-meta-edit">
            <span className="dw-meta-lbl">Meta:</span>
            <button className="dw-meta-btn" onClick={() => setMetaDiaria(metaDiaria - 1)}>−</button>
            <span className="dw-meta-val">{metaDiaria}</span>
            <button className="dw-meta-btn" onClick={() => setMetaDiaria(metaDiaria + 1)}>+</button>
          </div>
        </div>
      </div>
    </>
  );
}
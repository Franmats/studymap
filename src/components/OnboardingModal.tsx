// OnboardingModal — se muestra una sola vez a usuarios nuevos (sin materias).
// Usa localStorage para recordar que ya fue visto.
// Tres pasos animados que explican el flujo principal.
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

const STORAGE_KEY = "studymap-onboarding-done-v1";

const PASOS = [
  {
    emoji: "🗺️",
    titulo: "Bienvenido a StudyMap AI",
    desc: "Tu organizador de estudio inteligente. En 3 pasos te explicamos cómo funciona.",
    detalle: null,
  },
  {
    emoji: "📄",
    titulo: "Subí tu programa",
    desc: "Tomá una foto o subí el PDF del programa de tu materia. La IA lo lee y arma un roadmap con todas las unidades y temas.",
    detalle: "Funciona con cualquier formato: Word, PDF, imagen del celular.",
  },
  {
    emoji: "✅",
    titulo: "Tachá temas a medida que estudias",
    desc: "Entrá al roadmap de cada materia y marcá los temas completados. El progreso se guarda automáticamente.",
    detalle: "Podés agregar notas por tema y ver estadísticas de avance.",
  },
  {
    emoji: "📅",
    titulo: "Organizá tus exámenes",
    desc: "Cargá las fechas de tus parciales y finales. La app te avisa cuando se acercan.",
    detalle: "También registra tu racha diaria para mantener el ritmo de estudio.",
  },
];

const CSS = `
  @keyframes ob-bg   { from{opacity:0} to{opacity:1} }
  @keyframes ob-card { from{opacity:0;transform:translateY(24px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
  @keyframes ob-step { from{opacity:0;transform:translateX(20px)} to{opacity:1;transform:translateX(0)} }
  @keyframes ob-emoji { from{transform:scale(.5) rotate(-15deg);opacity:0} to{transform:scale(1) rotate(0deg);opacity:1} }

  .ob-overlay {
    position:fixed; inset:0; z-index:1000;
    background:rgba(0,0,0,.75); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center;
    padding:20px;
    animation:ob-bg .3s ease;
  }

  .ob-card {
    background:linear-gradient(160deg,#1a1535 0%,#0f0c29 100%);
    border:1px solid rgba(255,255,255,.1);
    border-radius:24px; padding:32px 28px 24px;
    width:100%; max-width:420px;
    box-shadow:0 24px 64px rgba(0,0,0,.7);
    animation:ob-card .35s cubic-bezier(.34,1.2,.64,1);
    position:relative; overflow:hidden;
  }
  /* Glow de fondo */
  .ob-card::before {
    content:''; position:absolute; width:280px; height:280px;
    background:radial-gradient(circle,rgba(108,92,231,.25) 0%,transparent 70%);
    top:-80px; right:-60px; pointer-events:none;
  }

  .ob-step-content { animation:ob-step .25s ease; }

  .ob-emoji {
    font-size:56px; text-align:center; margin-bottom:18px; display:block;
    animation:ob-emoji .4s cubic-bezier(.34,1.56,.64,1);
  }
  .ob-titulo {
    font-size:20px; font-weight:900; color:#fff; text-align:center;
    letter-spacing:-.4px; margin-bottom:10px; line-height:1.25;
  }
  .ob-desc {
    font-size:14px; color:rgba(255,255,255,.6); text-align:center;
    line-height:1.6; margin-bottom:10px;
  }
  .ob-detalle {
    font-size:12px; color:rgba(255,255,255,.35); text-align:center;
    line-height:1.5; padding:8px 12px;
    background:rgba(255,255,255,.04); border-radius:10px;
    border:1px solid rgba(255,255,255,.07);
    margin-bottom:4px;
  }

  /* Dots de paginación */
  .ob-dots { display:flex; justify-content:center; gap:7px; margin:20px 0 18px; }
  .ob-dot {
    width:7px; height:7px; border-radius:50%;
    background:rgba(255,255,255,.18);
    transition:all .25s; cursor:pointer;
  }
  .ob-dot.active { background:#6C5CE7; width:20px; border-radius:4px; }

  /* Botones */
  .ob-actions { display:flex; gap:10px; }
  .ob-btn-skip {
    flex:1; background:rgba(255,255,255,.07);
    border:1px solid rgba(255,255,255,.1); color:rgba(255,255,255,.45);
    padding:12px; border-radius:12px; cursor:pointer;
    font-size:13px; font-weight:600;
    transition:all .15s; -webkit-tap-highlight-color:transparent;
  }
  .ob-btn-skip:hover { background:rgba(255,255,255,.12); color:rgba(255,255,255,.7); }

  .ob-btn-next {
    flex:2; background:linear-gradient(135deg,#6C5CE7,#a29bfe);
    border:none; color:#fff; padding:12px; border-radius:12px;
    cursor:pointer; font-size:14px; font-weight:800;
    box-shadow:0 4px 16px rgba(108,92,231,.5);
    transition:transform .15s, box-shadow .15s;
    -webkit-tap-highlight-color:transparent;
  }
  .ob-btn-next:hover { transform:translateY(-1px); box-shadow:0 6px 20px rgba(108,92,231,.6); }
  .ob-btn-next:active { transform:scale(.97); }

  /* Paso final — botón full width */
  .ob-btn-final {
    width:100%; background:linear-gradient(135deg,#6C5CE7,#55EFC4);
    border:none; color:#fff; padding:14px; border-radius:14px;
    cursor:pointer; font-size:15px; font-weight:800;
    box-shadow:0 6px 20px rgba(108,92,231,.4);
    transition:transform .15s;
    -webkit-tap-highlight-color:transparent;
  }
  .ob-btn-final:hover { transform:translateY(-1px); }
  .ob-btn-final:active { transform:scale(.97); }
`;

export function OnboardingModal({ onDone }: { onDone: () => void }) {
  const [paso, setPaso] = useState(0);
  const [key,  setKey]  = useState(0); // para re-triggear la animación del step

  const ir = (n: number) => { setPaso(n); setKey(k => k + 1); };
  const siguiente = () => paso < PASOS.length - 1 ? ir(paso + 1) : cerrar();

  const cerrar = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onDone();
  };

  const p = PASOS[paso];
  const esUltimo = paso === PASOS.length - 1;

  return createPortal(
    <>
      <style>{CSS}</style>
      <div className="ob-overlay" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}>
        <div className="ob-card">

          <div className="ob-step-content" key={key}>
            <span className="ob-emoji">{p.emoji}</span>
            <div className="ob-titulo">{p.titulo}</div>
            <div className="ob-desc">{p.desc}</div>
            {p.detalle && <div className="ob-detalle">💡 {p.detalle}</div>}
          </div>

          {/* Dots */}
          <div className="ob-dots">
            {PASOS.map((_, i) => (
              <div key={i} className={`ob-dot${i === paso ? " active" : ""}`} onClick={() => ir(i)} />
            ))}
          </div>

          {/* Acciones */}
          {esUltimo ? (
            <button className="ob-btn-final" onClick={cerrar}>
              ¡Empezar a estudiar! 🚀
            </button>
          ) : (
            <div className="ob-actions">
              <button className="ob-btn-skip" onClick={cerrar}>Saltar</button>
              <button className="ob-btn-next" onClick={siguiente}>
                {paso === 0 ? "Ver cómo funciona →" : "Siguiente →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// Hook: retorna true si hay que mostrar el onboarding
export function useOnboarding(materias: { id: string }[]) {
  const [mostrar, setMostrar] = useState(false);

  useEffect(() => {
    // Solo mostrar si: nunca visto Y sin materias todavía
    const yaVisto = localStorage.getItem(STORAGE_KEY);
    if (!yaVisto && materias.length === 0) {
      // Pequeño delay para que la app cargue primero
      const t = setTimeout(() => setMostrar(true), 800);
      return () => clearTimeout(t);
    }
  }, [materias.length]);

  const cerrar = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setMostrar(false);
  };

  return { mostrar, cerrar };
}
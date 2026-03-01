// Selector de etiqueta — usa ReactDOM.createPortal para evitar que
// el overflow:hidden del MateriaItem corte el dropdown.
// El dropdown se renderiza en document.body y se posiciona con getBoundingClientRect.
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const ETIQUETAS_COMUNES = [
  "1er cuatrimestre", "2do cuatrimestre", "Anual",
  "Cursando", "Rendida", "Libre",
];

const CSS = `
  @keyframes etq-drop {
    from { opacity:0; transform:translateY(-6px) scale(.97); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }

  .etq-btn {
    display:inline-flex; align-items:center; gap:4px;
    padding:3px 9px; border-radius:20px; font-size:10px; font-weight:700;
    cursor:pointer; border:1px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.06); color:rgba(255,255,255,.45);
    transition:all .15s; -webkit-tap-highlight-color:transparent;
    white-space:nowrap; user-select:none;
  }
  .etq-btn:hover { background:rgba(255,255,255,.12); color:rgba(255,255,255,.8); }
  .etq-btn.has-etq { background:rgba(108,92,231,.2); border-color:rgba(108,92,231,.5); color:#a29bfe; }

  /* El dropdown vive en el portal — posición fija via JS */
  .etq-portal {
    position:fixed; z-index:9999;
    background:#1a1535; border:1px solid rgba(255,255,255,.14);
    border-radius:14px; padding:6px; min-width:190px;
    box-shadow:0 12px 32px rgba(0,0,0,.6);
    animation:etq-drop .18s ease;
  }

  .etq-option {
    padding:8px 12px; border-radius:9px; font-size:12px; font-weight:600;
    color:rgba(255,255,255,.65); cursor:pointer;
    transition:background .12s, color .12s;
    -webkit-tap-highlight-color:transparent;
  }
  .etq-option:hover  { background:rgba(255,255,255,.08); color:#fff; }
  .etq-option.active { color:#a29bfe; background:rgba(108,92,231,.18); }
  .etq-option.danger { color:rgba(255,107,107,.7); }
  .etq-option.danger:hover { background:rgba(255,107,107,.1); color:#FF6B6B; }

  .etq-divider { height:1px; background:rgba(255,255,255,.07); margin:4px 0; }

  .etq-custom-row { display:flex; gap:6px; padding:4px 8px 6px; }
  .etq-custom-input {
    flex:1; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12);
    border-radius:8px; padding:7px 10px; color:#fff; font-size:11px;
    outline:none; font-family:inherit; min-width:0;
  }
  .etq-custom-input:focus { border-color:#6C5CE7; background:rgba(108,92,231,.1); }
  .etq-custom-input::placeholder { color:rgba(255,255,255,.22); }
  .etq-custom-btn {
    background:rgba(108,92,231,.3); border:1px solid rgba(108,92,231,.5);
    color:#a29bfe; border-radius:8px; padding:6px 11px;
    cursor:pointer; font-size:13px; font-weight:700;
    -webkit-tap-highlight-color:transparent; flex-shrink:0;
    transition:background .15s;
  }
  .etq-custom-btn:hover { background:rgba(108,92,231,.5); }
`;

interface Props {
  etiqueta: string | null;
  onChange: (e: string | null) => void;
}

export function EtiquetaSelector({ etiqueta, onChange }: Props) {
  const [open,   setOpen]   = useState(false);
  const [custom, setCustom] = useState("");
  const [pos,    setPos]    = useState({ top: 0, left: 0 });

  const btnRef     = useRef<HTMLDivElement>(null);
  const portalRef  = useRef<HTMLDivElement>(null);

  // Recalcular posición cada vez que se abre
  const openDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (open) { setOpen(false); return; }

    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const DROPDOWN_H = 300; // estimado
      const spaceBelow = window.innerHeight - rect.bottom;

      // Si no hay espacio abajo, lo abrimos arriba
      const top = spaceBelow > DROPDOWN_H
        ? rect.bottom + 6
        : rect.top - DROPDOWN_H - 6;

      setPos({ top, left: rect.left });
    }
    setOpen(true);
  };

  // Cerrar al clickear fuera (el portal está en body)
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inBtn    = btnRef.current?.contains(target);
      const inPortal = portalRef.current?.contains(target);
      if (!inBtn && !inPortal) setOpen(false);
    };
    // Usamos capture para capturar antes de stopPropagation de los padres
    document.addEventListener("mousedown", handler, true);
    return () => document.removeEventListener("mousedown", handler, true);
  }, [open]);

  // Cerrar en scroll (la posición quedaría desincronizada)
  useEffect(() => {
    if (!open) return;
    const handler = () => setOpen(false);
    window.addEventListener("scroll", handler, true);
    return () => window.removeEventListener("scroll", handler, true);
  }, [open]);

  const select = (val: string | null) => {
    onChange(val);
    setOpen(false);
    setCustom("");
  };

  const dropdown = open ? (
    <div
      ref={portalRef}
      className="etq-portal"
      style={{ top: pos.top, left: pos.left }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {ETIQUETAS_COMUNES.map((opt) => (
        <div
          key={opt}
          className={`etq-option${etiqueta === opt ? " active" : ""}`}
          onClick={() => select(opt)}
        >
          {etiqueta === opt ? "✓ " : ""}{opt}
        </div>
      ))}

      {/* Etiqueta personalizada activa no en la lista */}
      {etiqueta && !ETIQUETAS_COMUNES.includes(etiqueta) && (
        <div className="etq-option active">✓ {etiqueta}</div>
      )}

      <div className="etq-divider" />

      <div className="etq-custom-row">
        <input
          className="etq-custom-input"
          placeholder="Nueva etiqueta…"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && custom.trim()) select(custom.trim()); }}
          autoFocus
        />
        <button
          className="etq-custom-btn"
          onClick={() => { if (custom.trim()) select(custom.trim()); }}
        >+</button>
      </div>

      {etiqueta && (
        <>
          <div className="etq-divider" />
          <div className="etq-option danger" onClick={() => select(null)}>
            × Quitar etiqueta
          </div>
        </>
      )}
    </div>
  ) : null;

  return (
    <>
      <style>{CSS}</style>

      <div
        ref={btnRef}
        className={`etq-btn${etiqueta ? " has-etq" : ""}`}
        onClick={openDropdown}
      >
        🏷 {etiqueta ?? "Etiqueta"}
      </div>

      {/* Portal: se renderiza en body, fuera de cualquier overflow:hidden */}
      {createPortal(dropdown, document.body)}
    </>
  );
}
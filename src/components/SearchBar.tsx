// SearchBar + filtros por etiqueta/cuatrimestre
import {  useRef } from "react";

const CSS = `
  @keyframes sb-enter { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }

  .sb-wrap { margin-bottom:14px; animation:sb-enter .3s ease; }

  .sb-input-row { display:flex; gap:8px; align-items:center; margin-bottom:10px; }
  .sb-input-wrap { flex:1; position:relative; }
  .sb-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%);
    font-size:14px; pointer-events:none; }
  .sb-input {
    width:100%; background:rgba(255,255,255,.07);
    border:1px solid rgba(255,255,255,.1); border-radius:12px;
    padding:10px 12px 10px 36px; color:#fff; font-size:13px;
    outline:none; transition:border-color .2s, background .2s;
    box-sizing:border-box; font-family:inherit;
  }
  .sb-input:focus { border-color:#6C5CE7; background:rgba(255,255,255,.09); }
  .sb-input::placeholder { color:rgba(255,255,255,.25); }
  .sb-clear {
    position:absolute; right:10px; top:50%; transform:translateY(-50%);
    background:none; border:none; color:rgba(255,255,255,.3); cursor:pointer;
    font-size:16px; padding:2px; line-height:1;
    transition:color .15s; -webkit-tap-highlight-color:transparent;
  }
  .sb-clear:hover { color:rgba(255,255,255,.7); }

  /* Chips de etiquetas */
  .sb-chips { display:flex; gap:6px; flex-wrap:wrap; }
  .sb-chip {
    padding:5px 12px; border-radius:20px; font-size:11px; font-weight:700;
    cursor:pointer; border:1px solid rgba(255,255,255,.1);
    background:rgba(255,255,255,.05); color:rgba(255,255,255,.5);
    transition:all .15s; -webkit-tap-highlight-color:transparent;
    white-space:nowrap;
  }
  .sb-chip:hover { background:rgba(255,255,255,.1); color:rgba(255,255,255,.8); }
  .sb-chip.active { background:rgba(108,92,231,.3); border-color:#6C5CE7; color:#a29bfe; }
  .sb-chip.all.active { background:rgba(162,155,254,.15); border-color:#a29bfe; }
`;

interface Props {
  query:          string;
  onQueryChange:  (q: string) => void;
  etiquetas:      string[];          // etiquetas disponibles en las materias
  etiquetaActiva: string | null;
  onEtiqueta:     (e: string | null) => void;
}

export function SearchBar({ query, onQueryChange, etiquetas, etiquetaActiva, onEtiqueta }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <style>{CSS}</style>
      <div className="sb-wrap">
        <div className="sb-input-row">
          <div className="sb-input-wrap">
            <span className="sb-icon">🔍</span>
            <input
              ref={inputRef}
              className="sb-input"
              placeholder="Buscar materia o tema…"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
            />
            {query && (
              <button className="sb-clear" onClick={() => { onQueryChange(""); inputRef.current?.focus(); }}>×</button>
            )}
          </div>
        </div>

        {/* Chips de cuatrimestre/etiqueta */}
        {etiquetas.length > 0 && (
          <div className="sb-chips">
            <div
              className={`sb-chip all${!etiquetaActiva ? " active" : ""}`}
              onClick={() => onEtiqueta(null)}
            >Todas</div>
            {etiquetas.map((e) => (
              <div
                key={e}
                className={`sb-chip${etiquetaActiva === e ? " active" : ""}`}
                onClick={() => onEtiqueta(etiquetaActiva === e ? null : e)}
              >{e}</div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
// NotasPanel — notas por tema dentro de UnitCard
// Guarda en Supabase via updateProgress (las notas viven en units_json)
import { useState } from "react";

const CSS = `
  @keyframes np-enter { from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)} }

  .np { margin-top:8px; animation:np-enter .2s ease; }

  .np-toggle {
    display:inline-flex; align-items:center; gap:5px;
    font-size:10px; font-weight:700; color:rgba(0,0,0,.4);
    background:none; border:none; cursor:pointer; padding:0;
    -webkit-tap-highlight-color:transparent;
    transition:color .15s;
  }
  .np-toggle:hover { color:rgba(0,0,0,.7); }
  .np-toggle.has-nota { color:#6C5CE7; }

  .np-body { margin-top:7px; }
  .np-textarea {
    width:100%; background:rgba(108,92,231,.06);
    border:1px solid rgba(108,92,231,.2); border-radius:10px;
    padding:9px 12px; font-size:12px; color:#333;
    outline:none; resize:none; font-family:inherit; line-height:1.5;
    transition:border-color .2s; box-sizing:border-box;
  }
  .np-textarea:focus { border-color:#6C5CE7; background:rgba(108,92,231,.09); }
  .np-textarea::placeholder { color:#bbb; }

  .np-actions { display:flex; justify-content:flex-end; gap:6px; margin-top:6px; }
  .np-btn {
    padding:5px 12px; border-radius:8px; font-size:11px; font-weight:700;
    cursor:pointer; border:none; transition:all .15s;
    -webkit-tap-highlight-color:transparent;
  }
  .np-btn-cancel { background:#f0f0f0; color:#888; }
  .np-btn-cancel:hover { background:#e0e0e0; }
  .np-btn-save { background:linear-gradient(135deg,#6C5CE7,#a29bfe); color:#fff; }
  .np-btn-save:hover { opacity:.9; }
  .np-btn-save:disabled { opacity:.5; cursor:not-allowed; }

  .np-preview {
    margin-top:6px; padding:8px 11px;
    background:rgba(108,92,231,.06); border-radius:9px;
    border-left:3px solid rgba(108,92,231,.4);
    font-size:11px; color:#555; line-height:1.5;
    white-space:pre-wrap; cursor:pointer;
    transition:background .15s;
  }
  .np-preview:hover { background:rgba(108,92,231,.1); }
`;

interface Props {
  nota:     string;           // nota actual para este tema
  onSave:   (nota: string) => Promise<void>;
}

export function NotasPanel({ nota, onSave }: Props) {
  const [open,    setOpen]    = useState(false);
  const [texto,   setTexto]   = useState(nota);
  const [saving,  setSaving]  = useState(false);

  const hasNota = nota.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    await onSave(texto.trim());
    setSaving(false);
    setOpen(false);
  };

  const handleCancel = () => {
    setTexto(nota);
    setOpen(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="np">
        {/* Toggle */}
        <button
          className={`np-toggle${hasNota ? " has-nota" : ""}`}
          onClick={() => { setTexto(nota); setOpen((o) => !o); }}
        >
          {hasNota ? "📝 Ver nota" : "＋ Agregar nota"}
        </button>

        {/* Editor */}
        {open && (
          <div className="np-body">
            <textarea
              className="np-textarea"
              placeholder="Apuntes, fórmulas, links útiles…"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={3}
              autoFocus
            />
            <div className="np-actions">
              <button className="np-btn np-btn-cancel" onClick={handleCancel}>Cancelar</button>
              <button
                className="np-btn np-btn-save"
                onClick={handleSave}
                disabled={saving || texto.trim() === nota.trim()}
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        )}

        {/* Preview cuando está cerrado y tiene nota */}
        {!open && hasNota && (
          <div className="np-preview" onClick={() => { setTexto(nota); setOpen(true); }}>
            {nota}
          </div>
        )}
      </div>
    </>
  );
}
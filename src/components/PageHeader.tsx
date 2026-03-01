// PageHeader — barra superior contextual dentro del área de contenido.
// En mobile es el único header. En desktop vive a la derecha de la sidebar,
// mostrando el contexto de la vista actual + acciones relevantes.
import { useAppStore } from "../store";

const CSS = `
  .phdr {
    position: sticky; top: 0; z-index: 40;
    background: rgba(12,10,35,.88);
    backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,.07);
    padding: 10px 14px;
    display: flex; align-items: center; gap: 10px;
  }

  /* En desktop, el header solo ocupa el área del contenido (no la sidebar) */
  @media (min-width: 720px) {
    .phdr {
      padding: 14px 28px;
    }
    /* El logo se oculta en desktop (ya está en la sidebar) */
    .phdr-logo { display: none !important; }
  }

  .phdr-logo {
    width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }

  .phdr-info { min-width: 0; flex: 1; }
  .phdr-title { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -.3px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .phdr-sub { font-size: 10px; color: rgba(255,255,255,.3); margin-top: 1px; }

  .phdr-actions { margin-left: auto; display: flex; gap: 7px; align-items: center; flex-shrink: 0; }

  .save-badge { font-size: 11px; font-weight: 600; padding: 3px 9px; border-radius: 20px;
    white-space: nowrap; background: rgba(85,239,196,.12); color: #55EFC4; }
  .save-badge.saving { color: #a29bfe; background: rgba(162,155,254,.12); animation: pulse 1.2s infinite; }

  .phdr-btn { display: inline-flex; align-items: center; gap: 5px; border: none;
    border-radius: 10px; cursor: pointer; font-weight: 700; font-size: 13px;
    transition: transform .15s; white-space: nowrap; padding: 8px 14px;
    -webkit-tap-highlight-color: transparent; }
  .phdr-btn:active { transform: scale(.95); }
  .phdr-btn:disabled { opacity: .55; cursor: not-allowed; }
  .phdr-btn-back   { background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.13)!important; color: rgba(255,255,255,.8); }
  .phdr-btn-pdf    { background: linear-gradient(135deg,#FF6B6B,#FF9F43); color: #fff; box-shadow: 0 3px 12px #FF6B6B44; }
  .phdr-btn-new    { background: linear-gradient(135deg,#6C5CE7,#a29bfe); color: #fff; box-shadow: 0 3px 12px #6C5CE755; }

  .phdr-spinner { width: 12px; height: 12px; flex-shrink: 0;
    border: 2px solid rgba(255,255,255,.25); border-top-color: #fff;
    border-radius: 50%; animation: spin .8s linear infinite; }

  @media (min-width: 720px) {
    .phdr-btn { padding: 9px 18px; }
    .phdr-title { font-size: 18px; }
  }
`;

// Títulos y subtítulos por vista
const VIEW_META: Record<string, { title: string; sub: string }> = {
  list:     { title: "Mis Materias",  sub: "El progreso se guarda automáticamente ☁️" },
  upload:   { title: "Nueva materia", sub: "Subí el programa y la IA lo organiza" },
  calendar: { title: "Calendario",    sub: "Tus fechas de exámenes" },
  roadmap:  { title: "",              sub: "" }, // dinámico — se sobreescribe con props
};

interface Props {
  onGoToList:    () => void;
  onUpload:      () => void;
  onExportPDF:   () => void;
  exportingPDF:  boolean;
  saveStatus:    "saving" | "saved" | null;
  // Para el roadmap: título dinámico
  roadmapTitle?: string;
}

export function PageHeader({
  onGoToList, onUpload, onExportPDF, exportingPDF, saveStatus, roadmapTitle,
}: Props) {
  const view = useAppStore((s) => s.view);

  const meta = view === "roadmap" && roadmapTitle
    ? { title: roadmapTitle, sub: "Roadmap de la materia" }
    : (VIEW_META[view] ?? VIEW_META.list);

  return (
    <>
      <style>{CSS}</style>
      <header className="phdr">

        {/* Logo — solo visible en mobile */}
        <div className="phdr-logo" onClick={onGoToList}>🗺️</div>

        {/* Título dinámico */}
        <div className="phdr-info">
          <div className="phdr-title">{meta.title}</div>
          {meta.sub && <div className="phdr-sub">{meta.sub}</div>}
        </div>

        {/* Acciones contextuales */}
        <div className="phdr-actions">
          {saveStatus && (
            <span className={`save-badge${saveStatus === "saving" ? " saving" : ""}`}>
              {saveStatus === "saving" ? "Guardando…" : "✓ Listo"}
            </span>
          )}

          {view === "roadmap" && (
            <button className="phdr-btn phdr-btn-pdf" onClick={onExportPDF} disabled={exportingPDF}>
              {exportingPDF
                ? <><span className="phdr-spinner"/>PDF</>
                : <>📥 PDF</>}
            </button>
          )}

          {/* Volver — en mobile para roadmap/upload/calendar; en desktop solo roadmap/upload */}
          {(view === "roadmap" || view === "upload") && (
            <button className="phdr-btn phdr-btn-back" onClick={onGoToList}>← Volver</button>
          )}

          {/* "Volver" en desktop para el calendario (en mobile lo maneja la sidebar) */}
          {view === "calendar" && (
            <button className="phdr-btn phdr-btn-back"
              style={{ display: "none" }} // se muestra solo en mobile via clase
              onClick={onGoToList}
            >← Volver</button>
          )}

          {view === "list" && (
            <button className="phdr-btn phdr-btn-new" onClick={onUpload}>+ Nueva</button>
          )}
        </div>
      </header>
    </>
  );
}
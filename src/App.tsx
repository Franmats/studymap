import { useState, useRef, useCallback } from "react";
import type { Syllabus, Unidad, MateriaRow, UnitStatus } from "./types";
import { analyzeSyllabus } from "./lib/anthropic";
import { useProgress } from "./hooks/useProgress";
import { exportToPDF } from "./lib/exportPDF";
import { UnitCard } from "./components/UnitCard";
import { MateriaItem } from "./components/MateriaItem";

const COLORS = [
  { bg: "#FF6B6B", light: "#FFE5E5", text: "#8B0000" },
  { bg: "#FF9F43", light: "#FFF0DC", text: "#7A4100" },
  { bg: "#FECA57", light: "#FFFACC", text: "#6B5B00" },
  { bg: "#48CAE4", light: "#DCF5FA", text: "#004E6B" },
  { bg: "#6C5CE7", light: "#EAE6FF", text: "#2D1B8B" },
  { bg: "#A29BFE", light: "#F0EEFF", text: "#2D1B8B" },
  { bg: "#55EFC4", light: "#DFFAF4", text: "#005E3F" },
  { bg: "#FD79A8", light: "#FFE5F1", text: "#7B0038" },
];

const STATUS_CONFIG = {
  pending:     { label: "Pendiente",   color: "#adb5bd" },
  in_progress: { label: "En progreso", color: "#FF9F43" },
  done:        { label: "Completado",  color: "#55EFC4" },
} as const;

type View = "list" | "upload" | "roadmap";
type SaveStatus = "saving" | "saved" | null;

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse   { 0%,100% { opacity:1; } 50% { opacity:.45; } }

  html, body { margin:0; padding:0; }

  .app {
    min-height: 100vh;
    background: linear-gradient(150deg, #0f0c29 0%, #302b63 55%, #1a1040 100%);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    padding-bottom: 90px;
  }

  /* ── HEADER ─────────────────────────────────────── */
  .hdr {
    position: sticky; top: 0; z-index: 50;
    background: rgba(12,10,35,.88);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    border-bottom: 1px solid rgba(255,255,255,.07);
    padding: 10px 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .hdr-logo {
    width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    display: flex; align-items: center; justify-content: center;
    font-size: 19px; cursor: pointer; box-shadow: 0 3px 10px #6C5CE766;
    -webkit-tap-highlight-color: transparent;
  }
  .hdr-info { cursor: pointer; min-width: 0; }
  .hdr-title { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -.3px; white-space: nowrap; }
  .hdr-title span { color: #a29bfe; }
  .hdr-sub { font-size: 10px; color: rgba(255,255,255,.3); margin-top:1px; }
  .hdr-actions { margin-left: auto; display: flex; gap: 7px; align-items: center; flex-shrink: 0; }

  /* save badge */
  .save-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:20px;
    white-space:nowrap; background:rgba(85,239,196,.12); color:#55EFC4; }
  .save-badge.saving { color:#a29bfe; background:rgba(162,155,254,.12); animation:pulse 1.2s infinite; }

  /* buttons */
  .btn { display:inline-flex; align-items:center; gap:5px; border:none; border-radius:10px;
    cursor:pointer; font-weight:700; transition:transform .15s,opacity .15s; white-space:nowrap;
    -webkit-tap-highlight-color:transparent; }
  .btn:active { transform:scale(.95); }
  .btn-primary { background:linear-gradient(135deg,#6C5CE7,#a29bfe); color:#fff;
    padding:8px 14px; font-size:13px; box-shadow:0 3px 12px #6C5CE755; }
  .btn-ghost { background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.13)!important;
    color:rgba(255,255,255,.8); padding:8px 13px; font-size:13px; }
  .btn-pdf { background:linear-gradient(135deg,#FF6B6B,#FF9F43); color:#fff;
    padding:8px 14px; font-size:13px; box-shadow:0 3px 12px #FF6B6B44; }
  .btn:disabled { opacity:.55; cursor:not-allowed; }
  .spinner { width:12px; height:12px; flex-shrink:0;
    border:2px solid rgba(255,255,255,.25); border-top-color:#fff;
    border-radius:50%; animation:spin .8s linear infinite; }

  /* ── PAGE WRAPPER ────────────────────────────────── */
  .page { max-width:660px; margin:0 auto; padding:18px 14px 0; animation:fadeUp .25s ease; }

  /* ── LIST VIEW ───────────────────────────────────── */
  .list-hdr { margin-bottom:18px; }
  .list-title { font-size:21px; font-weight:900; color:#fff; letter-spacing:-.4px; }
  .list-sub { font-size:12px; color:rgba(255,255,255,.32); margin-top:3px; }
  .materias-list { display:flex; flex-direction:column; gap:9px; }

  .empty-box { text-align:center; padding:44px 20px;
    background:rgba(255,255,255,.025); border-radius:20px;
    border:2px dashed rgba(255,255,255,.09); }
  .empty-icon { font-size:44px; margin-bottom:12px; }
  .empty-title { font-size:16px; font-weight:700; color:#fff; margin-bottom:5px; }
  .empty-desc { font-size:13px; color:rgba(255,255,255,.38); margin-bottom:20px; line-height:1.5; }
  .btn-pill { display:inline-flex; align-items:center; gap:7px;
    background:linear-gradient(135deg,#6C5CE7,#a29bfe); color:#fff;
    padding:13px 26px; border-radius:50px; border:none; cursor:pointer;
    font-size:14px; font-weight:700; box-shadow:0 5px 18px #6C5CE766;
    -webkit-tap-highlight-color:transparent; }
  .btn-pill:active { transform:scale(.97); }

  /* ── UPLOAD VIEW ─────────────────────────────────── */
  .upload-zone {
    border:2px dashed rgba(255,255,255,.18); border-radius:20px;
    padding:44px 20px; text-align:center; cursor:pointer;
    background:rgba(255,255,255,.025); transition:all .22s;
    -webkit-tap-highlight-color:transparent;
  }
  .upload-zone.drag { border-color:#a29bfe; background:rgba(162,155,254,.07); }
  .upload-zone:active { background:rgba(162,155,254,.05); }
  .upload-icon { font-size:48px; margin-bottom:12px; }
  .upload-title { font-size:19px; font-weight:700; color:#fff; margin-bottom:6px; }
  .upload-desc { font-size:13px; color:rgba(255,255,255,.42); margin-bottom:20px; line-height:1.5; }
  .upload-cta { display:inline-flex; align-items:center; gap:7px;
    background:linear-gradient(135deg,#6C5CE7,#a29bfe); color:#fff;
    padding:12px 26px; border-radius:50px; font-weight:700; font-size:14px;
    box-shadow:0 5px 18px #6C5CE766; }
  .upload-err { margin-top:14px; color:#FF6B6B; font-size:13px; font-weight:500; }

  /* duplicate banner */
  .dup-banner { background:rgba(254,202,87,.07); border:1px solid rgba(254,202,87,.3);
    border-radius:14px; padding:14px; margin-bottom:14px; }
  .dup-top { display:flex; gap:10px; align-items:flex-start; margin-bottom:10px; }
  .dup-emoji { font-size:20px; flex-shrink:0; margin-top:1px; }
  .dup-title { font-weight:700; color:#FECA57; font-size:13px; margin-bottom:3px; }
  .dup-desc { font-size:12px; color:rgba(255,255,255,.5); line-height:1.45; }
  .dup-btns { display:flex; gap:8px; }
  .dup-btn-open { flex:1; background:linear-gradient(135deg,#6C5CE7,#a29bfe);
    border:none; color:#fff; padding:9px; border-radius:9px;
    cursor:pointer; font-size:12px; font-weight:700; }
  .dup-btn-skip { flex:1; background:rgba(255,255,255,.07);
    border:1px solid rgba(255,255,255,.13); color:rgba(255,255,255,.65);
    padding:9px; border-radius:9px; cursor:pointer; font-size:12px; font-weight:600; }

  /* loading */
  .loading-box { text-align:center; padding:64px 20px;
    background:rgba(255,255,255,.025); border-radius:20px;
    border:1px solid rgba(255,255,255,.06); }
  .loading-ring { width:52px; height:52px; margin:0 auto 18px;
    border:3px solid rgba(255,255,255,.07); border-top-color:#a29bfe;
    border-radius:50%; animation:spin .9s linear infinite; }
  .loading-title { font-size:15px; font-weight:700; color:#fff; margin-bottom:5px; }
  .loading-sub { font-size:12px; color:rgba(255,255,255,.32); }

  /* ── ROADMAP ─────────────────────────────────────── */
  .rm-card { background:rgba(255,255,255,.04); border-radius:18px;
    padding:16px; border:1px solid rgba(255,255,255,.08);
    margin-bottom:14px; }
  .rm-eyebrow { font-size:9px; font-weight:700; letter-spacing:2px;
    color:rgba(255,255,255,.3); text-transform:uppercase; margin-bottom:4px; }
  .rm-name { font-size:20px; font-weight:900; color:#fff;
    letter-spacing:-.4px; line-height:1.2; margin-bottom:4px; }
  .rm-desc { font-size:12px; color:rgba(255,255,255,.42); line-height:1.45; margin-bottom:14px; }

  .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:14px; }
  .stat { background:rgba(255,255,255,.06); border-radius:11px;
    padding:10px 4px; text-align:center; }
  .stat-icon { font-size:15px; margin-bottom:2px; }
  .stat-val { font-size:17px; font-weight:900; color:#fff; line-height:1; }
  .stat-lbl { font-size:8.5px; color:rgba(255,255,255,.32); margin-top:2px;
    font-weight:700; text-transform:uppercase; letter-spacing:.4px; }

  .prog-bar-wrap { margin-bottom:11px; }
  .prog-meta { display:flex; justify-content:space-between; margin-bottom:4px; }
  .prog-count { font-size:11px; color:rgba(255,255,255,.32); font-weight:600; }
  .prog-pct { font-size:11px; color:#a29bfe; font-weight:700; }
  .prog-track { height:6px; background:rgba(255,255,255,.07); border-radius:99px; overflow:hidden; }
  .prog-fill { height:100%; border-radius:99px;
    background:linear-gradient(90deg,#6C5CE7,#55EFC4); transition:width .5s ease; }

  .status-row { display:flex; gap:10px; flex-wrap:wrap; }
  .status-pill { display:flex; align-items:center; gap:5px;
    font-size:11px; color:rgba(255,255,255,.42); }
  .status-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

  .units-list { display:flex; flex-direction:column; gap:9px; }
  .unit-row { display:flex; gap:6px; align-items:flex-start; }
  .unit-line-wrap { display:flex; flex-direction:column; align-items:center; padding-top:20px; flex-shrink:0; }
  .unit-line { width:2px; }
  .unit-content { flex:1; min-width:0; }

  .finish-box { margin-top:26px; text-align:center; padding:34px 20px;
    background:rgba(85,239,196,.07); border-radius:18px;
    border:2px solid rgba(85,239,196,.25); }
  .finish-icon { font-size:42px; margin-bottom:7px; }
  .finish-title { font-size:18px; font-weight:800; color:#55EFC4; margin-bottom:5px; }
  .finish-sub { font-size:12px; color:rgba(255,255,255,.4); }

  /* ── DESKTOP ─────────────────────────────────────── */
  @media (min-width:600px) {
    .hdr { padding:14px 24px; gap:13px; }
    .hdr-logo { width:42px; height:42px; font-size:21px; border-radius:12px; }
    .hdr-title { font-size:19px; }
    .hdr-sub { font-size:11px; }
    .btn-primary, .btn-ghost, .btn-pdf { padding:9px 18px; }

    .page { padding:26px 20px 0; }
    .list-title { font-size:24px; }

    .upload-zone { padding:56px 40px; }
    .upload-title { font-size:21px; }

    .rm-card { padding:22px; }
    .rm-name { font-size:24px; }
    .stats-grid { gap:10px; }
    .stat { padding:12px 8px; }
    .stat-val { font-size:20px; }
    .stat-icon { font-size:18px; }
    .stat-lbl { font-size:9px; }
    .prog-track { height:7px; }
  }
`;

export default function App() {
  const { materias, loading: dbLoading, checkDuplicate, saveMateria, updateProgress, deleteMateria } = useProgress();

  const [view, setView]                   = useState<View>("list");
  const [activeMateriaId, setActiveMateriaId] = useState<string | null>(null);
  const [syllabus, setSyllabus]           = useState<Syllabus | null>(null);
  const [units, setUnits]                 = useState<Unidad[]>([]);
  const [uploading, setUploading]         = useState(false);
  const [exportingPDF, setExportingPDF]   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [duplicate, setDuplicate]         = useState<MateriaRow | null>(null);
  const [dragging, setDragging]           = useState(false);
  const [fileName, setFileName]           = useState<string | null>(null);
  const [saveStatus, setSaveStatus]       = useState<SaveStatus>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const openMateria = (materia: MateriaRow) => {
    setSyllabus(materia.syllabus_json);
    setUnits(materia.units_json);
    setActiveMateriaId(materia.id);
    setView("roadmap");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const processFile = async (file: File) => {
    setUploading(true); setError(null); setDuplicate(null); setFileName(file.name);
    try {
      const fileHint = file.name.replace(/\.[^/.]+$/, "");
      const byFile = await checkDuplicate(fileHint);
      if (byFile) { setDuplicate(byFile); setUploading(false); return; }

      const data = await analyzeSyllabus(file);
      const byName = await checkDuplicate(data.materia);
      if (byName) { setDuplicate(byName); setUploading(false); return; }

      const enriched: Unidad[] = data.unidades.map(u => ({
        ...u, status: "pending" as UnitStatus,
        temaStatus: u.temas.map(() => "pending" as const),
      }));
      setSyllabus(data); setUnits(enriched); setView("roadmap");
      window.scrollTo({ top: 0, behavior: "smooth" });

      setSaveStatus("saving");
      const saved = await saveMateria(data, enriched);
      if (saved) {
        setActiveMateriaId(saved.id);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      setError("No se pudo analizar el archivo. Revisá tu API key o intentá de nuevo.");
      console.error(e);
    }
    setUploading(false);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0]; if (f) processFile(f);
  }, []);

  const handleStatusChange = async (unitNum: number, status: string) => {
    const n = units.map(u => u.numero === unitNum ? { ...u, status: status as UnitStatus } : u);
    setUnits(n);
    if (activeMateriaId) await updateProgress(activeMateriaId, n);
  };

  const handleToggleTema = async (unitNum: number, temaIdx: number) => {
    const n = units.map(u => {
      if (u.numero !== unitNum) return u;
      const ts = [...(u.temaStatus ?? [])];
      ts[temaIdx] = ts[temaIdx] === "done" ? "pending" : "done";
      const done = ts.filter(s => s === "done").length;
      return { ...u, temaStatus: ts,
        status: (done === 0 ? "pending" : done === u.temas.length ? "done" : "in_progress") as UnitStatus };
    });
    setUnits(n);
    if (activeMateriaId) await updateProgress(activeMateriaId, n);
  };

  const handleExportPDF = async () => {
    if (!syllabus) return;
    setExportingPDF(true);
    try { await exportToPDF(syllabus, units); } catch (e) { console.error(e); }
    setExportingPDF(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta materia y su progreso?")) return;
    await deleteMateria(id);
  };

  const totalTemas    = units.reduce((a, u) => a + u.temas.length, 0);
  const doneTemas     = units.reduce((a, u) => a + (u.temaStatus?.filter(s => s === "done").length ?? 0), 0);
  const globalPct     = totalTemas > 0 ? Math.round((doneTemas / totalTemas) * 100) : 0;
  const totalSemanas  = units.reduce((a, u) => a + (u.semanas_estimadas ?? 0), 0);

  return (
    <div className="app">
      <style>{GLOBAL_CSS}</style>

      {/* ── HEADER ── */}
      <header className="hdr">
        <div className="hdr-logo" onClick={() => setView("list")}>🗺️</div>
        <div className="hdr-info" onClick={() => setView("list")}>
          <div className="hdr-title">StudyMap <span>AI</span></div>
          <div className="hdr-sub">Organizá tu estudio con IA</div>
        </div>

        <div className="hdr-actions">
          {saveStatus && (
            <span className={`save-badge${saveStatus === "saving" ? " saving" : ""}`}>
              {saveStatus === "saving" ? "Guardando…" : "✓ Listo"}
            </span>
          )}
          {view === "roadmap" && (
            <button className="btn btn-pdf" onClick={handleExportPDF} disabled={exportingPDF}>
              {exportingPDF ? <><span className="spinner"/>PDF</> : <>📥 PDF</>}
            </button>
          )}
          {view === "roadmap" && (
            <button className="btn btn-ghost" onClick={() => setView("list")}>← Volver</button>
          )}
          {view === "list" && (
            <button className="btn btn-primary" onClick={() => setView("upload")}>+ Nueva</button>
          )}
          {view === "upload" && (
            <button className="btn btn-ghost" onClick={() => setView("list")}>← Volver</button>
          )}
        </div>
      </header>

      <main className="page">

        {/* ── LIST ── */}
        {view === "list" && (
          <div>
            <div className="list-hdr">
              <div className="list-title">Mis Materias</div>
              <div className="list-sub">El progreso se guarda automáticamente ☁️</div>
            </div>

            {dbLoading ? (
              <div className="loading-box">
                <div className="loading-ring"/>
                <div className="loading-title">Cargando…</div>
              </div>
            ) : materias.length === 0 ? (
              <div className="empty-box">
                <div className="empty-icon">📚</div>
                <div className="empty-title">No tenés materias todavía</div>
                <div className="empty-desc">Subí el temario de tu primera materia<br/>y la IA lo organiza por vos</div>
                <button className="btn-pill" onClick={() => setView("upload")}>✦ Subir primer temario</button>
              </div>
            ) : (
              <div className="materias-list">
                {materias.map(m => (
                  <MateriaItem key={m.id} materia={m} onOpen={openMateria} onDelete={handleDelete}/>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── UPLOAD ── */}
        {view === "upload" && !uploading && (
          <div>
            {duplicate && (
              <div className="dup-banner">
                <div className="dup-top">
                  <span className="dup-emoji">⚠️</span>
                  <div>
                    <div className="dup-title">Esta materia ya existe</div>
                    <div className="dup-desc">
                      Ya tenés <strong style={{ color:"#fff" }}>{duplicate.nombre}</strong> con {duplicate.progress_percent}% de progreso.
                    </div>
                  </div>
                </div>
                <div className="dup-btns">
                  <button className="dup-btn-open" onClick={() => openMateria(duplicate)}>Ver materia →</button>
                  <button className="dup-btn-skip" onClick={() => setDuplicate(null)}>Subir de todas formas</button>
                </div>
              </div>
            )}

            <div
              className={`upload-zone${dragging ? " drag" : ""}`}
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
            >
              <div className="upload-icon">📄</div>
              <div className="upload-title">Subí tu temario</div>
              <div className="upload-desc">
                Tocá para elegir o arrastrá un archivo<br/>
                <strong style={{ color:"#a29bfe" }}>PDF</strong> o <strong style={{ color:"#a29bfe" }}>imagen</strong> del programa de la materia
              </div>
              <div className="upload-cta">✦ Analizar con IA</div>
              {error && <div className="upload-err">⚠️ {error}</div>}
              <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:"none" }}
                onChange={e => { setDuplicate(null); const f = e.target.files?.[0]; if (f) processFile(f); }}/>
            </div>
          </div>
        )}

        {view === "upload" && uploading && (
          <div className="loading-box">
            <div className="loading-ring"/>
            <div className="loading-title">Analizando tu temario…</div>
            <div className="loading-sub">{fileName} · Extrayendo temas con IA</div>
          </div>
        )}

        {/* ── ROADMAP ── */}
        {view === "roadmap" && syllabus && (
          <div>
            <div className="rm-card">
              <div className="rm-eyebrow">Materia</div>
              <div className="rm-name">{syllabus.materia}</div>
              <div className="rm-desc">{syllabus.descripcion}</div>

              <div className="stats-grid">
                {([
                  { icon:"📚", val: units.length,   lbl:"Unidades" },
                  { icon:"📝", val: totalTemas,      lbl:"Temas"    },
                  { icon:"📅", val: totalSemanas,    lbl:"Semanas"  },
                  { icon:"🎯", val: `${globalPct}%`, lbl:"Progreso" },
                ] as { icon:string; val:string|number; lbl:string }[]).map(s => (
                  <div key={s.lbl} className="stat">
                    <div className="stat-icon">{s.icon}</div>
                    <div className="stat-val">{s.val}</div>
                    <div className="stat-lbl">{s.lbl}</div>
                  </div>
                ))}
              </div>

              <div className="prog-bar-wrap">
                <div className="prog-meta">
                  <span className="prog-count">{doneTemas} de {totalTemas} temas</span>
                  <span className="prog-pct">{globalPct}%</span>
                </div>
                <div className="prog-track">
                  <div className="prog-fill" style={{ width:`${globalPct}%` }}/>
                </div>
              </div>

              <div className="status-row">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <div key={k} className="status-pill">
                    <span className="status-dot" style={{ background: v.color }}/>
                    {units.filter(u => (u.status ?? "pending") === k).length} {v.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="units-list">
              {units.map((unit, i) => (
                <div key={unit.numero} className="unit-row">
                  <div className="unit-line-wrap">
                    <div className="unit-line" style={{
                      height: i === 0 ? 0 : 16,
                      marginTop: i === 0 ? 0 : -16,
                      background: `linear-gradient(to bottom, transparent, ${COLORS[i % COLORS.length].bg}55)`,
                    }}/>
                  </div>
                  <div className="unit-content">
                    <UnitCard
                      unit={unit}
                      colorSet={COLORS[i % COLORS.length]}
                      index={i}
                      onStatusChange={handleStatusChange}
                      onToggleTema={handleToggleTema}
                    />
                  </div>
                </div>
              ))}
            </div>

            {globalPct === 100 && (
              <div className="finish-box">
                <div className="finish-icon">🎉</div>
                <div className="finish-title">¡Completaste toda la materia!</div>
                <div className="finish-sub">Revisaste los {totalTemas} temas · ¡Bien hecho!</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
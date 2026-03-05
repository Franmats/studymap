import { useEffect, useRef, useState, useCallback, useMemo, lazy, Suspense } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useAppStore, useMateriaStore, useExamenStore,
  selectRoadmapStats, selectUnitStatusCounts,
} from "./store";
import { analyzeSyllabus }  from "./lib/anthropic";
import { exportToPDF }      from "./lib/exportPDF";
import { UnitCard }         from "./components/UnitCard";
import { MateriaItem }      from "./components/MateriaItem";
import { BottomNav }        from "./components/BottomNav";
import { Sidebar }          from "./components/Sidebar";
import { PageHeader }       from "./components/PageHeader";
import { ExamBanner }       from "./components/ExamBanner";
import { SearchBar }        from "./components/SearchBar";
import { OnboardingModal, useOnboarding } from "./components/OnboardingModal";
import { ToastContainer, toast }          from "./components/Toast";
import { AuthScreen }       from "./components/AuthScreen";
import { useAuthStore }     from "./store/useAuthStore";
import { useDebounce }      from "./hooks/useDebounce";
import type { UnitStatus }  from "./types";
import { useConfetti }      from "./components/Confetti";
import { DailyWidget }      from "./components/DailyWidget";
import { ActivityHeatmap }  from "./components/ActivityHeatmap";
import { useSesionStore }   from "./store/useSesionStore";
import { useSprintStore }   from "./store/useSprintStore";
import { useScheduleStore }   from "./store/useScheduleStore";
import { useTimeControlStore } from "./store/useTimeControlStore";
import { PomodoroWidget }      from "./components/pomodoro/PomodoroWidget";

// Lazy loading — CalendarView, ShareCard y SprintView solo se cargan cuando el usuario los abre
const CalendarView  = lazy(() => import("./components/calendar/CalendarView").then(m => ({ default: m.CalendarView })));
const ShareCard     = lazy(() => import("./components/ShareCard").then(m => ({ default: m.ShareCard })));
const SprintView    = lazy(() => import("./components/sprint/SprintView").then(m => ({ default: m.SprintView })));
const ScheduleView  = lazy(() => import("./components/schedule/ScheduleView").then(m => ({ default: m.ScheduleView })));
const TimeControlView = lazy(() => import("./components/timecontrol/TimeControlView").then(m => ({ default: m.TimeControlView })));

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

const CSS = `
  *, *::before, *::after { box-sizing: border-box; }
  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse   { 0%,100%{ opacity:1; } 50%{ opacity:.45; } }
  @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
  html, body { margin:0; padding:0; }

  /* ── LAYOUT ── */
  .app {
    min-height: 100dvh;
    background: linear-gradient(150deg,#0f0c29 0%,#302b63 55%,#1a1040 100%);
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
    padding-bottom: 64px;
  }

  /* En desktop: layout de dos columnas, la sidebar ocupa 240px */
  @media (min-width: 720px) {
    .app { padding-bottom: 0; }
    .app-body { margin-left: 240px; }
  }

  /* ── PAGE CONTENT ── */
  .page {
    max-width: 720px; margin: 0 auto;
    padding: 20px 16px 32px;
    animation: fadeUp .25s ease;
  }

  @media (min-width: 720px) {
    .page { padding: 28px 36px 40px; max-width: 800px; }
  }

  /* ── LIST ── */
  .list-hdr { margin-bottom: 20px; }
  .list-title { font-size: 22px; font-weight: 900; color: #fff; letter-spacing: -.5px; }
  .list-sub { font-size: 12px; color: rgba(255,255,255,.32); margin-top: 3px; }
  .materias-list { display: flex; flex-direction: column; gap: 10px; }

  /* Desktop: grid de 2 columnas para la lista de materias */
  @media (min-width: 900px) {
    .materias-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  }

  .empty-box { text-align: center; padding: 56px 24px;
    background: rgba(255,255,255,.025); border-radius: 20px;
    border: 2px dashed rgba(255,255,255,.09); }
  .empty-icon { font-size: 48px; margin-bottom: 14px; }
  .empty-title { font-size: 17px; font-weight: 700; color: #fff; margin-bottom: 6px; }
  .empty-desc { font-size: 13px; color: rgba(255,255,255,.38); margin-bottom: 22px; line-height: 1.55; }
  .btn-pill { display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe); color: #fff;
    padding: 13px 28px; border-radius: 50px; border: none; cursor: pointer;
    font-size: 14px; font-weight: 700; box-shadow: 0 5px 18px #6C5CE766;
    -webkit-tap-highlight-color: transparent; }
  .btn-pill:active { transform: scale(.97); }

  /* ── UPLOAD ── */
  .upload-zone { border: 2px dashed rgba(255,255,255,.18); border-radius: 20px;
    padding: 48px 24px; text-align: center; cursor: pointer;
    background: rgba(255,255,255,.025); transition: all .22s;
    -webkit-tap-highlight-color: transparent; }
  .upload-zone.drag { border-color: #a29bfe; background: rgba(162,155,254,.07); }
  .upload-icon { font-size: 52px; margin-bottom: 14px; }
  .upload-title { font-size: 20px; font-weight: 700; color: #fff; margin-bottom: 7px; }
  .upload-desc { font-size: 13px; color: rgba(255,255,255,.42); margin-bottom: 22px; line-height: 1.55; }
  .upload-cta { display: inline-flex; align-items: center; gap: 8px;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe); color: #fff;
    padding: 13px 28px; border-radius: 50px; font-weight: 700; font-size: 15px;
    box-shadow: 0 5px 18px #6C5CE766; pointer-events: none; }
  .upload-err { margin-top: 14px; color: #FF6B6B; font-size: 13px; font-weight: 500; }

  /* Duplicate banner */
  .dup-banner { background: rgba(254,202,87,.07); border: 1px solid rgba(254,202,87,.3);
    border-radius: 14px; padding: 14px 16px; margin-bottom: 16px; }
  .dup-top { display: flex; gap: 10px; align-items: flex-start; margin-bottom: 10px; }
  .dup-emoji { font-size: 20px; flex-shrink: 0; }
  .dup-title { font-weight: 700; color: #FECA57; font-size: 13px; margin-bottom: 3px; }
  .dup-desc { font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.45; }
  .dup-btns { display: flex; gap: 8px; }
  .dup-btn-open { flex: 1; background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    border: none; color: #fff; padding: 9px; border-radius: 9px;
    cursor: pointer; font-size: 12px; font-weight: 700; }
  .dup-btn-skip { flex: 1; background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.13); color: rgba(255,255,255,.65);
    padding: 9px; border-radius: 9px; cursor: pointer; font-size: 12px; font-weight: 600; }

  /* Loading */
  .loading-box { text-align: center; padding: 72px 24px;
    background: rgba(255,255,255,.025); border-radius: 20px;
    border: 1px solid rgba(255,255,255,.06); }
  .loading-ring { width: 52px; height: 52px; margin: 0 auto 20px;
    border: 3px solid rgba(255,255,255,.07); border-top-color: #a29bfe;
    border-radius: 50%; animation: spin .9s linear infinite; }
  .loading-title { font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px; }
  .loading-sub { font-size: 12px; color: rgba(255,255,255,.32); }

  /* ── ROADMAP ── */
  .rm-layout { display: flex; flex-direction: column; gap: 14px; }

  /* En desktop el header del roadmap va en una card compacta arriba */
  .rm-card { background: rgba(255,255,255,.04); border-radius: 18px; padding: 18px 20px;
    border: 1px solid rgba(255,255,255,.08); }
  .rm-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 2px;
    color: rgba(255,255,255,.3); text-transform: uppercase; margin-bottom: 4px; }
  .rm-name { font-size: 20px; font-weight: 900; color: #fff;
    letter-spacing: -.4px; line-height: 1.2; margin-bottom: 4px; }
  .rm-desc { font-size: 12px; color: rgba(255,255,255,.42); line-height: 1.45; margin-bottom: 16px; }

  .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 8px; margin-bottom: 14px; }
  .stat { background: rgba(255,255,255,.06); border-radius: 11px; padding: 11px 6px; text-align: center; }
  .stat-icon { font-size: 16px; margin-bottom: 3px; }
  .stat-val { font-size: 18px; font-weight: 900; color: #fff; line-height: 1; }
  .stat-lbl { font-size: 8.5px; color: rgba(255,255,255,.32); margin-top: 2px;
    font-weight: 700; text-transform: uppercase; letter-spacing: .4px; }

  .prog-bar-wrap { margin-bottom: 12px; }
  .prog-meta { display: flex; justify-content: space-between; margin-bottom: 5px; }
  .prog-count { font-size: 11px; color: rgba(255,255,255,.32); font-weight: 600; }
  .prog-pct { font-size: 11px; color: #a29bfe; font-weight: 700; }
  .prog-track { height: 6px; background: rgba(255,255,255,.07); border-radius: 99px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 99px;
    background: linear-gradient(90deg,#6C5CE7,#55EFC4); transition: width .5s ease; }

  .status-row { display: flex; gap: 12px; flex-wrap: wrap; }
  .status-pill { display: flex; align-items: center; gap: 5px;
    font-size: 11px; color: rgba(255,255,255,.42); }
  .status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

  .units-list { display: flex; flex-direction: column; gap: 10px; }
  .unit-row { display: flex; gap: 6px; align-items: flex-start; }
  .unit-line-wrap { display: flex; flex-direction: column; align-items: center; padding-top: 20px; flex-shrink: 0; }
  .unit-line { width: 2px; }
  .unit-content { flex: 1; min-width: 0; }

  .finish-box { margin-top: 28px; text-align: center; padding: 40px 24px;
    background: rgba(85,239,196,.07); border-radius: 20px; border: 2px solid rgba(85,239,196,.25); }
  .finish-icon { font-size: 48px; margin-bottom: 8px; }
  .finish-title { font-size: 20px; font-weight: 800; color: #55EFC4; margin-bottom: 6px; }
  .finish-sub { font-size: 13px; color: rgba(255,255,255,.4); }

  /* ── DESKTOP ROADMAP — dos columnas: info + lista ── */
  @media (min-width: 900px) {
    .rm-layout { display: grid; grid-template-columns: 280px 1fr; gap: 20px; align-items: start; }
    .rm-card { position: sticky; top: 80px; } /* se queda fija mientras scrolleás las unidades */
    .stats-grid { grid-template-columns: repeat(2,1fr); }
  }
`;

// ── AppInner — solo se monta cuando hay sesión activa ─────────────────────
// Todos los hooks viven acá, nunca hay returns condicionales entre ellos.
function AppInner({ logout }: { logout: () => Promise<void> }) {
  // ── Store: UI ──────────────────────────────────────────────────────────────
  const view            = useAppStore((s) => s.view);
  const setView         = useAppStore((s) => s.setView);
  const goToList        = useAppStore((s) => s.goToList);
  const syllabus        = useAppStore((s) => s.syllabus);
  const units           = useAppStore((s) => s.units);
  const loadMateria     = useAppStore((s) => s.loadMateria);
  const setActiveMateriaId = useAppStore((s) => s.setActiveMateriaId);
  const toggleTema      = useAppStore((s) => s.toggleTema);
  const changeStatus    = useAppStore((s) => s.changeUnitStatus);
  const activeMateriaId = useAppStore((s) => s.activeMateriaId);

  const uploading       = useAppStore((s) => s.uploading);
  const fileName        = useAppStore((s) => s.fileName);
  const uploadError     = useAppStore((s) => s.uploadError);
  const duplicate       = useAppStore((s) => s.duplicate);
  const saveStatus      = useAppStore((s) => s.saveStatus);
  const exportingPDF    = useAppStore((s) => s.exportingPDF);

  const startUpload     = useAppStore((s) => s.startUpload);
  const finishUpload    = useAppStore((s) => s.finishUpload);
  const setUploadError  = useAppStore((s) => s.setUploadError);
  const setDuplicate    = useAppStore((s) => s.setDuplicate);
  const setSaveStatus   = useAppStore((s) => s.setSaveStatus);
  const setExportingPDF = useAppStore((s) => s.setExportingPDF);

  const { totalTemas, doneTemas, globalPct, totalSemanas } =
    useAppStore(useShallow(selectRoadmapStats));
  const statusCounts = useAppStore(useShallow(selectUnitStatusCounts));

  // Confetti cuando se completa una materia — tiene que ir DESPUÉS de declarar globalPct
  useConfetti(globalPct === 100);

  // ── Store: datos ───────────────────────────────────────────────────────────
  const materias        = useMateriaStore((s) => s.materias);
  const dbLoading       = useMateriaStore((s) => s.loading);
  const fetchMaterias   = useMateriaStore((s) => s.fetchMaterias);
  const saveMateria     = useMateriaStore((s) => s.saveMateria);
  const updateProgress  = useMateriaStore((s) => s.updateProgress);
  const updateEtiqueta  = useMateriaStore((s) => s.updateEtiqueta);
  const deleteMateria   = useMateriaStore((s) => s.deleteMateria);
  const checkDuplicate  = useMateriaStore((s) => s.checkDuplicate);
  const fetchExamenes   = useExamenStore((s) => s.fetchExamenes);

  const { fetchHistorial, registrarActividad } = useSesionStore();
  const fetchSprints  = useSprintStore(s => s.fetchSprints);
  const fetchClases      = useScheduleStore(s => s.fetchClases);
  const fetchRegistros   = useTimeControlStore(s => s.fetchRegistros);

  // ── Búsqueda y filtros ────────────────────────────────────────────────────
  const [query,          setQuery]          = useState("");
  const [etiquetaActiva, setEtiquetaActiva] = useState<string | null>(null);
  const [showShare,      setShowShare]      = useState(false);

  // Debounce: esperar 200ms después del último keystroke para filtrar
  const queryDebounced = useDebounce(query, 200);

  // Memoizar la lista filtrada — solo recalcula cuando cambian materias o filtros
  const materiasFiltradas = useMemo(() => {
    const q = queryDebounced.toLowerCase().trim();
    return materias.filter((m) => {
      const matchQuery = !q ||
        m.nombre.toLowerCase().includes(q) ||
        m.descripcion?.toLowerCase().includes(q) ||
        m.units_json.some((u) => u.temas.some((t) => t.toLowerCase().includes(q)));
      const matchEtiqueta = !etiquetaActiva || m.etiqueta === etiquetaActiva;
      return matchQuery && matchEtiqueta;
    });
  }, [materias, queryDebounced, etiquetaActiva]);

  // Memoizar etiquetas disponibles
  const etiquetasDisponibles = useMemo(
    () => [...new Set(materias.map((m) => m.etiqueta).filter(Boolean))] as string[],
    [materias]
  );

  // Onboarding — solo para usuarios sin materias que nunca lo vieron
  const { mostrar: mostrarOnboarding, cerrar: cerrarOnboarding } = useOnboarding(materias);

  const fileRef    = useRef<HTMLInputElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    fetchMaterias();
    fetchExamenes();
    fetchHistorial();
    fetchSprints();
    fetchClases();
    fetchRegistros();
  }, [fetchMaterias, fetchExamenes, fetchHistorial, fetchSprints, fetchClases, fetchRegistros]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const processFile = async (file: File) => {
    startUpload(file.name);
    try {
      const fileHint = file.name.replace(/\.[^/.]+$/, "");
      const byFile   = await checkDuplicate(fileHint);
      if (byFile) { setDuplicate(byFile); finishUpload(); return; }

      toast.info("Analizando tu temario con IA…");
      const data   = await analyzeSyllabus(file);
      const byName = await checkDuplicate(data.materia);
      if (byName) { setDuplicate(byName); finishUpload(); return; }

      const enriched = data.unidades.map((u) => ({
        ...u, status: "pending" as UnitStatus,
        temaStatus: u.temas.map(() => "pending" as const),
      }));

      loadMateria({
        id: "", user_id: "personal",
        nombre: data.materia, descripcion: data.descripcion,
        duracion_semanas: data.duracion_semanas,
        syllabus_json: data, units_json: enriched,
        progress_percent: 0, etiqueta: null, created_at: "", updated_at: "",
      });
      window.scrollTo({ top: 0, behavior: "smooth" });

      setSaveStatus("saving");
      const saved = await saveMateria(data, enriched);
      if (saved) {
        setActiveMateriaId(saved.id);
        setSaveStatus("saved");
        toast.success(`"${data.materia}" agregada correctamente`);
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setUploadError("No se pudo analizar el archivo.");
      toast.error("No se pudo analizar el archivo. Verificá que la API esté configurada.");
    }
    finishUpload();
  };

  const handleStatusChange = useCallback(async (unitNum: number, status: string) => {
    const newUnits = changeStatus(unitNum, status as UnitStatus);
    if (activeMateriaId) await updateProgress(activeMateriaId, newUnits);
  }, [activeMateriaId, changeStatus, updateProgress]);

  const handleToggleTema = useCallback(async (unitNum: number, temaIdx: number) => {
    const wasDone  = units.find((u) => u.numero === unitNum)?.temaStatus?.[temaIdx] === "done";
    const newUnits = toggleTema(unitNum, temaIdx);
    if (activeMateriaId) {
      await updateProgress(activeMateriaId, newUnits);
      if (!wasDone && syllabus) registrarActividad(activeMateriaId, syllabus.materia);
    }
  }, [activeMateriaId, units, toggleTema, updateProgress, syllabus, registrarActividad]);

  const handleExportPDF = async () => {
    if (!syllabus) return;
    setExportingPDF(true);
    try {
      await exportToPDF(syllabus, units);
      toast.success("PDF generado correctamente");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF. Intentá de nuevo.");
    }
    setExportingPDF(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta materia y su progreso?")) return;
    await deleteMateria(id);
    toast.success("Materia eliminada");
  };

  // Guarda una nota en units_json y persiste en Supabase via updateProgress
  const handleNotaSave = async (unitNum: number, temaIdx: number, nota: string) => {
    if (!activeMateriaId) return;
    const newUnits = units.map((u) => {
      if (u.numero !== unitNum) return u;
      const notas = [...(u.notas ?? u.temas.map(() => ""))];
      notas[temaIdx] = nota;
      return { ...u, notas };
    });
    // Actualizamos el store de UI
    useAppStore.getState().loadMateria({
      id: activeMateriaId,
      user_id: "personal",
      nombre: syllabus?.materia ?? "",
      descripcion: syllabus?.descripcion ?? null,
      duracion_semanas: syllabus?.duracion_semanas ?? null,
      syllabus_json: syllabus!,
      units_json: newUnits,
      progress_percent: 0,
      etiqueta: null,
      created_at: "",
      updated_at: "",
    });
    await updateProgress(activeMateriaId, newUnits);
  };

  const handleGoToList = () => {
    goToList();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpload = () => {
    setView("upload");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app">
      <style>{CSS}</style>

      {/* Sistema de toasts — siempre montado */}
      <ToastContainer />

      {/* Onboarding — solo para usuarios nuevos sin materias */}
      {mostrarOnboarding && <OnboardingModal onDone={cerrarOnboarding} />}

      {/* Modal de compartir — lazy loaded */}
      {showShare && (
        <Suspense fallback={null}>
          <ShareCard
            materias={materias}
            streak={useSesionStore.getState().getStreak()}
            onClose={() => setShowShare(false)}
          />
        </Suspense>
      )}

      {/* Sidebar — solo visible en desktop (≥720px) */}
      <Sidebar onUpload={handleUpload} onShare={() => setShowShare(true)} onLogout={logout} />

      {/* Todo el contenido a la derecha de la sidebar */}
      <div className="app-body">

        {/* Header contextual */}
        <PageHeader
          onGoToList={handleGoToList}
          onUpload={handleUpload}
          onExportPDF={handleExportPDF}
          exportingPDF={exportingPDF}
          saveStatus={saveStatus}
          roadmapTitle={syllabus?.materia}
        />

        <main className="page">

          {view === "list" && (
            <div>
              {/* ExamBanner — aparece si hay exámenes en ≤7 días */}
              <ExamBanner onVerCalendario={() => setView("calendar")} />

              {/* Widget diario */}
              <DailyWidget />

              {/* Búsqueda + filtros — solo si hay materias */}
              {materias.length > 0 && (
                <SearchBar
                  query={query}
                  onQueryChange={setQuery}
                  etiquetas={etiquetasDisponibles}
                  etiquetaActiva={etiquetaActiva}
                  onEtiqueta={setEtiquetaActiva}
                />
              )}

              <div className="list-hdr">
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div>
                    <div className="list-title">Mis Materias</div>
                    <div className="list-sub">
                      {materias.length > 0
                        ? `${materias.length} materia${materias.length !== 1 ? "s" : ""} cargada${materias.length !== 1 ? "s" : ""}`
                        : "Todavía no tenés materias"}
                    </div>
                  </div>
                  {materias.length > 0 && (
                    <button
                      onClick={() => setShowShare(true)}
                      style={{
                        background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)",
                        color:"rgba(255,255,255,.6)", borderRadius:10, padding:"7px 13px",
                        cursor:"pointer", fontSize:12, fontWeight:700, flexShrink:0,
                        display:"flex", alignItems:"center", gap:5,
                      }}
                    >📤 Compartir</button>
                  )}
                </div>
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
                  <div className="empty-desc">
                    Subí el temario de tu primera materia<br/>
                    y la IA lo organiza por vos
                  </div>
                  <button className="btn-pill" onClick={handleUpload}>
                    ✦ Subir primer temario
                  </button>
                </div>
              ) : (() => {
                return materiasFiltradas.length === 0 ? (
                  <div className="empty-box" style={{ padding:"28px 20px" }}>
                    <div className="empty-icon">🔍</div>
                    <div className="empty-title">Sin resultados</div>
                    <div className="empty-desc">Probá con otro término o quitá los filtros</div>
                  </div>
                ) : (
                  <div className="materias-list">
                    {materiasFiltradas.map((m, i) => (
                      <MateriaItem
                        key={m.id} materia={m} index={i}
                        onOpen={loadMateria}
                        onDelete={handleDelete}
                        onEtiqueta={updateEtiqueta}
                      />
                    ))}
                  </div>
                );
              })()}

              {/* Heatmap */}
              <div style={{ marginTop:20 }}>
                <ActivityHeatmap />
              </div>
            </div>
          )}

          {/* ── CALENDAR ── */}
          {view === "calendar" && (
            <Suspense fallback={
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
                <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,.1)", borderTopColor:"#6C5CE7", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
              </div>
            }>
              <CalendarView />
            </Suspense>
          )}

          {/* ── SPRINTS ── */}
          {view === "sprint" && (
            <Suspense fallback={
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
                <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,.1)", borderTopColor:"#6C5CE7", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
              </div>
            }>
              <SprintView />
            </Suspense>
          )}

          {/* ── HORARIOS ── */}
          {view === "schedule" && (
            <Suspense fallback={
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
                <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,.1)", borderTopColor:"#6C5CE7", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
              </div>
            }>
              <ScheduleView />
            </Suspense>
          )}

          {/* ── TIME CONTROL ── */}
          {view === "time-control" && (
            <Suspense fallback={
              <div style={{ display:"flex", alignItems:"center", justifyContent:"center", padding:60 }}>
                <div style={{ width:32, height:32, border:"3px solid rgba(255,255,255,.1)", borderTopColor:"#6C5CE7", borderRadius:"50%", animation:"spin .8s linear infinite" }} />
              </div>
            }>
              <TimeControlView />
            </Suspense>
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
                        Ya tenés <strong style={{ color:"#fff" }}>{duplicate.nombre}</strong>{" "}
                        con {duplicate.progress_percent}% de progreso.
                      </div>
                    </div>
                  </div>
                  <div className="dup-btns">
                    <button className="dup-btn-open" onClick={() => loadMateria(duplicate)}>Ver materia →</button>
                    <button className="dup-btn-skip" onClick={() => setDuplicate(null)}>Subir de todas formas</button>
                  </div>
                </div>
              )}

              <div
                className={`upload-zone${isDragging.current ? " drag" : ""}`}
                onDragOver={(e) => { e.preventDefault(); isDragging.current = true; }}
                onDragLeave={() => { isDragging.current = false; }}
                onDrop={(e) => {
                  e.preventDefault(); isDragging.current = false;
                  const f = e.dataTransfer.files[0]; if (f) processFile(f);
                }}
                onClick={() => fileRef.current?.click()}
              >
                <div className="upload-icon">📄</div>
                <div className="upload-title">Subí tu temario</div>
                <div className="upload-desc">
                  Tocá para elegir o arrastrá un archivo<br/>
                  <strong style={{ color:"#a29bfe" }}>PDF</strong> o{" "}
                  <strong style={{ color:"#a29bfe" }}>imagen</strong> del programa de la materia
                </div>
                <div className="upload-cta">✦ Analizar con IA</div>
                {uploadError && <div className="upload-err">⚠️ {uploadError}</div>}
                <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:"none" }}
                  onChange={(e) => {
                    setDuplicate(null);
                    const f = e.target.files?.[0]; if (f) processFile(f);
                  }}/>
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
            <div className="rm-layout">

              {/* Card de info — sticky en desktop, normal en mobile */}
              <div className="rm-card">
                <div className="rm-eyebrow">Materia</div>
                <div className="rm-name">{syllabus.materia}</div>
                <div className="rm-desc">{syllabus.descripcion}</div>

                <div className="stats-grid">
                  {([
                    { icon:"📚", val: units.length,    lbl:"Unidades" },
                    { icon:"📝", val: totalTemas,       lbl:"Temas"    },
                    { icon:"📅", val: totalSemanas,     lbl:"Semanas"  },
                    { icon:"🎯", val: `${globalPct}%`,  lbl:"Progreso" },
                  ] as {icon:string;val:string|number;lbl:string}[]).map((s) => (
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
                  {(Object.entries(STATUS_CONFIG) as [keyof typeof statusCounts, {label:string;color:string}][])
                    .map(([k, v]) => (
                      <div key={k} className="status-pill">
                        <span className="status-dot" style={{ background: v.color }}/>
                        {statusCounts[k]} {v.label}
                      </div>
                    ))}
                </div>
              </div>

              {/* Lista de unidades */}
              <div>
                <div className="units-list">
                  {units.map((unit, i) => (
                    <div key={unit.numero} className="unit-row">
                      <div className="unit-line-wrap">
                        <div className="unit-line" style={{
                          height: i === 0 ? 0 : 16,
                          marginTop: i === 0 ? 0 : -16,
                          background: `linear-gradient(to bottom,transparent,${COLORS[i%COLORS.length].bg}55)`,
                        }}/>
                      </div>
                      <div className="unit-content">
                        <UnitCard
                          unit={unit}
                          colorSet={COLORS[i%COLORS.length]}
                          index={i}
                          onStatusChange={handleStatusChange}
                          onToggleTema={handleToggleTema}
                          onNotaSave={handleNotaSave}
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
            </div>
          )}
        </main>
      </div>

      {/* Pomodoro — flotante, siempre visible */}
      <PomodoroWidget />

      {/* Bottom nav — solo en mobile */}
      <BottomNav onUpload={handleUpload} />
    </div>
  );
}

// ── App — wrapper de autenticación ────────────────────────────────────────
// Maneja loading/sin sesión/con sesión sin violar Rules of Hooks.
// AppInner solo se monta cuando hay usuario — sus hooks siempre se llaman igual.
export default function App() {
  const authUser    = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);
  const logout      = useAuthStore((s) => s.logout);

  if (authLoading) return (
    <div style={{
      minHeight:"100dvh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(160deg,#0f0c29,#302b63,#1a1040)",
    }}>
      <div style={{
        width:40, height:40, border:"3px solid rgba(255,255,255,.15)",
        borderTopColor:"#6C5CE7", borderRadius:"50%",
        animation:"spin 0.8s linear infinite",
      }}/>
    </div>
  );

  if (!authUser) return <AuthScreen />;

  return <AppInner logout={logout} />;
}
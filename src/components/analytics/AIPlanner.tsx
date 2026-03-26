import { useState, useMemo } from "react";
import { useMateriaStore } from "../../store/useMateriaStore";
import { useExamenStore }  from "../../store/useExamenStore";
import { useSprintStore }  from "../../store/useSprintStore";
import { useTPStore }      from "../../store/useTPStore";
import { calcularAnalytics, serializarContextoParaIA } from "../../lib/analyticsEngine";
import type { PlannerSuggestion } from "../../lib/analyticsEngine";

const URGENCIA_CONFIG = {
  critica: { color:"#FF6B6B", bg:"rgba(255,107,107,.1)", border:"rgba(255,107,107,.25)", label:"Crítico" },
  alta:    { color:"#FF9F43", bg:"rgba(255,159,67,.08)", border:"rgba(255,159,67,.22)",  label:"Urgente" },
  media:   { color:"#FECA57", bg:"rgba(254,202,87,.08)", border:"rgba(254,202,87,.2)",   label:"Esta semana" },
  baja:    { color:"#a29bfe", bg:"rgba(162,155,254,.08)",border:"rgba(162,155,254,.2)",  label:"Sugerido" },
};

// ── Tarjeta de sugerencia ─────────────────────────────────────────────────────
function SuggestionCard({ sug }: { sug: PlannerSuggestion }) {
  const cfg = URGENCIA_CONFIG[sug.urgencia];
  return (
    <div className="pl-sug-card" style={{ background: cfg.bg, borderColor: cfg.border }}>
      <div className="pl-sug-top">
        <div className="pl-sug-titulo">{sug.titulo}</div>
        <span className="pl-sug-badge" style={{ color: cfg.color, background:`${cfg.color}18` }}>
          {cfg.label}
        </span>
      </div>
      <div className="pl-sug-detalle">{sug.detalle}</div>
    </div>
  );
}

// ── Bloque de respuesta IA ────────────────────────────────────────────────────
function AIResponse({ text }: { text: string }) {
  // Parsear el markdown simple que devuelve Claude
  const lines = text.split("\n");
  return (
    <div className="pl-ai-response">
      {lines.map((line, i) => {
        if (line.startsWith("## "))
          return <h3 key={i} className="pl-ai-h3">{line.replace("## ","")}</h3>;
        if (line.startsWith("### "))
          return <h4 key={i} className="pl-ai-h4">{line.replace("### ","")}</h4>;
        if (line.startsWith("**") && line.endsWith("**"))
          return <strong key={i} className="pl-ai-bold">{line.replace(/\*\*/g,"")}</strong>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return <div key={i} className="pl-ai-item">
            <span className="pl-ai-bullet">→</span>
            <span>{line.replace(/^[-•] /,"")}</span>
          </div>;
        if (line.startsWith("1.") || line.match(/^\d+\./))
          return <div key={i} className="pl-ai-item numbered">
            <span className="pl-ai-num">{line.match(/^\d+/)?.[0]}</span>
            <span>{line.replace(/^\d+\.\s*/,"")}</span>
          </div>;
        if (line.trim() === "")
          return <div key={i} style={{ height:8 }} />;
        return <p key={i} className="pl-ai-p">{line}</p>;
      })}
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function AIPlanner() {
  const { materias }  = useMateriaStore();
  const { examenes }  = useExamenStore()  as any;
  const { sprints }   = useSprintStore();
  const { tps }       = useTPStore();

  const [aiResponse, setAiResponse]   = useState<string>("");
  const [loading,    setLoading]      = useState(false);
  const [error,      setError]        = useState<string | null>(null);
  const [modoIA,     setModoIA]       = useState<"semana"|"tps"|"examen"|"libre">("semana");
  const [preguntaLibre, setPreguntaLibre] = useState("");

  const analytics = useMemo(
    () => calcularAnalytics(materias, examenes ?? [], sprints, tps),
    [materias, examenes, sprints, tps]
  );

  const contextoIA = useMemo(
    () => serializarContextoParaIA(analytics, tps, sprints),
    [analytics, tps, sprints]
  );

  const PROMPTS: Record<typeof modoIA, string> = {
    semana: `Sos un planificador académico experto. Con base en los datos del estudiante, creá un plan detallado para esta semana.

Estructura tu respuesta así:
1. Análisis rápido de la situación (2-3 líneas)
2. Plan día a día (Lunes a Viernes) — qué estudiar cada día, cuántos temas y de qué materia
3. TPs a priorizar esta semana
4. Recomendación de sprint para la semana
5. Un consejo concreto basado en los datos

Sé específico con nombres de materias y cantidades. Usá lenguaje directo, sin rodeos.`,

    tps: `Sos un planificador académico experto. Analizá los TPs pendientes del estudiante y organizalos en orden de prioridad.

Estructura tu respuesta así:
1. Orden de prioridad de los TPs (del más urgente al menos urgente) con justificación
2. Para cada TP urgente: estimación de horas necesarias y plan de trabajo
3. Qué teoría hay que estudiar ANTES de hacer cada TP (si aplica según la materia)
4. Alertas sobre TPs que pueden entrar en conflicto entre sí por fechas

Sé concreto y práctico.`,

    examen: `Sos un planificador académico experto. Analizá la situación de los exámenes próximos del estudiante.

Estructura tu respuesta así:
1. Ranking de materias por urgencia para estudiar (con justificación numérica)
2. Para cada materia en riesgo: qué hacer concretamente esta semana
3. Materias que pueden esperar
4. Predicción honesta: ¿A qué exámenes va a llegar bien y a cuáles no, al ritmo actual?
5. Qué cambiar en el ritmo para mejorar la situación

No suavices si los números dicen que hay un problema.`,

    libre: `Sos un planificador académico experto. Respondé la siguiente pregunta del estudiante con base en sus datos reales:\n\n"${preguntaLibre}"\n\nSé específico, usá los datos concretos del contexto, y dá recomendaciones accionables.`,
  };

  const callAI = async () => {
    if (modoIA === "libre" && !preguntaLibre.trim()) return;
    setLoading(true);
    setError(null);
    setAiResponse("");

    try {
      const { data: { session } } = await (await import("../../lib/supabase")).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("No autenticado");

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/plan`, {
        method: "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          contexto: contextoIA,
          prompt:   PROMPTS[modoIA],
          modo:     modoIA,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Error ${res.status}`);
      }
      const data = await res.json();
      setAiResponse(data.text ?? "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const { sugerenciasLocales } = analytics;
  const criticas = sugerenciasLocales.filter(s => s.urgencia === "critica");
  const resto    = sugerenciasLocales.filter(s => s.urgencia !== "critica");

  return (
    <div className="pl-view">

      {/* ── Header ── */}
      <div className="pl-top">
        <div>
          <div className="pl-title">Planificador IA</div>
          <div className="pl-sub">Sugerencias basadas en tus datos reales</div>
        </div>
      </div>

      {/* ── Sugerencias locales (instantáneas, sin IA) ── */}
      {sugerenciasLocales.length > 0 && (
        <div className="pl-section">
          <div className="pl-section-header">
            <div className="pl-section-title">⚡ Alertas inmediatas</div>
            <div className="pl-section-sub">Calculado en tiempo real</div>
          </div>
          {criticas.length > 0 && (
            <div className="pl-sugs-list">
              {criticas.map((s, i) => <SuggestionCard key={i} sug={s}/>)}
            </div>
          )}
          {resto.length > 0 && (
            <div className="pl-sugs-list" style={{ marginTop: criticas.length > 0 ? 10 : 0 }}>
              {resto.map((s, i) => <SuggestionCard key={i} sug={s}/>)}
            </div>
          )}
        </div>
      )}

      {/* ── Planificador con IA ── */}
      <div className="pl-section">
        <div className="pl-section-header">
          <div className="pl-section-title">🤖 Plan con IA</div>
          <div className="pl-section-sub">Claude analiza todos tus datos y genera un plan personalizado</div>
        </div>

        {/* Selector de modo */}
        <div className="pl-modo-row">
          {(["semana","tps","examen","libre"] as const).map(m => (
            <button
              key={m}
              className={`pl-modo-btn${modoIA === m ? " active" : ""}`}
              onClick={() => { setModoIA(m); setAiResponse(""); }}
            >
              {m === "semana"  && "📅 Plan semanal"}
              {m === "tps"     && "📝 Organizar TPs"}
              {m === "examen"  && "🎯 Para exámenes"}
              {m === "libre"   && "💬 Pregunta libre"}
            </button>
          ))}
        </div>

        {/* Input pregunta libre */}
        {modoIA === "libre" && (
          <div className="pl-libre-wrap">
            <input
              className="pl-libre-input"
              placeholder="ej: ¿Tengo tiempo de estudiar todo antes de los finales?"
              value={preguntaLibre}
              onChange={e => setPreguntaLibre(e.target.value)}
              onKeyDown={e => e.key === "Enter" && callAI()}
            />
          </div>
        )}

        {/* Contexto que se va a enviar */}
        <details className="pl-ctx-details">
          <summary className="pl-ctx-summary">Ver datos que se envían a la IA</summary>
          <pre className="pl-ctx-pre">{contextoIA}</pre>
        </details>

        {/* Botón generar */}
        <button
          className="pl-generate-btn"
          onClick={callAI}
          disabled={loading || materias.length === 0 || (modoIA === "libre" && !preguntaLibre.trim())}
        >
          {loading ? (
            <span className="pl-loading-row">
              <span className="pl-spinner"/>
              Analizando tus datos…
            </span>
          ) : (
            <>✨ Generar plan con IA</>
          )}
        </button>

        {materias.length === 0 && (
          <div className="pl-no-data">Cargá al menos una materia para usar el planificador.</div>
        )}

        {error && <div className="pl-error">{error}</div>}

        {/* Respuesta IA */}
        {aiResponse && (
          <div className="pl-ai-wrap">
            <div className="pl-ai-header">
              <span className="pl-ai-badge">🤖 Claude</span>
              <span className="pl-ai-model">claude-sonnet-4</span>
              <button className="pl-ai-copy" onClick={() => navigator.clipboard.writeText(aiResponse)}>
                Copiar
              </button>
            </div>
            <AIResponse text={aiResponse}/>
          </div>
        )}
      </div>

    </div>
  );
}
import { useMemo } from "react";
import { useMateriaStore } from "../../store/useMateriaStore";
import { useExamenStore }  from "../../store/useExamenStore";
import { useSprintStore }  from "../../store/useSprintStore";
import { useTPStore }      from "../../store/useTPStore";
import { calcularAnalytics } from "../../lib/analyticsEngine";
import type { MateriaStats } from "../../lib/analyticsEngine";

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtFecha(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("es-AR", {
    day:"numeric", month:"short", year:"numeric"
  });
}

function Ring({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - Math.min(pct, 100) / 100);
  return (
    <svg width={size} height={size} style={{ transform:"rotate(-90deg)", flexShrink:0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none"
        stroke={color} strokeWidth={5} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={dash}
        style={{ transition:"stroke-dashoffset .8s cubic-bezier(.4,0,.2,1)" }}
      />
    </svg>
  );
}

// ── Stat card simple ──────────────────────────────────────────────────────────
function StatCard({ icon, value, label, sub, color = "#a29bfe" }: {
  icon: string; value: string; label: string; sub?: string; color?: string;
}) {
  return (
    <div className="ad-stat-card">
      <div className="ad-stat-icon">{icon}</div>
      <div className="ad-stat-val" style={{ color }}>{value}</div>
      <div className="ad-stat-label">{label}</div>
      {sub && <div className="ad-stat-sub">{sub}</div>}
    </div>
  );
}

// ── Card por materia ──────────────────────────────────────────────────────────
function MateriaCard({ stats }: { stats: MateriaStats }) {
  const { materia, progresoPct, temasPendientes, temasTotal,
          horasEstimadasRestantes, semanasRestantes,
          proximoExamen, diasHastaExamen, enRiesgo } = stats;

  const color   = enRiesgo ? "#FF6B6B"
                : progresoPct >= 80 ? "#55EFC4"
                : progresoPct >= 40 ? "#FECA57"
                : "#a29bfe";

  const dificAvg = materia.units_json?.reduce((s, u) => {
    return s + (u.dificultad === "alta" ? 3 : u.dificultad === "media" ? 2 : 1);
  }, 0) / Math.max(materia.units_json?.length ?? 1, 1);

  const dificLabel = dificAvg >= 2.5 ? "Alta" : dificAvg >= 1.5 ? "Media" : "Baja";
  const dificColor = dificAvg >= 2.5 ? "#FF6B6B" : dificAvg >= 1.5 ? "#FECA57" : "#55EFC4";

  return (
    <div className={`ad-materia-card${enRiesgo ? " en-riesgo" : ""}`}>
      {enRiesgo && <div className="ad-riesgo-banner">⚠️ En riesgo</div>}

      <div className="ad-mc-top">
        <div className="ad-mc-info">
          <div className="ad-mc-nombre">{materia.nombre}</div>
          <div className="ad-mc-meta">
            <span className="ad-mc-dific" style={{ color: dificColor }}>
              ● {dificLabel}
            </span>
            {proximoExamen && (
              <span className="ad-mc-examen" style={{ color: diasHastaExamen! <= 14 ? "#FECA57" : "rgba(255,255,255,.4)" }}>
                📅 {proximoExamen.titulo} en {diasHastaExamen}d
              </span>
            )}
          </div>
        </div>
        <div className="ad-mc-ring-wrap">
          <Ring pct={progresoPct} color={color} size={64}/>
          <div className="ad-mc-ring-pct" style={{ color }}>{progresoPct}%</div>
        </div>
      </div>

      <div className="ad-mc-stats">
        <div className="ad-mc-stat">
          <span className="ad-mc-stat-val">{temasPendientes}</span>
          <span className="ad-mc-stat-lbl">temas pendientes</span>
        </div>
        <div className="ad-mc-stat">
          <span className="ad-mc-stat-val">~{horasEstimadasRestantes}hs</span>
          <span className="ad-mc-stat-lbl">estimadas</span>
        </div>
        <div className="ad-mc-stat">
          <span className="ad-mc-stat-val">{semanasRestantes}sem</span>
          <span className="ad-mc-stat-lbl">al ritmo actual</span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="ad-mc-bar-track">
        <div className="ad-mc-bar-fill" style={{ width:`${progresoPct}%`, background: color }}/>
      </div>
      <div className="ad-mc-bar-labels">
        <span>{temasPendientes} de {temasTotal} temas</span>
        {proximoExamen && (
          <span style={{ color: diasHastaExamen! <= 14 ? "#FECA57" : "rgba(255,255,255,.3)" }}>
            Examen: {fmtFecha(proximoExamen.fecha)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function AnalyticsDashboard() {
  const { materias }  = useMateriaStore();
  const { examenes }  = useExamenStore()  as any;
  const { sprints }   = useSprintStore();
  const { tps }       = useTPStore();

  const analytics = useMemo(
    () => calcularAnalytics(materias, examenes ?? [], sprints, tps),
    [materias, examenes, sprints, tps]
  );

  const {
    horasTotalesRestantes, semanasParaTerminar, fechaEstimadaFinGlobal,
    velocidadReal, velocidadFallback, cargaSemanalNecesaria,
    porMateria, materiasEnRiesgo, tpsVencidosPronto, tpsVencidos,
  } = analytics;

  const completadas  = materias.filter(m => m.progress_percent >= 100).length;
  const totalMaterias = materias.length;

  return (
    <div className="ad-view">

      {/* ── Header ── */}
      <div className="ad-top">
        <div>
          <div className="ad-title">Dashboard</div>
          <div className="ad-sub">Indicadores de progreso académico</div>
        </div>
      </div>

      {/* ── Alertas críticas ── */}
      {(materiasEnRiesgo.length > 0 || tpsVencidos.length > 0) && (
        <div className="ad-alertas">
          {tpsVencidos.length > 0 && (
            <div className="ad-alerta critica">
              🚨 {tpsVencidos.length} TP{tpsVencidos.length > 1 ? "s" : ""} vencido{tpsVencidos.length > 1 ? "s" : ""} sin entregar: {tpsVencidos.map(t => t.titulo).join(", ")}
            </div>
          )}
          {materiasEnRiesgo.length > 0 && (
            <div className="ad-alerta alta">
              ⚠️ {materiasEnRiesgo.length} materia{materiasEnRiesgo.length > 1 ? "s" : ""} en riesgo: {materiasEnRiesgo.map(m => m.nombre).join(", ")}
            </div>
          )}
          {tpsVencidosPronto.length > 0 && (
            <div className="ad-alerta media">
              🔔 {tpsVencidosPronto.length} TP{tpsVencidosPronto.length > 1 ? "s" : ""} vence{tpsVencidosPronto.length > 1 ? "n" : ""} esta semana
            </div>
          )}
        </div>
      )}

      {/* ── Aviso si velocidad es estimada ── */}
      {velocidadFallback && materias.length > 0 && (
        <div className="ad-alerta" style={{ background:"rgba(162,155,254,.08)", borderColor:"rgba(162,155,254,.2)", color:"#a29bfe", borderWidth:1, borderStyle:"solid", borderRadius:11, padding:"11px 14px", fontSize:12, fontWeight:600 }}>
          💡 Sin sprints completados aún — los tiempos se calculan con una velocidad estimada de 2 temas/día. Completá un sprint para ver tu velocidad real.
        </div>
      )}

      {/* ── Stats globales ── */}
      <div className="ad-stats-grid">
        <StatCard icon="⏱️" value={`${horasTotalesRestantes}hs`}
          label="Horas restantes estimadas"
          sub="Para terminar todas las materias"
          color="#a29bfe" />
        <StatCard icon="📅" value={`${semanasParaTerminar} sem`}
          label="Semanas para terminar"
          sub={`~${fmtFecha(fechaEstimadaFinGlobal)}`}
          color="#FECA57" />
        <StatCard icon="⚡" value={velocidadFallback ? "~2/día" : `${velocidadReal.toFixed(1)}/día`}
          label="Velocidad de estudio"
          sub={velocidadFallback ? "Estimada (sin sprints)" : "Temas completados promedio"}
          color={velocidadFallback ? "rgba(255,255,255,.4)" : "#55EFC4"} />
        <StatCard icon="📚" value={`${cargaSemanalNecesaria}/sem`}
          label="Carga necesaria"
          sub="Temas/semana para llegar a exámenes"
          color="#FF9F43" />
        <StatCard icon="✅" value={`${completadas}/${totalMaterias}`}
          label="Materias completadas"
          sub={`${totalMaterias - completadas} en progreso`}
          color="#55EFC4" />
        <StatCard icon="⚠️" value={`${materiasEnRiesgo.length}`}
          label="Materias en riesgo"
          sub="No llegan al examen al ritmo actual"
          color={materiasEnRiesgo.length > 0 ? "#FF6B6B" : "#55EFC4"} />
      </div>

      {/* ── Velocidad visual ── */}
      {!velocidadFallback && (
        <div className="ad-velocity-card">
          <div className="ad-velocity-left">
            <div className="ad-velocity-title">Tu ritmo de estudio</div>
            <div className="ad-velocity-sub">Basado en los últimos 60 días</div>
            <div className="ad-velocity-bars">
              {[0.5, 1, 1.5, 2, 3, 4].map(ref => (
                <div key={ref} className="ad-vel-ref">
                  <div className="ad-vel-ref-bar-wrap">
                    <div className="ad-vel-ref-bar"
                      style={{
                        height: `${Math.min(100, (velocidadReal / ref) * 60)}%`,
                        background: velocidadReal >= ref ? "#55EFC4" : "rgba(255,255,255,.1)"
                      }}
                    />
                  </div>
                  <span className="ad-vel-ref-label">{ref}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="ad-velocity-right">
            <div className="ad-velocity-big" style={{ color: velocidadReal >= 1 ? "#55EFC4" : "#FECA57" }}>
              {velocidadReal.toFixed(2)}
            </div>
            <div className="ad-velocity-unit">temas/día</div>
            <div className="ad-velocity-rating">
              {velocidadReal >= 2 ? "🚀 Excelente" :
               velocidadReal >= 1 ? "✅ Buen ritmo" :
               velocidadReal >= 0.5 ? "⚠️ Ritmo bajo" : "🔴 Muy lento"}
            </div>
          </div>
        </div>
      )}

      {/* ── Por materia ── */}
      {porMateria.length > 0 && (
        <div className="ad-section">
          <div className="ad-section-title">Progreso por materia</div>
          <div className="ad-materias-grid">
            {porMateria
              .sort((a, b) => {
                if (a.enRiesgo !== b.enRiesgo) return a.enRiesgo ? -1 : 1;
                return (a.diasHastaExamen ?? 999) - (b.diasHastaExamen ?? 999);
              })
              .map(stats => (
                <MateriaCard key={stats.materia.id} stats={stats}/>
              ))
            }
          </div>
        </div>
      )}

      {/* Empty state */}
      {materias.length === 0 && (
        <div className="ad-empty">
          <div className="ad-empty-icon">📊</div>
          <div className="ad-empty-title">Sin datos suficientes</div>
          <div className="ad-empty-sub">Cargá materias, exámenes y completá algunos sprints para ver los indicadores.</div>
        </div>
      )}
    </div>
  );
}
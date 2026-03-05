import { useAppStore, useMateriaStore, useExamenStore } from "../store";
import type { View } from "../store";


const TIPO_COLOR: Record<string, string> = {
  parcial: "#6C5CE7", final: "#FF6B6B", recuperatorio: "#FF9F43", otro: "#48CAE4",
};

const NAV_ITEMS: { view: View; icon: string; label: string }[] = [
  { view: "list",     icon: "📚", label: "Materias"   },
  { view: "sprint",   icon: "🚀", label: "Sprints"    },
  { view: "schedule",     icon: "🗓️", label: "Horarios"       },
  { view: "time-control", icon: "⏱️", label: "Tiempo"         },
  { view: "calendar", icon: "📅", label: "Calendario" },
];

function getDias(fecha: string) {
  const hoy  = new Date(); hoy.setHours(0,0,0,0);
  const exam = new Date(fecha + "T00:00:00");
  return Math.round((exam.getTime() - hoy.getTime()) / 86400000);
}

interface Props { onUpload: () => void; onShare?: () => void; onLogout?: () => void; }

export function Sidebar({ onUpload, onShare, onLogout }: Props) {
  const view       = useAppStore((s) => s.view);
  const setView    = useAppStore((s) => s.setView);
  const goToList   = useAppStore((s) => s.goToList);

  const materias   = useMateriaStore((s) => s.materias);
  const examenes   = useExamenStore((s) => s.examenes);

  const totalMaterias  = materias.length;
  const completadas    = materias.filter((m) => m.progress_percent === 100).length;
  const enProgreso     = materias.filter((m) => m.progress_percent > 0 && m.progress_percent < 100).length;

  // Próximos 3 exámenes (con fecha futura)
  const proximos = examenes
    .filter((e) => getDias(e.fecha) >= 0)
    .slice(0, 3);

  return (
    <>      <aside className="sidebar">

        {/* Logo */}
        <div className="sb-logo" onClick={goToList}>
          <div className="sb-logo-icon">🗺️</div>
          <div className="sb-logo-text">
            <div className="sb-logo-title">StudyMap <span>AI</span></div>
            <div className="sb-logo-sub">Organizá tu estudio</div>
          </div>
        </div>

        {/* Nav principal */}
        <nav className="sb-nav">
          <div className="sb-section">Navegación</div>

          {NAV_ITEMS.map((item) => (
            <button
              key={item.view}
              className={`sb-item${view === item.view ? " active" : ""}`}
              onClick={() => setView(item.view)}
            >
              <span className="sb-item-icon">{item.icon}</span>
              <span className="sb-item-label">{item.label}</span>
              {item.view === "list" && totalMaterias > 0 && (
                <span className="sb-item-badge">{totalMaterias}</span>
              )}
            </button>
          ))}

          {/* Próximos exámenes en sidebar */}
          {proximos.length > 0 && (
            <>
              <div className="sb-section" style={{ marginTop: 8 }}>Próximos exámenes</div>
              <div className="sb-exam-list">
                {proximos.map((e) => {
                  const dias = getDias(e.fecha);
                  return (
                    <div key={e.id} className="sb-exam-item"
                      style={{ cursor: "pointer" }}
                      onClick={() => setView("calendar")}
                    >
                      <div className="sb-exam-dot" style={{ background: TIPO_COLOR[e.tipo] ?? "#a29bfe" }}/>
                      <div className="sb-exam-info">
                        <div className="sb-exam-name">{e.titulo}</div>
                        <div className="sb-exam-date">
                          {new Date(e.fecha + "T00:00:00").toLocaleDateString("es-AR", { day:"numeric", month:"short" })}
                        </div>
                      </div>
                      <div className="sb-exam-dias">
                        {dias === 0 ? "¡Hoy!" : `${dias}d`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </nav>

        {/* Botón compartir */}
        {onShare && totalMaterias > 0 && (
          <button
            style={{
              margin:"0 12px 8px", display:"flex", alignItems:"center",
              justifyContent:"center", gap:7,
              background:"rgba(255,255,255,.07)", border:"1px solid rgba(255,255,255,.1)",
              color:"rgba(255,255,255,.55)", padding:"9px", borderRadius:12,
              cursor:"pointer", fontSize:12, fontWeight:700,
            }}
            onClick={onShare}
          >
            📤 Compartir progreso
          </button>
        )}

        {/* Botón nueva materia */}
        <button className="sb-upload-btn" onClick={onUpload}>
          ✦ Nueva materia
        </button>

        {/* Stats footer */}
        <div className="sb-footer">
          <div className="sb-footer-title">Resumen</div>
          <div className="sb-stats">
            <div className="sb-stat">
              <div className="sb-stat-val">{totalMaterias}</div>
              <div className="sb-stat-lbl">Materias</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-val" style={{ color: "#55EFC4" }}>{completadas}</div>
              <div className="sb-stat-lbl">Completadas</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-val" style={{ color: "#FF9F43" }}>{enProgreso}</div>
              <div className="sb-stat-lbl">En curso</div>
            </div>
            <div className="sb-stat">
              <div className="sb-stat-val" style={{ color: "#a29bfe" }}>{examenes.length}</div>
              <div className="sb-stat-lbl">Exámenes</div>
            </div>
          </div>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                marginTop:10, width:"100%", background:"rgba(255,107,107,.08)",
                border:"1px solid rgba(255,107,107,.18)", color:"rgba(255,107,107,.7)",
                borderRadius:10, padding:"8px", cursor:"pointer",
                fontSize:11, fontWeight:700, transition:"all .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,107,107,.18)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,107,107,.08)")}
            >
              → Cerrar sesión
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
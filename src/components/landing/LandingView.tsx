import { useAppStore } from "../../store";

export function LandingView() {
  const setView = useAppStore(s => s.setView);

  return (
    <div className="lv">

      {/* ── Noise overlay ── */}
      <div className="lv-noise" />

      {/* ── Orbes de fondo ── */}
      <div className="lv-orb lv-orb-1" />
      <div className="lv-orb lv-orb-2" />
      <div className="lv-orb lv-orb-3" />

      {/* ════════════════════════════════════
          HERO
      ════════════════════════════════════ */}
      <section className="lv-hero">
        <div className="lv-mvp-badge">
          <span className="lv-mvp-dot" />
          MVP · En desarrollo activo
        </div>

        <h1 className="lv-hero-title">
          Estudiá con<br />
          <span className="lv-gradient-text">inteligencia</span>
        </h1>

        <p className="lv-hero-sub">
          StudyMap AI analiza tu programa de estudios y crea un mapa personalizado
          para que siempre sepas qué estudiar, cuánto te falta, y cómo vas.
        </p>

        <div className="lv-hero-ctas">
          <button className="lv-cta-primary" onClick={() => setView("upload")}>
            Empezar gratis →
          </button>
          <button className="lv-cta-ghost" onClick={() => {
            document.getElementById("lv-features")?.scrollIntoView({ behavior: "smooth" });
          }}>
            Ver cómo funciona
          </button>
        </div>

        <div className="lv-hero-tags">
          {["Sin tarjeta de crédito", "100% gratis por ahora", "IA con tu programa real"].map(t => (
            <span key={t} className="lv-tag">✓ {t}</span>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          SCREENSHOTS
      ════════════════════════════════════ */}
      <section className="lv-screenshots">
        <div className="lv-screen-grid">

          {/* Screenshot principal — materias */}
          <div className="lv-screen-main">
            <div className="lv-screen-label">Vista de materias</div>
            <div className="lv-screen-frame lv-screen-frame-desktop">
              <div className="lv-screen-bar">
                <span /><span /><span />
              </div>
              <img
                src="/screenshots/materias.png"
                alt="Vista de materias en StudyMap"
                className="lv-screen-img"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              {/* Fallback UI si no hay imagen */}
              <div className="lv-screen-mock lv-mock-materias">
                <div className="lv-mock-topbar">
                  <div className="lv-mock-greeting">¡Buenos días! 🌅</div>
                  <div className="lv-mock-streak">🔥 3 días</div>
                </div>
                <div className="lv-mock-search" />
                <div className="lv-mock-filters">
                  <div className="lv-mock-filter active">Todas</div>
                  <div className="lv-mock-filter">2do cuatrimestre</div>
                  <div className="lv-mock-filter">1er cuatrimestre</div>
                </div>
                <div className="lv-mock-grid">
                  {[
                    { nombre: "Análisis de Sistemas", pct: 0,   color: "#6C5CE7" },
                    { nombre: "Arquitectura de Comp.", pct: 0,   color: "#FF6B6B" },
                    { nombre: "Sistemas Operativos",   pct: 19,  color: "#FECA57" },
                    { nombre: "Sistemas y Procesos",   pct: 100, color: "#55EFC4" },
                  ].map(m => (
                    <div key={m.nombre} className="lv-mock-card">
                      <div className="lv-mock-card-icon" style={{ background: `${m.color}22`, color: m.color }}>📚</div>
                      <div className="lv-mock-card-body">
                        <div className="lv-mock-card-name">{m.nombre}</div>
                        <div className="lv-mock-card-bar">
                          <div className="lv-mock-card-fill" style={{ width: `${m.pct}%`, background: m.color }} />
                        </div>
                      </div>
                      <div className="lv-mock-card-pct" style={{ color: m.pct === 100 ? "#55EFC4" : m.pct > 0 ? "#FECA57" : "rgba(255,255,255,.3)" }}>
                        {m.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Screenshots secundarios */}
          <div className="lv-screen-secondary">

            {/* Roadmap */}
            <div className="lv-screen-frame lv-screen-frame-mobile">
              <div className="lv-screen-label">Roadmap de la materia</div>
              <div className="lv-mock-roadmap">
                <div className="lv-mock-rm-header">
                  <div className="lv-mock-rm-title">Análisis de Sistemas</div>
                  <div className="lv-mock-rm-stats">
                    <span>7 unidades</span>
                    <span>67 temas</span>
                  </div>
                </div>
                {[
                  { n:1, t:"Captura de Requisitos",       pct: 0,   color:"#FF6B6B", sem:"4 sem." },
                  { n:2, t:"Análisis de Sistemas",        pct: 0,   color:"#FECA57", sem:"8 sem." },
                  { n:3, t:"Pasando al Diseño",           pct: 0,   color:"#55EFC4", sem:"3 sem." },
                  { n:4, t:"Modelo y Arquitectura",       pct: 0,   color:"#6C5CE7", sem:"5 sem." },
                ].map(u => (
                  <div key={u.n} className="lv-mock-rm-unit">
                    <div className="lv-mock-rm-num" style={{ background: u.color }}>{u.n}</div>
                    <div className="lv-mock-rm-body">
                      <div className="lv-mock-rm-name">{u.t}</div>
                      <div className="lv-mock-rm-sem" style={{ color: u.color }}>{u.sem}</div>
                    </div>
                    <div className="lv-mock-rm-pct">{u.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Horarios */}
            <div className="lv-screen-frame lv-screen-frame-mobile">
              <div className="lv-screen-label">Grilla de horarios</div>
              <div className="lv-mock-schedule">
                <div className="lv-mock-sch-header">
                  {["Lun","Mar","Mié","Jue","Vie"].map(d => (
                    <div key={d} className="lv-mock-sch-day">{d}</div>
                  ))}
                </div>
                <div className="lv-mock-sch-grid">
                  {[
                    { day:0, top:15, h:18, color:"#6C5CE7", label:"Análisis" },
                    { day:1, top:30, h:15, color:"#FF6B6B", label:"Arquitectura" },
                    { day:2, top:15, h:18, color:"#55EFC4", label:"SO Teoría" },
                    { day:3, top:45, h:12, color:"#FECA57", label:"Algoritmos" },
                    { day:4, top:20, h:15, color:"#FF9F43", label:"Redes" },
                    { day:1, top:55, h:15, color:"#6C5CE7", label:"Análisis" },
                  ].map((c, i) => (
                    <div key={i} className="lv-mock-sch-clase" style={{
                      left: `calc(${c.day * 20}% + 2px)`,
                      top:  `${c.top}%`,
                      height: `${c.h}%`,
                      background: `${c.color}25`,
                      borderLeftColor: c.color,
                      width: "18%",
                    }}>
                      <span style={{ color: c.color }}>{c.label}</span>
                    </div>
                  ))}
                  {[0,1,2,3,4].map(i => (
                    <div key={i} className="lv-mock-sch-col" style={{ left:`${i*20}%` }} />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ════════════════════════════════════
          FEATURES
      ════════════════════════════════════ */}
      <section className="lv-features" id="lv-features">
        <div className="lv-section-label">Funcionalidades</div>
        <h2 className="lv-section-title">Todo lo que necesitás para rendir mejor</h2>

        <div className="lv-features-grid">
          {[
            { icon:"🤖", title:"IA que entiende tu programa",   desc:"Subí el PDF o pegá el programa. La IA lo analiza y crea un mapa de unidades y temas automáticamente." },
            { icon:"🚀", title:"Sprints de estudio",            desc:"Organizá lo que vas a estudiar esta semana con metodología Scrum. Daily check-in y retrospectiva incluidos." },
            { icon:"🗓️", title:"Horario de cursada",           desc:"Cargá tu horario semanal y visualizalo en una grilla. Sabés de un vistazo qué tenés cada día." },
            { icon:"📅", title:"Calendario de exámenes",        desc:"Registrá tus parciales y finales. Te avisa cuántos días faltan y qué tenés que repasar." },
            { icon:"🔥", title:"Racha de estudio",              desc:"Un contador diario que te incentiva a mantener la constancia. Meta de temas por día configurable." },
            { icon:"📈", title:"Seguimiento de progreso",       desc:"Cada tema que marcás como hecho actualiza el progreso de la materia en tiempo real." },
          ].map(f => (
            <div key={f.title} className="lv-feature-card">
              <div className="lv-feature-icon">{f.icon}</div>
              <div className="lv-feature-title">{f.title}</div>
              <div className="lv-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          CÓMO FUNCIONA
      ════════════════════════════════════ */}
      <section className="lv-how">
        <div className="lv-section-label">Cómo funciona</div>
        <h2 className="lv-section-title">En 3 pasos</h2>

        <div className="lv-steps">
          {[
            { n:"01", icon:"📄", title:"Subí tu programa",     desc:"PDF, texto o link. La IA lo procesa en segundos." },
            { n:"02", icon:"🗺️", title:"La IA crea tu mapa",  desc:"Unidades, temas, duración estimada y dificultad." },
            { n:"03", icon:"📈", title:"Estudiá con foco",     desc:"Marcá temas, creá sprints, seguí tu progreso." },
          ].map((s, i) => (
            <div key={s.n} className="lv-step">
              <div className="lv-step-num">{s.n}</div>
              <div className="lv-step-icon">{s.icon}</div>
              <div className="lv-step-title">{s.title}</div>
              <div className="lv-step-desc">{s.desc}</div>
              {i < 2 && <div className="lv-step-arrow">→</div>}
            </div>
          ))}
        </div>
      </section>

      {/* ════════════════════════════════════
          MVP HONEST SECTION
      ════════════════════════════════════ */}
      <section className="lv-mvp">
        <div className="lv-mvp-card">
          <div className="lv-mvp-icon">🛠️</div>
          <h2 className="lv-mvp-title">Esto es un MVP</h2>
          <p className="lv-mvp-text">
            StudyMap está en desarrollo activo. Todavía no está lanzado a producción
            y lo seguimos construyendo. Si lo usás ahora sos un early adopter —
            tu feedback moldea directamente el producto.
          </p>
          <div className="lv-mvp-items">
            <div className="lv-mvp-item">
              <span className="lv-mvp-item-icon">✅</span>
              <span>Funcional y usable hoy</span>
            </div>
            <div className="lv-mvp-item">
              <span className="lv-mvp-item-icon">🔧</span>
              <span>Features nuevas cada semana</span>
            </div>
            <div className="lv-mvp-item">
              <span className="lv-mvp-item-icon">🆓</span>
              <span>100% gratis mientras crecemos</span>
            </div>
            <div className="lv-mvp-item">
              <span className="lv-mvp-item-icon">💬</span>
              <span>Tu feedback tiene impacto real</span>
            </div>
          </div>
          <a href="mailto:hola@studymap.ai" className="lv-mvp-feedback">
            Mandanos feedback →
          </a>
        </div>
      </section>

      {/* ════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════ */}
      <section className="lv-cta-final">
        <h2 className="lv-cta-title">Empezá a estudiar mejor hoy</h2>
        <p className="lv-cta-sub">Sin registro complicado. Subí un programa y en segundos tenés tu mapa.</p>
        <button className="lv-cta-primary lv-cta-big" onClick={() => setView("upload")}>
          Crear mi primer mapa →
        </button>
      </section>

      {/* ════════════════════════════════════
          FOOTER
      ════════════════════════════════════ */}
      <footer className="lv-footer">
        <div className="lv-footer-logo">StudyMap AI</div>
        <div className="lv-footer-sub">Hecho con ☕ para estudiantes</div>
        <div className="lv-footer-links">
          <button onClick={() => setView("upload")} className="lv-footer-link">Empezar</button>
          <a href="mailto:hola@studymap.ai" className="lv-footer-link">Contacto</a>
        </div>
      </footer>

    </div>
  );
}
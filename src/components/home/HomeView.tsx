import { useState, useEffect } from "react";
import { useTareasStore }  from "../../store/useTareasStore";
import { useTPStore }      from "../../store/useTPStore";
import { useExamenStore }  from "../../store/useExamenStore";
import { useSesionStore }  from "../../store/useSesionStore";
import { useMateriaStore } from "../../store/useMateriaStore";
import { useSprintStore }  from "../../store/useSprintStore";
import { useGCalStore }    from "../../store/useGCalStore";
import { useAppStore }     from "../../store";
import type { TareaPrioridad } from "../../store/useTareasStore";
import type { TPRow } from "../../types";
import type { GCalEvent } from "../../store/useGCalStore";

// ── Helpers ───────────────────────────────────────────────────────────────────
function hoy() { return new Date().toISOString().split("T")[0]; }
function diasHasta(f: string) {
  return Math.ceil((new Date(f+"T00:00:00").getTime() - Date.now()) / 86400000);
}
function fmtFecha(s: string) {
  return new Date(s+"T00:00:00").toLocaleDateString("es-AR",{day:"numeric",month:"short"});
}
function fmtHora(s: string) {
  return new Date(s).toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
}
function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
}

const PRIO_COLOR: Record<TareaPrioridad, string> = {
  alta:"#D94040", media:"#C98A00", baja:"#3B6FE0"
};
const PRIO_LABEL: Record<TareaPrioridad, string> = {
  alta:"Alta", media:"Media", baja:"Baja"
};

// ── Quick Add ─────────────────────────────────────────────────────────────────
function QuickAdd({ onClose }: { onClose: () => void }) {
  const { createTarea } = useTareasStore();
  const [titulo,    setTitulo]    = useState("");
  const [prioridad, setPrioridad] = useState<TareaPrioridad>("media");
  const [fecha,     setFecha]     = useState("");
  const [saving,    setSaving]    = useState(false);

  const save = async () => {
    if (!titulo.trim()) return;
    setSaving(true);
    await createTarea({ titulo: titulo.trim(), descripcion: null, prioridad, completada: false, fecha_limite: fecha || null });
    setSaving(false);
    onClose();
  };

  return (
    <div className="hv2-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="hv2-quickadd">
        <div className="hv2-qa-header">
          <span className="hv2-qa-title">Nueva tarea</span>
          <button className="hv2-qa-close" onClick={onClose}>✕</button>
        </div>
        <input
          autoFocus
          className="hv2-qa-input"
          placeholder="¿Qué tenés que hacer?"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          onKeyDown={e => e.key === "Enter" && save()}
        />
        <div className="hv2-qa-row">
          <div className="hv2-qa-prio-group">
            {(["alta","media","baja"] as TareaPrioridad[]).map(p => (
              <button key={p}
                className={`hv2-qa-prio${prioridad===p?" sel":""}`}
                style={prioridad===p ? {borderColor:PRIO_COLOR[p], color:PRIO_COLOR[p], background:`${PRIO_COLOR[p]}14`} : {}}
                onClick={() => setPrioridad(p)}
              >{PRIO_LABEL[p]}</button>
            ))}
          </div>
          <input type="date" className="hv2-qa-date" value={fecha} min={hoy()} onChange={e => setFecha(e.target.value)} />
        </div>
        <button className="hv2-qa-save" disabled={!titulo.trim()||saving} onClick={save}>
          {saving ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </div>
  );
}

// ── Stack item ────────────────────────────────────────────────────────────────
interface StackItem { id:string; titulo:string; sub:string; urgency:string; color:string; dias?:number }

function StackCard({ items, title, icon, empty, onDone }: {
  items: StackItem[]; title: string; icon: string; empty: string;
  onDone: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = items.filter(i => !dismissed.includes(i.id));
  const top = visible[0];

  const dismiss = (id: string) => {
    setDismissed(d => [...d, id]);
    onDone(id);
  };

  return (
    <div className="hv2-stack">
      <div className="hv2-stack-head">
        <span className="hv2-stack-icon">{icon}</span>
        <span className="hv2-stack-title">{title}</span>
        <span className="hv2-stack-badge">{visible.length}</span>
      </div>

      {visible.length === 0 ? (
        <div className="hv2-stack-empty">{empty}</div>
      ) : (
        <div className="hv2-stack-body">
          {/* Depth cards */}
          {visible.length > 2 && <div className="hv2-stack-ghost g3" />}
          {visible.length > 1 && <div className="hv2-stack-ghost g2" />}

          {/* Top card */}
          <div className="hv2-stack-top" style={{"--sk-color":top.color} as React.CSSProperties}>
            <div className="hv2-sk-left">
              <div className="hv2-sk-indicator" style={{background:top.color}} />
              <div className="hv2-sk-content">
                <div className="hv2-sk-titulo">{top.titulo}</div>
                <div className="hv2-sk-sub">{top.sub}</div>
              </div>
            </div>
            <div className="hv2-sk-right">
              <span className="hv2-sk-urgency" style={{color:top.color}}>{top.urgency}</span>
              <button className="hv2-sk-done" onClick={() => dismiss(top.id)}>✓</button>
            </div>
          </div>

          {/* Queue below */}
          {visible.slice(1,3).map((item,i) => (
            <div key={item.id} className="hv2-stack-queued" style={{opacity:1-i*.25, transform:`scale(${1-i*.02}) translateY(${-i*2}px)`}}>
              <span className="hv2-skq-dot" style={{background:item.color}} />
              <span className="hv2-skq-titulo">{item.titulo}</span>
              <span className="hv2-skq-urgency" style={{color:item.color}}>{item.urgency}</span>
            </div>
          ))}
          {visible.length > 3 && (
            <div className="hv2-stack-more">+{visible.length-3} más</div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mini calendario ───────────────────────────────────────────────────────────
function Cal({ events, examenes }: { events: GCalEvent[]; examenes: any[] }) {
  const [mes, setMes] = useState(() => {
    const d = new Date(); return {y:d.getFullYear(),m:d.getMonth()};
  });
  const hoyStr = hoy();
  const first = new Date(mes.y, mes.m, 1);
  const last  = new Date(mes.y, mes.m+1, 0);
  const start = (first.getDay()+6)%7;
  const MESES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const DIAS  = ["L","M","X","J","V","S","D"];

  const byDate: Record<string, string[]> = {};
  events.forEach(e => {
    const d = e.start.split("T")[0];
    byDate[d] = [...(byDate[d]||[]), e.color];
  });
  (examenes||[]).forEach((e:any) => {
    if (!e.aprobado) byDate[e.fecha] = [...(byDate[e.fecha]||[]), "#D94040"];
  });

  const cells = Math.ceil((start + last.getDate()) / 7) * 7;

  return (
    <div className="hv2-cal">
      <div className="hv2-cal-nav">
        <button onClick={() => setMes(m => m.m===0?{y:m.y-1,m:11}:{y:m.y,m:m.m-1})}>‹</button>
        <span>{MESES[mes.m]} {mes.y}</span>
        <button onClick={() => setMes(m => m.m===11?{y:m.y+1,m:0}:{y:m.y,m:m.m+1})}>›</button>
      </div>
      <div className="hv2-cal-grid">
        {DIAS.map(d => <div key={d} className="hv2-cal-dow">{d}</div>)}
        {Array.from({length:cells}).map((_,i) => {
          const day = i - start + 1;
          if (day<1||day>last.getDate()) return <div key={i} className="hv2-cal-empty"/>;
          const ds = `${mes.y}-${String(mes.m+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const dots = byDate[ds] ?? [];
          const isHoy = ds === hoyStr;
          return (
            <div key={i} className={`hv2-cal-day${isHoy?" today":""}`}>
              <span>{day}</span>
              {dots.length>0 && (
                <div className="hv2-cal-dots">
                  {dots.slice(0,3).map((c,j) => <span key={j} style={{background:c}} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Eventos de hoy */}
      {events.filter(e => e.start.split("T")[0]===hoyStr).length > 0 && (
        <div className="hv2-cal-today">
          {events.filter(e => e.start.split("T")[0]===hoyStr).map(e => (
            <a key={e.id} href={e.htmlLink} target="_blank" rel="noreferrer" className="hv2-cal-ev">
              <span style={{background:e.color}} className="hv2-cal-ev-dot"/>
              <span className="hv2-cal-ev-name">{e.summary}</span>
              {!e.allDay && <span className="hv2-cal-ev-time">{fmtHora(e.start)}</span>}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vista principal ───────────────────────────────────────────────────────────
export function HomeView() {
  const { tareas, fetchTareas, topTareas, toggleTarea } = useTareasStore();
  const { tps }        = useTPStore();
  const { examenes }   = useExamenStore() as any;
  const { historial }  = useSesionStore();
  const { materias }   = useMateriaStore();
  const { sprints }    = useSprintStore();
  const gcal           = useGCalStore();
  const setView        = useAppStore(s => s.setView);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    fetchTareas();
    if (gcal.connected) gcal.fetchEvents();
  }, []);

  // ── Datos para stacks ────────────────────────────────────────────────────
  const pilaExamenes: StackItem[] = (examenes||[])
    .filter((e:any) => !e.aprobado && diasHasta(e.fecha) >= 0)
    .sort((a:any,b:any) => diasHasta(a.fecha)-diasHasta(b.fecha))
    .slice(0,8)
    .map((e:any) => {
      const d = diasHasta(e.fecha);
      const mat = materias.find(m=>m.id===e.materia_id);
      return {
        id:e.id, titulo:e.titulo,
        sub: mat?.nombre ?? "",
        urgency: d===0?"HOY" : d===1?"Mañana" : `${d}d`,
        color: d<=3?"#D94040":d<=7?"#C98A00":"rgba(240,240,240,.4)",
        dias:d,
      };
    });

  const tareaItems: StackItem[] = [
    ...topTareas().map(t => ({
      id:t.id, titulo:t.titulo,
      sub: t.fecha_limite ? `Límite: ${fmtFecha(t.fecha_limite)}` : "Sin fecha",
      urgency: t.prioridad==="alta"?"Urgente":t.prioridad==="media"?"Esta semana":"Cuando puedas",
      color: PRIO_COLOR[t.prioridad],
    })),
    ...(tps||[])
      .filter((t:TPRow) => t.estado!=="entregado")
      .sort((a:TPRow,b:TPRow) => diasHasta(a.fecha_entrega)-diasHasta(b.fecha_entrega))
      .slice(0,5)
      .map((t:TPRow) => {
        const d = diasHasta(t.fecha_entrega);
        return {
          id:t.id, titulo:t.titulo,
          sub:`TP · ${t.materia_nombre}`,
          urgency: d<=0?"VENCIDO":d<=3?`${d}d`:fmtFecha(t.fecha_entrega),
          color: d<=0?"#D94040":d<=3?"#C98A00":"rgba(240,240,240,.4)",
          dias:d,
        };
      }),
  ].slice(0,10);

  // ── Stats rápidos ──────────────────────────────────────────────────────────
  const hoyData    = historial.find(s => s.fecha===hoy());
  const activoSprints = sprints.filter(s => s.status==="active");
  const temasPendientes = materias.reduce((s,m) => s+(m.units_json??[]).reduce((a,u)=> a+(u.temaStatus??[]).filter((t:string)=>t!=="done").length,0),0);
  const materiasEnCurso = materias.filter(m=>m.progress_percent>0&&m.progress_percent<100).length;

  // ── Materias recientes ────────────────────────────────────────────────────
  const recientes = historial
    .flatMap(s => s.materias||[])
    .reduce((acc:any[], m:any) => {
      if (!acc.find((x:any) => x.materia_id===m.materia_id)) acc.push(m);
      return acc;
    }, [])
    .slice(0,4);

  return (
    <div className="hv2">

      {/* ── Top bar ── */}
      <div className="hv2-topbar">
        <div className="hv2-topbar-left">
          <div className="hv2-greeting">{greeting()}</div>
          <div className="hv2-date">
            {new Date().toLocaleDateString("es-AR",{weekday:"long",day:"numeric",month:"long"})}
          </div>
        </div>
        <button className="hv2-add-btn" onClick={() => setShowAdd(true)}>
          <span>＋</span> Tarea
        </button>
      </div>

      {/* ── Stat row ── */}
      <div className="hv2-stats">
        <div className="hv2-stat" onClick={() => setView("time-control")}>
          <div className="hv2-stat-val" style={{color:"#3B6FE0"}}>
            {hoyData?.temas_count ?? 0}
          </div>
          <div className="hv2-stat-lbl">temas hoy</div>
        </div>
        <div className="hv2-stat-div" />
        <div className="hv2-stat" onClick={() => setView("sprint")}>
          <div className="hv2-stat-val" style={{color:"#18A058"}}>
            {activoSprints.length}
          </div>
          <div className="hv2-stat-lbl">sprint{activoSprints.length!==1?"s":""} activo{activoSprints.length!==1?"s":""}</div>
        </div>
        <div className="hv2-stat-div" />
        <div className="hv2-stat" onClick={() => setView("list")}>
          <div className="hv2-stat-val">
            {materiasEnCurso}
          </div>
          <div className="hv2-stat-lbl">en cursado</div>
        </div>
        <div className="hv2-stat-div" />
        <div className="hv2-stat" onClick={() => setView("dashboard")}>
          <div className="hv2-stat-val" style={{color:"#C98A00"}}>
            {temasPendientes}
          </div>
          <div className="hv2-stat-lbl">temas pend.</div>
        </div>
      </div>

      {/* ── Sprint activo banner ── */}
      {activoSprints.length > 0 && (
        <div className="hv2-sprint-banner" onClick={() => setView("sprint")}>
          {activoSprints.map(s => {
            const done  = s.temas.filter(t=>t.done).length;
            const total = s.temas.length;
            const pct   = total>0 ? Math.round(done/total*100) : 0;
            return (
              <div key={s.id} className="hv2-sprint-item">
                <div className="hv2-sprint-left">
                  <span className="hv2-sprint-icon">🚀</span>
                  <div>
                    <div className="hv2-sprint-name">{s.nombre}</div>
                    <div className="hv2-sprint-prog">{done}/{total} temas · {pct}%</div>
                  </div>
                </div>
                <div className="hv2-sprint-bar-wrap">
                  <div className="hv2-sprint-bar" style={{width:`${pct}%`}} />
                </div>
                <span className="hv2-sprint-arrow">→</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Main grid ── */}
      <div className="hv2-main">

        {/* Columna izquierda: stacks */}
        <div className="hv2-col-stacks">
          <StackCard
            items={pilaExamenes}
            title="Exámenes"
            icon="📅"
            empty="Sin exámenes próximos"
            onDone={() => setView("calendar")}
          />
          <StackCard
            items={tareaItems}
            title="Tareas pendientes"
            icon="📋"
            empty="Todo al día ✓"
            onDone={(id) => {
              const esTarea = tareas.find(t=>t.id===id);
              if (esTarea) toggleTarea(id);
              else setView("tps");
            }}
          />
        </div>

        {/* Columna derecha: calendario */}
        <div className="hv2-col-cal">
          <div className="hv2-col-header">
            <span>Calendario</span>
            {!gcal.connected && (
              <button className="hv2-gcal-btn" onClick={gcal.connect} disabled={gcal.loading}>
                {gcal.loading ? "Conectando…" : "＋ Google Cal"}
              </button>
            )}
            {gcal.connected && (
              <button className="hv2-gcal-refresh" onClick={gcal.fetchEvents} disabled={gcal.loading}>↻</button>
            )}
          </div>
          <Cal events={gcal.events} examenes={examenes||[]} />
        </div>

      </div>

      {/* ── Accesos rápidos ── */}
      {recientes.length > 0 && (
        <div className="hv2-recent">
          <div className="hv2-recent-title">Seguir estudiando</div>
          <div className="hv2-recent-grid">
            {recientes.map((r:any) => {
              const mat = materias.find(m=>m.id===r.materia_id);
              if (!mat) return null;
              const pct = mat.progress_percent;
              return (
                <button key={r.materia_id} className="hv2-recent-card"
                  onClick={() => setView("roadmap")}>
                  <div className="hv2-rc-top">
                    <span className="hv2-rc-emoji">📚</span>
                    <span className="hv2-rc-pct" style={{color:pct>=80?"#18A058":pct>=40?"#C98A00":"rgba(240,240,240,.4)"}}>
                      {pct}%
                    </span>
                  </div>
                  <div className="hv2-rc-name">{mat.nombre.length>26?mat.nombre.slice(0,26)+"…":mat.nombre}</div>
                  <div className="hv2-rc-bar">
                    <div className="hv2-rc-fill" style={{width:`${pct}%`}} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showAdd && <QuickAdd onClose={() => setShowAdd(false)} />}
    </div>
  );
}
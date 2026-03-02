import { useState, useMemo } from "react";
import { useMateriaStore } from "../../store/useMateriaStore";
import { useSprintStore } from "../../store/useSprintStore";


interface Props { onClose: () => void; }

const DURACIONES = [
  { label: "1 semana",  days: 7  },
  { label: "2 semanas", days: 14 },
  { label: "3 semanas", days: 21 },
];

const MATERIA_COLORS = [
  "#6C5CE7","#FF6B6B","#55EFC4","#FECA57",
  "#FF9F43","#48CAE4","#fd79a8","#00b894",
];

function addDays(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}
function today() { return new Date().toISOString().split("T")[0]; }
function fmtDate(s: string) {
  return new Date(s + "T00:00:00").toLocaleDateString("es-AR", { day:"numeric", month:"short" });
}

export function SprintForm({ onClose }: Props) {
  const materias     = useMateriaStore(s => s.materias);
  const createSprint = useSprintStore(s => s.createSprint);
  const activeSprint = useSprintStore(s => s.activeSprint);

  const [nombre,    setNombre]    = useState("");
  const [objetivo,  setObjetivo]  = useState("");
  const [duracion,  setDuracion]  = useState(7);
  const [selected,  setSelected]  = useState<Set<string>>(new Set());
  const [saving,    setSaving]    = useState(false);
  const [step,      setStep]      = useState<"config"|"temas">("config");

  // Estado del panel izquierdo: materia + unidad seleccionada
  const [activeMat, setActiveMat] = useState<string|null>(null);
  const [activeUnit, setActiveUnit] = useState<number|null>(null);

  const structure = useMemo(() => {
    return materias.map((m, mi) => ({
      id:     m.id,
      nombre: m.nombre,
      color:  MATERIA_COLORS[mi % MATERIA_COLORS.length],
      unidades: m.units_json.map(u => ({
        num:    u.numero,
        titulo: u.titulo,
        temas:  u.temas
          .map((t, idx) => ({
            key:            `${m.id}__${u.numero}__${idx}`,
            materia_id:     m.id,
            materia_nombre: m.nombre,
            unidad_num:     u.numero,
            unidad_titulo:  u.titulo,
            tema_idx:       idx,
            tema_nombre:    t,
            done:           false,
          }))
          .filter((_, idx) => u.temaStatus?.[idx] !== "done"),
      })).filter(u => u.temas.length > 0),
    })).filter(m => m.unidades.length > 0);
  }, [materias]);

  const allTemas = useMemo(() =>
    structure.flatMap(m => m.unidades.flatMap(u => u.temas)),
  [structure]);

  // Auto-seleccionar primera materia/unidad al entrar al paso temas
  const handleGoToTemas = () => {
    if (structure.length > 0) {
      setActiveMat(structure[0].id);
      setActiveUnit(structure[0].unidades[0]?.num ?? null);
    }
    setStep("temas");
  };

  const toggleTema = (key: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  };

  const toggleUnidad = (temas: typeof allTemas) => {
    const all = temas.every(t => selected.has(t.key));
    setSelected(prev => { const n = new Set(prev); temas.forEach(t => all ? n.delete(t.key) : n.add(t.key)); return n; });
  };

  const toggleMateria = (mat: typeof structure[0]) => {
    const temas = mat.unidades.flatMap(u => u.temas);
    const all = temas.every(t => selected.has(t.key));
    setSelected(prev => { const n = new Set(prev); temas.forEach(t => all ? n.delete(t.key) : n.add(t.key)); return n; });
  };

  const handleCreate = async () => {
    if (!nombre.trim() || selected.size === 0) return;
    setSaving(true);
    const temas = allTemas.filter(t => selected.has(t.key)).map(({ key: _k, ...r }) => r);
    await createSprint({ nombre: nombre.trim(), objetivo: objetivo.trim() || null, fecha_inicio: today(), fecha_fin: addDays(duracion), temas });
    setSaving(false);
    onClose();
  };

  const activeMateriaObj = structure.find(m => m.id === activeMat);
  const activeUnidadObj  = activeMateriaObj?.unidades.find(u => u.num === activeUnit);

  const ya = activeSprint();
  if (ya) return (
    <div className="sf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sf-modal sf-modal-sm">
        <div className="sf-handle" />
        <div className="sf-title">⚠️ Sprint activo</div>
        <p style={{ color:"rgba(255,255,255,.55)", fontSize:14, lineHeight:1.6, margin:"16px 0 24px" }}>
          Ya tenés un sprint activo: <strong style={{color:"#fff"}}>"{ya.nombre}"</strong>.<br/>
          Cerralo o cancelalo antes de crear uno nuevo.
        </p>
        <button className="sf-btn-cancel" onClick={onClose}>Entendido</button>
      </div>
    </div>
  );

  return (
    <div className="sf-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={`sf-modal${step === "temas" ? " sf-modal-wide" : " sf-modal-sm"}`}>
        <div className="sf-handle" />

        {/* ── STEP 1: CONFIG ── */}
        {step === "config" && (
          <>
            <div className="sf-title">🚀 Nuevo sprint</div>
            <div className="sf-field">
              <label className="sf-label">Nombre</label>
              <input className="sf-input" placeholder="ej: Sprint parcial Análisis"
                value={nombre} onChange={e => setNombre(e.target.value)} autoFocus />
            </div>
            <div className="sf-field">
              <label className="sf-label">Objetivo (opcional)</label>
              <textarea className="sf-input sf-textarea" rows={2}
                placeholder="¿Qué querés lograr en este sprint?"
                value={objetivo} onChange={e => setObjetivo(e.target.value)} />
            </div>
            <div className="sf-field">
              <label className="sf-label">Duración</label>
              <div className="sf-dur-row">
                {DURACIONES.map(d => (
                  <button key={d.days} className={`sf-dur-btn${duracion === d.days ? " active" : ""}`}
                    onClick={() => setDuracion(d.days)}>{d.label}</button>
                ))}
              </div>
              <div className="sf-dur-hint">📅 {fmtDate(today())} → {fmtDate(addDays(duracion))}</div>
            </div>
            <div className="sf-actions">
              <button className="sf-btn-cancel" onClick={onClose}>Cancelar</button>
              <button className="sf-btn-next" onClick={handleGoToTemas} disabled={!nombre.trim()}>
                Elegir temas →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: TEMAS — layout split ── */}
        {step === "temas" && (
          <div className="sf2-root">

            {/* Barra superior */}
            <div className="sf2-topbar">
              <div className="sf2-topbar-left">
                <div className="sf2-title">Elegí los temas</div>
                <div className="sf2-hint">{allTemas.length} disponibles</div>
              </div>
              <div className="sf2-counter">
                <span className="sf2-counter-num">{selected.size}</span>
                <span className="sf2-counter-lbl"> seleccionados</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="sf2-pbar-track">
              <div className="sf2-pbar-fill" style={{ width: allTemas.length ? `${(selected.size/allTemas.length)*100}%` : "0%" }} />
            </div>

            {/* Split panel */}
            <div className="sf2-split">

              {/* ── Columna izquierda: materias + unidades ── */}
              <div className="sf2-left">
                {structure.map(mat => {
                  const matTemas    = mat.unidades.flatMap(u => u.temas);
                  const matSelCount = matTemas.filter(t => selected.has(t.key)).length;
                  const matAllSel   = matSelCount === matTemas.length && matTemas.length > 0;
                  const matOpen     = activeMat === mat.id;

                  return (
                    <div key={mat.id} className="sf2-mat-block">
                      {/* Materia row */}
                      <div className={`sf2-mat-row${matOpen ? " active" : ""}`}
                           onClick={() => { setActiveMat(mat.id); setActiveUnit(mat.unidades[0]?.num ?? null); }}>
                        <button
                          className={`sf2-cb${matAllSel ? " checked" : matSelCount > 0 ? " partial" : ""}`}
                          style={{ "--c": mat.color } as React.CSSProperties}
                          onClick={e => { e.stopPropagation(); toggleMateria(mat); }}
                        >
                          {matAllSel ? "✓" : matSelCount > 0 ? "−" : ""}
                        </button>
                        <div className="sf2-mat-dot" style={{ background: mat.color }} />
                        <span className="sf2-mat-name">{mat.nombre}</span>
                        <span className="sf2-mat-cnt" style={{ color: mat.color }}>
                          {matSelCount > 0 ? `${matSelCount}/` : ""}{matTemas.length}
                        </span>
                      </div>

                      {/* Unidades de esta materia */}
                      {matOpen && mat.unidades.map(u => {
                        const uSel    = u.temas.filter(t => selected.has(t.key)).length;
                        const uAllSel = uSel === u.temas.length;
                        const uActive = activeUnit === u.num;

                        return (
                          <div key={u.num}
                            className={`sf2-unit-row${uActive ? " active" : ""}`}
                            onClick={() => setActiveUnit(u.num)}
                          >
                            <button
                              className={`sf2-cb small${uAllSel ? " checked" : uSel > 0 ? " partial" : ""}`}
                              style={{ "--c": mat.color } as React.CSSProperties}
                              onClick={e => { e.stopPropagation(); toggleUnidad(u.temas); }}
                            >
                              {uAllSel ? "✓" : uSel > 0 ? "−" : ""}
                            </button>
                            <span className="sf2-unit-num" style={{ color: mat.color }}>U{u.num}</span>
                            <span className="sf2-unit-titulo">{u.titulo}</span>
                            <span className="sf2-unit-cnt">{uSel}/{u.temas.length}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* ── Columna derecha: temas de la unidad activa ── */}
              <div className="sf2-right">
                {activeUnidadObj ? (
                  <>
                    <div className="sf2-right-header">
                      <span className="sf2-right-unit" style={{ color: activeMateriaObj?.color }}>
                        U{activeUnidadObj.num}
                      </span>
                      <span className="sf2-right-titulo">{activeUnidadObj.titulo}</span>
                      <button
                        className="sf2-right-all"
                        onClick={() => toggleUnidad(activeUnidadObj.temas)}
                      >
                        {activeUnidadObj.temas.every(t => selected.has(t.key)) ? "Deseleccionar todo" : "Seleccionar todo"}
                      </button>
                    </div>
                    <div className="sf2-chips">
                      {activeUnidadObj.temas.map(t => {
                        const sel = selected.has(t.key);
                        return (
                          <button
                            key={t.key}
                            className={`sf2-chip${sel ? " selected" : ""}`}
                            style={sel ? {
                              background: `${activeMateriaObj?.color}20`,
                              borderColor: activeMateriaObj?.color,
                              color: "#fff",
                            } : {}}
                            onClick={() => toggleTema(t.key)}
                          >
                            {sel && <span className="sf2-chip-check">✓</span>}
                            {t.tema_nombre}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="sf2-right-empty">
                    ← Seleccioná una unidad
                  </div>
                )}
              </div>
            </div>

            {/* Acciones */}
            <div className="sf-actions sf2-actions">
              <button className="sf-btn-cancel" onClick={() => setStep("config")}>← Atrás</button>
              <button className="sf-btn-next" onClick={handleCreate} disabled={selected.size === 0 || saving}>
                {saving ? "Creando…" : `Crear sprint (${selected.size} temas)`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useMemo } from "react";
import { useMateriaStore } from "../../store/useMateriaStore";
import type { ExamenRow, ExamenTipo, MateriaRow } from "../../types";

const TIPOS: { value: ExamenTipo; label: string; emoji: string }[] = [
  { value: "parcial",       label: "Parcial",       emoji: "📝" },
  { value: "final",         label: "Final",         emoji: "🎓" },
  { value: "recuperatorio", label: "Recuperatorio", emoji: "🔄" },
  { value: "otro",          label: "Otro",          emoji: "📌" },
];

interface Props {
  materias: MateriaRow[];
  examen?: ExamenRow;
  defaultMateriaId?: string;
  onSave: (data: {
    materia_id:    string;
    titulo:        string;
    fecha:         string;
    tipo:          ExamenTipo;
    notas?:        string;
    unidades_nums: number[] | null;
  }) => Promise<void>;
  onClose: () => void;
}

export function ExamenForm({ materias, examen, defaultMateriaId, onSave, onClose }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [materiaId,     setMateriaId]     = useState(examen?.materia_id ?? defaultMateriaId ?? materias[0]?.id ?? "");
  const [titulo,        setTitulo]        = useState(examen?.titulo ?? "");
  const [fecha,         setFecha]         = useState(examen?.fecha ?? today);
  const [tipo,          setTipo]          = useState<ExamenTipo>(examen?.tipo ?? "parcial");
  const [notas,         setNotas]         = useState(examen?.notas ?? "");
  const [saving,        setSaving]        = useState(false);
  const [todasUnidades, setTodasUnidades] = useState<boolean>(
    !examen?.unidades_nums || examen.unidades_nums.length === 0
  );
  const [unidadesSelec, setUnidadesSelec] = useState<number[]>(
    examen?.unidades_nums ?? []
  );

  // Unidades de la materia seleccionada
  const { materias: allMaterias } = useMateriaStore();
  const materiaObj = useMemo(
    () => allMaterias.find(m => m.id === materiaId),
    [allMaterias, materiaId]
  );
  const unidades = materiaObj?.units_json ?? [];

  const toggleUnidad = (num: number) => {
    setUnidadesSelec(prev =>
      prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num].sort((a, b) => a - b)
    );
  };

  const handleSave = async () => {
    if (!titulo.trim() || !fecha || !materiaId) return;
    setSaving(true);
    await onSave({
      materia_id:    materiaId,
      titulo:        titulo.trim(),
      fecha,
      tipo,
      notas:         notas || undefined,
      unidades_nums: todasUnidades ? null : unidadesSelec,
    });
    setSaving(false);
    onClose();
  };

  // Cambiar materia resetea selección de unidades
  const handleMateriaChange = (id: string) => {
    setMateriaId(id);
    setUnidadesSelec([]);
    setTodasUnidades(true);
  };

  return (
    <div className="ef-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="ef-modal">
        <div className="ef-handle" />
        <div className="ef-title">{examen ? "Editar examen" : "➕ Nuevo examen"}</div>

        {/* Materia */}
        <div className="ef-field">
          <label className="ef-label">Materia</label>
          <select
            className="ef-input ef-materia-select"
            value={materiaId}
            onChange={e => handleMateriaChange(e.target.value)}
            style={{ cursor: "pointer" }}
          >
            {materias.map(m => (
              <option key={m.id} value={m.id} style={{ background: "#1a1535" }}>{m.nombre}</option>
            ))}
          </select>
        </div>

        {/* Título */}
        <div className="ef-field">
          <label className="ef-label">Nombre del examen</label>
          <input
            className="ef-input"
            placeholder="Ej: Primer parcial, Final..."
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
          />
        </div>

        {/* Fecha */}
        <div className="ef-field">
          <label className="ef-label">Fecha</label>
          <input
            className="ef-input"
            type="date"
            value={fecha}
            onChange={e => setFecha(e.target.value)}
            style={{ colorScheme: "dark" }}
          />
        </div>

        {/* Tipo */}
        <div className="ef-field">
          <label className="ef-label">Tipo</label>
          <div className="ef-tipos">
            {TIPOS.map(t => (
              <div
                key={t.value}
                className={`ef-tipo${tipo === t.value ? " active" : ""}`}
                onClick={() => setTipo(t.value)}
              >
                <div className="ef-tipo-emoji">{t.emoji}</div>
                <div className="ef-tipo-lbl">{t.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Unidades que entran */}
        {unidades.length > 0 && (
          <div className="ef-field">
            <label className="ef-label">Unidades que entran</label>
            <div className="ef-unidades-toggle">
              <button
                className={`ef-unid-all-btn${todasUnidades ? " active" : ""}`}
                onClick={() => { setTodasUnidades(true); setUnidadesSelec([]); }}
              >
                ✓ Todas las unidades
              </button>
              <button
                className={`ef-unid-all-btn${!todasUnidades ? " active" : ""}`}
                onClick={() => setTodasUnidades(false)}
              >
                Elegir unidades
              </button>
            </div>

            {!todasUnidades && (
              <div className="ef-unidades-grid">
                {unidades.map(u => {
                  const sel = unidadesSelec.includes(u.numero);
                  return (
                    <button
                      key={u.numero}
                      className={`ef-unidad-chip${sel ? " active" : ""}`}
                      onClick={() => toggleUnidad(u.numero)}
                    >
                      <span className="ef-unidad-num">U{u.numero}</span>
                      <span className="ef-unidad-titulo">
                        {u.titulo.length > 28 ? u.titulo.slice(0, 28) + "…" : u.titulo}
                      </span>
                      {sel && <span className="ef-unidad-check">✓</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {!todasUnidades && unidadesSelec.length > 0 && (
              <div className="ef-unidades-preview">
                {unidadesSelec.length} unidad{unidadesSelec.length > 1 ? "es" : ""} seleccionada{unidadesSelec.length > 1 ? "s" : ""}
                {" · "}
                {Math.round(unidadesSelec.reduce((s, num) => {
                  const u = unidades.find(u => u.numero === num);
                  return s + (u?.temas?.length ?? 0);
                }, 0) * 1.2)}hs estimadas
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        <div className="ef-field">
          <label className="ef-label">Notas (opcional)</label>
          <textarea
            className="ef-input"
            placeholder="Temas a repasar, bibliografía..."
            value={notas}
            onChange={e => setNotas(e.target.value)}
            rows={2}
            style={{ resize: "none", fontFamily: "inherit" }}
          />
        </div>

        <div className="ef-actions">
          <button className="ef-btn-cancel" onClick={onClose}>Cancelar</button>
          <button
            className="ef-btn-save"
            onClick={handleSave}
            disabled={saving || !titulo.trim() || !fecha}
          >
            {saving ? "Guardando…" : examen ? "Guardar cambios" : "Agregar examen"}
          </button>
        </div>
      </div>
    </div>
  );
}
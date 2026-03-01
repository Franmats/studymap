import { useState } from "react";
import { useExamenStore } from "../../store";
import { useMateriaStore } from "../../store";
import { MiniCalendar }    from "./MiniCalendar";
import { ExamenTimeline }  from "./ExamenTimeLine";
import { ExamenForm }      from "./ExamenForm";
import type { ExamenRow, ExamenTipo } from "../../types";

const CSS = `
  .cv { display: flex; flex-direction: column; gap: 16px; }

  .cv-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
  .cv-title { font-size: 21px; font-weight: 900; color: #fff; letter-spacing: -.4px; }
  .cv-sub { font-size: 12px; color: rgba(255,255,255,.32); margin-top: 3px; }

  .cv-add-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: linear-gradient(135deg,#6C5CE7,#a29bfe);
    color: #fff; border: none; padding: 9px 16px; border-radius: 10px;
    cursor: pointer; font-size: 13px; font-weight: 700;
    box-shadow: 0 3px 12px #6C5CE755; flex-shrink: 0;
    -webkit-tap-highlight-color: transparent;
  }
  .cv-add-btn:active { transform: scale(.96); }

  .cv-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: 1.5px;
    color: rgba(255,255,255,.3); text-transform: uppercase; margin-bottom: 8px;
  }

  .cv-loading { text-align: center; padding: 48px 20px;
    color: rgba(255,255,255,.3); font-size: 13px; }
`;

export function CalendarView() {
  const { examenes, loading, saveExamen, updateExamen, deleteExamen } = useExamenStore();
  const { materias } = useMateriaStore();

  const [showForm, setShowForm]       = useState(false);
  const [editing,  setEditing]        = useState<ExamenRow | null>(null);

  const handleSave = async (data: {
    materia_id: string;
    titulo: string;
    fecha: string;
    tipo: ExamenTipo;
    notas?: string;
  }) => {
    if (editing) {
      await updateExamen(editing.id, data);
    } else {
      await saveExamen(data);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar este examen?")) return;
    await deleteExamen(id);
  };

  const handleToggleAprobado = async (examen: ExamenRow) => {
    // Cicla: null → true → false → null
    const next =
      examen.aprobado === null  ? true  :
      examen.aprobado === true  ? false : null;
    await updateExamen(examen.id, { aprobado: next });
  };

  const openEdit = (examen: ExamenRow) => {
    setEditing(examen);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  if (loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="cv-loading">Cargando exámenes…</div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="cv">
        {/* Header */}
        <div>
          <div className="cv-top">
            <div>
              <div className="cv-title">Calendario</div>
              <div className="cv-sub">{examenes.length} examen{examenes.length !== 1 ? "es" : ""} cargado{examenes.length !== 1 ? "s" : ""}</div>
            </div>
            <button className="cv-add-btn" onClick={() => { setEditing(null); setShowForm(true); }}>
              + Examen
            </button>
          </div>
        </div>

        {/* Timeline — próximos primero */}
        <div>
          <div className="cv-section-label">📋 Timeline</div>
          <ExamenTimeline
            examenes={examenes}
            materias={materias}
            onEdit={openEdit}
            onDelete={handleDelete}
            onToggleAprobado={handleToggleAprobado}
          />
        </div>

        {/* Grilla mensual */}
        <div>
          <div className="cv-section-label">🗓 Mes</div>
          <MiniCalendar examenes={examenes} />
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <ExamenForm
          materias={materias}
          examen={editing ?? undefined}
          onSave={handleSave}
          onClose={closeForm}
        />
      )}
    </>
  );
}
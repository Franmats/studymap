// ─────────────────────────────────────────────────────────────────────────────
// ROADMAP SLICE
// ─────────────────────────────────────────────────────────────────────────────
// Estado de la materia actualmente abierta: syllabus + units + progreso.
//
// Decisión de diseño: las acciones de progreso (toggleTema, changeStatus)
// DEVUELVEN las units actualizadas. Esto permite que el componente pase
// exactamente esos datos a Supabase sin depender del timing del estado.
//
// Si en vez de retornar usáramos get() en el componente:
//   const newUnits = toggleTema(...)
//   await updateProgress(get().units)   ← ⚠️ riesgo de race condition
//
// Con return:
//   const newUnits = toggleTema(...)
//   await updateProgress(newUnits)      ← ✅ siempre coherente
// ─────────────────────────────────────────────────────────────────────────────

import type { Syllabus, Unidad, MateriaRow, UnitStatus } from "../../types";

export interface RoadmapSlice {
  activeMateriaId: string | null;
  syllabus: Syllabus | null;
  units: Unidad[];

  // Carga una materia en el roadmap.
  // Recibe MateriaRow completo para poder extraer lo que necesite.
  loadMateria: (materia: MateriaRow) => void;

  // Actualiza el ID después del save (cuando veníamos de un upload nuevo,
  // el ID era "" hasta que Supabase confirmó y devolvió el real).
  setActiveMateriaId: (id: string) => void;

  clearMateria: () => void;

  // Acciones de interacción — devuelven las units para uso inmediato.
  toggleTema: (unitNum: number, temaIdx: number) => Unidad[];
  changeUnitStatus: (unitNum: number, status: UnitStatus) => Unidad[];
}

export const createRoadmapSlice = <S extends RoadmapSlice>(
  set: (fn: (state: S) => void) => void,
  get: () => S
): RoadmapSlice => ({
  activeMateriaId: null,
  syllabus: null,
  units: [],

  loadMateria: (materia) => set((state) => {
    state.activeMateriaId = materia.id;
    state.syllabus = materia.syllabus_json;
    state.units = materia.units_json;
  }),

  setActiveMateriaId: (id) => set((state) => {
    state.activeMateriaId = id;
  }),

  clearMateria: () => set((state) => {
    state.activeMateriaId = null;
    state.syllabus = null;
    state.units = [];
  }),

  toggleTema: (unitNum, temaIdx) => {
    // Calculamos las units nuevas ANTES de llamar a set,
    // para poder retornarlas de forma sincrónica.
    const current = get().units;
    const newUnits = current.map((u) => {
      if (u.numero !== unitNum) return u;

      // Immer no aplica acá porque estamos fuera del callback de `set`.
      // Usamos spread normal para inmutabilidad.
      const temaStatus = [...(u.temaStatus ?? [])];
      temaStatus[temaIdx] = temaStatus[temaIdx] === "done" ? "pending" : "done";

      const doneCount = temaStatus.filter((s) => s === "done").length;
      const status: UnitStatus =
        doneCount === 0
          ? "pending"
          : doneCount === u.temas.length
            ? "done"
            : "in_progress";

      return { ...u, temaStatus, status };
    });

    // Ahora actualizamos el store con el resultado
    set((state) => { state.units = newUnits; });

    return newUnits; // ← el componente usa esto para llamar a Supabase
  },

  changeUnitStatus: (unitNum, status) => {
    const newUnits = get().units.map((u) =>
      u.numero === unitNum ? { ...u, status } : u
    );
    set((state) => { state.units = newUnits; });
    return newUnits;
  },
});
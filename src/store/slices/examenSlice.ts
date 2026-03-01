import type { ExamenRow } from "../../types";

export interface ExamenSlice {
  examenes: ExamenRow[];
  examenesLoading: boolean;

  setExamenes: (examenes: ExamenRow[]) => void;
  addExamen: (examen: ExamenRow) => void;
  removeExamen: (id: string) => void;
  updateExamen: (examen: ExamenRow) => void;
  setExamenesLoading: (val: boolean) => void;
}

export const createExamenSlice = <S extends ExamenSlice>(
  set: (fn: (state: S) => void) => void,
  _get: () => S
): ExamenSlice => ({
  examenes: [],
  examenesLoading: false,

  setExamenes: (examenes) => set((state) => { state.examenes = examenes; }),

  addExamen: (examen) => set((state) => {
    state.examenes.push(examen);
    // Mantenemos ordenado por fecha para que el timeline no tenga que hacerlo
    state.examenes.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }),

  removeExamen: (id) => set((state) => {
    state.examenes = state.examenes.filter((e) => e.id !== id);
  }),

  updateExamen: (examen) => set((state) => {
    const idx = state.examenes.findIndex((e) => e.id === examen.id);
    if (idx !== -1) state.examenes[idx] = examen;
    state.examenes.sort((a, b) => a.fecha.localeCompare(b.fecha));
  }),

  setExamenesLoading: (val) => set((state) => { state.examenesLoading = val; }),
});
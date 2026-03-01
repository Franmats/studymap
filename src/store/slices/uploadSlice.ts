// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD SLICE
// ─────────────────────────────────────────────────────────────────────────────
// Agrupa todo el estado transitorio del flujo de carga de un temario.
// "Transitorio" = no tiene sentido persistirlo entre sesiones.
// Si el usuario refresca, no queremos que vea "Analizando..." de vuelta.
// ─────────────────────────────────────────────────────────────────────────────

import type { MateriaRow } from "../../types";

export type SaveStatus = "saving" | "saved" | null;

export interface UploadSlice {
  uploading: boolean;
  fileName: string | null;
  uploadError: string | null;   // `uploadError` en vez de `error` para ser específico
  duplicate: MateriaRow | null;
  saveStatus: SaveStatus;

  startUpload: (fileName: string) => void;
  finishUpload: () => void;
  setUploadError: (msg: string | null) => void;
  setDuplicate: (materia: MateriaRow | null) => void;
  setSaveStatus: (status: SaveStatus) => void;

  // Acción compuesta: resetea todo el estado de upload de una.
  // Esto es mejor que llamar 4 setters desde el componente.
  resetUpload: () => void;
}

export const createUploadSlice = <S extends UploadSlice>(
  set: (fn: (state: S) => void) => void,
  _get: () => S
): UploadSlice => ({
  uploading: false,
  fileName: null,
  uploadError: null,
  duplicate: null,
  saveStatus: null,

  startUpload: (fileName) => set((state) => {
    // Notar que con Immer asignamos múltiples props en una sola llamada a `set`.
    // Sin Immer: set(prev => ({ ...prev, uploading: true, fileName, uploadError: null }))
    // Con Immer: más limpio, sin spread, sin riesgo de olvidar props.
    state.uploading = true;
    state.fileName = fileName;
    state.uploadError = null;
    state.duplicate = null;
  }),

  finishUpload: () => set((state) => {
    state.uploading = false;
  }),

  setUploadError: (msg) => set((state) => {
    state.uploadError = msg;
    state.uploading = false;  // si hay error, el upload terminó
  }),

  setDuplicate: (materia) => set((state) => {
    state.duplicate = materia;
    state.uploading = false;
  }),

  setSaveStatus: (status) => set((state) => {
    state.saveStatus = status;
  }),

  resetUpload: () => set((state) => {
    state.uploading = false;
    state.fileName = null;
    state.uploadError = null;
    state.duplicate = null;
    // saveStatus no lo reseteamos acá — queremos que el "✓ Listo" se vea
    // aunque el usuario navegue. Se resetea solo después del timeout.
  }),
});
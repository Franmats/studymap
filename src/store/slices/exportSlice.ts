// ─────────────────────────────────────────────────────────────────────────────
// EXPORT SLICE
// ─────────────────────────────────────────────────────────────────────────────
// El más simple. Un flag booleano para el estado del export a PDF.
// Podría vivir en otro slice, pero tenerlo separado es buena práctica:
// si mañana agregamos "exportando a CSV" o "compartiendo link", ya tiene
// su propio espacio sin contaminar otros slices.
// ─────────────────────────────────────────────────────────────────────────────

export interface ExportSlice {
  exportingPDF: boolean;
  setExportingPDF: (val: boolean) => void;
}

export const createExportSlice = <S extends ExportSlice>(
  set: (fn: (state: S) => void) => void,
  _get: () => S
): ExportSlice => ({
  exportingPDF: false,
  setExportingPDF: (val) => set((state) => { state.exportingPDF = val; }),
});
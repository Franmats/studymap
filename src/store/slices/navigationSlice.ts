// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION SLICE
// ─────────────────────────────────────────────────────────────────────────────
// Un "slice" es simplemente una función que recibe `set` y `get` del store
// y devuelve un pedazo del estado + sus acciones.
//
// La clave del patrón: cada slice NO sabe que existen los otros.
// Eso los hace testeables de forma aislada y fáciles de razonar.
// ─────────────────────────────────────────────────────────────────────────────

export type View = "list" | "upload" | "roadmap" | "calendar";

export interface NavigationSlice {
  view: View;

  // Convención: las acciones se nombran como verbos en imperativo.
  // `setView` es más claro que `view` como setter o `changeView`.
  setView: (view: View) => void;
  goToList: () => void;   // acción compuesta — resetea más cosas en el store
}

// El tipo `StateCreator` de Zustand requiere tres type params:
//   1. El tipo total del store (lo pasamos desde useAppStore)
//   2. Los middlewares que el slice asume que están activos
//   3. El tipo de lo que este slice devuelve
//
// Como los slices no conocen el tipo total del store todavía,
// usamos un genérico `S` que se resuelve al combinarlo en useAppStore.
export type NavigationSliceCreator<S> = (
  set: (fn: (state: S) => void) => void,
  get: () => S
) => NavigationSlice;

export const createNavigationSlice = <S extends NavigationSlice>(
  set: (fn: (state: S) => void) => void,
  _get: () => S
): NavigationSlice => ({
  view: "list",

  setView: (view) => set((state) => {
    // Con Immer (que activamos en useAppStore), mutamos directo.
    // Immer intercepta esto y produce un nuevo objeto inmutable por debajo.
    // SIN Immer habría que hacer: set({ view }) — o spread del estado completo.
    state.view = view;
  }),

  goToList: () => set((state) => {
    // Esta acción toca múltiples partes del estado.
    // Es válido hacerlo en un slice siempre que el slice "posea" esas props.
    // Si necesita tocar props de OTRO slice, es señal de que la acción
    // debería vivir en el store raíz (useAppStore), no en el slice.
    state.view = "list";
  }),
});
// ─────────────────────────────────────────────────────────────────────────────
// Re-export central del store
// ─────────────────────────────────────────────────────────────────────────────
// Los componentes SIEMPRE importan desde "../store" (o "../../store").
// Nunca importan desde "../store/slices/roadmapSlice" directamente.
//
// Beneficio: si mañana movemos o renombramos un archivo interno del store,
// solo actualizamos este index — los componentes no cambian.
// ─────────────────────────────────────────────────────────────────────────────

export { useAppStore }     from "./useAppStore";
export { useMateriaStore } from "./useMateriaStore";
export { useExamenStore }  from "./useExamenStore";

export {
  selectRoadmapStats,
  selectUnitStatusCounts,
  selectGlobalStats,
} from "./selectors";

export type { AppStore }        from "./useAppStore";
export type { View } from "./slices/navigationSlice";

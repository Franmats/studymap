// ─────────────────────────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────────────────────────
// Un selector es una función que recibe el store y devuelve un valor derivado.
//
// ¿Por qué definirlos acá y no inline en el componente?
//
//   ❌ Inline (problema):
//      const pct = useAppStore(s => {
//        const total = s.units.reduce(...)  ← nueva función en cada render
//        return Math.round(...)             ← re-renderiza aunque units no cambió
//      })
//
//   ✅ Extraído (solución):
//      const pct = useAppStore(selectGlobalProgress)
//      → Zustand compara la referencia de la función: si es la misma,
//        solo re-renderiza si el VALOR DEVUELTO cambió.
//
// Regla práctica: si el selector hace más de `s => s.algo`, extraelo acá.
// ─────────────────────────────────────────────────────────────────────────────

import type { AppStore }      from "./useAppStore";
import type { MateriaStore }  from "./useMateriaStore";

// ── Selectores de useAppStore ─────────────────────────────────────────────────

// Calcula las métricas del roadmap activo.
// Solo re-renderiza cuando cambia la cantidad/estado de los temas.
export const selectRoadmapStats = (s: AppStore) => {
  const totalTemas   = s.units.reduce((a, u) => a + u.temas.length, 0);
  const doneTemas    = s.units.reduce(
    (a, u) => a + (u.temaStatus?.filter((t) => t === "done").length ?? 0), 0
  );
  const globalPct    = totalTemas > 0 ? Math.round((doneTemas / totalTemas) * 100) : 0;
  const totalSemanas = s.units.reduce((a, u) => a + (u.semanas_estimadas ?? 0), 0);
  return { totalTemas, doneTemas, globalPct, totalSemanas };
};

// Cuántas unidades hay en cada estado.
// Útil para los badges del header del roadmap.
export const selectUnitStatusCounts = (s: AppStore) => ({
  pending:     s.units.filter((u) => (u.status ?? "pending") === "pending").length,
  in_progress: s.units.filter((u) => u.status === "in_progress").length,
  done:        s.units.filter((u) => u.status === "done").length,
});

// ── Selectores de useMateriaStore ─────────────────────────────────────────────

// Necesitamos exportar el tipo para poder usarlo en los selectores
export type { MateriaStore } from "./useMateriaStore";

// Estadísticas globales de todas las materias del usuario.
// Útil para una pantalla de resumen o un widget de bienvenida.
export const selectGlobalStats = (s: MateriaStore) => ({
  total:      s.materias.length,
  completed:  s.materias.filter((m) => m.progress_percent === 100).length,
  inProgress: s.materias.filter((m) => m.progress_percent > 0 && m.progress_percent < 100).length,
  notStarted: s.materias.filter((m) => m.progress_percent === 0).length,
});
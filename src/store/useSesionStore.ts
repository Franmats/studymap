// ─────────────────────────────────────────────────────────────────────────────
// useSesionStore — actividad diaria, streak y meta
// ─────────────────────────────────────────────────────────────────────────────
// Responsabilidades:
//   • Registrar actividad cuando el usuario marca un tema
//   • Calcular el streak (días consecutivos con actividad)
//   • Proveer historial de 365 días para el heatmap
//   • Gestionar la meta diaria configurable

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";

function USER_ID() { return getAuthUserId(); }

function todayStr() {
  return new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
}

export interface SesionDia {
  fecha:       string;
  temas_count: number;
  materias:    { materia_id: string; nombre: string; temas_count: number }[];
}

interface SesionStore {
  // Estado
  historial:    SesionDia[];   // 365 días para el heatmap
  metaDiaria:   number;        // temas objetivo por día (configurable)
  loading:      boolean;

  // Derivados calculados on-demand (no guardados en store)
  // Se exponen como acciones que retornan valores para evitar selectores complejos

  // Acciones
  fetchHistorial:      () => Promise<void>;
  registrarActividad:  (materiaId: string, nombreMateria: string) => Promise<void>;
  setMetaDiaria:       (meta: number) => void;

  // Selectores sincrónicos (calculan desde historial)
  getHoy:     () => SesionDia | null;
  getStreak:  () => number;
}

export const useSesionStore = create<SesionStore>()(
  persist(
    (set, get) => ({
      historial:  [],
      metaDiaria: 5,    // default: 5 temas por día
      loading:    false,

      // ── fetchHistorial ──────────────────────────────────────────────────────
      // Trae los últimos 365 días de actividad para el heatmap
      fetchHistorial: async () => {
        set({ loading: true });
        try {
          const desde = new Date();
          desde.setDate(desde.getDate() - 365);

          const { data, error } = await supabase
            .from("sesiones")
            .select("fecha, temas_count, materias")
            .eq("user_id", USER_ID())
            .gte("fecha", desde.toISOString().split("T")[0])
            .order("fecha", { ascending: true });

          if (error) throw error;
          set({ historial: (data as SesionDia[]) ?? [] });
        } catch (e) {
          console.error("fetchHistorial:", e);
        } finally {
          set({ loading: false });
        }
      },

      // ── registrarActividad ──────────────────────────────────────────────────
      // Llamado cada vez que el usuario marca un tema como done.
      // Hace UPSERT en Supabase: si ya hay sesión hoy, incrementa; si no, crea.
      registrarActividad: async (materiaId, nombreMateria) => {
        const hoy      = todayStr();
        const historial = get().historial;
        const existing  = historial.find((s) => s.fecha === hoy);

        // Construimos la sesión actualizada
        let materias = existing?.materias ?? [];
        const matIdx = materias.findIndex((m) => m.materia_id === materiaId);
        if (matIdx >= 0) {
          // Ya estudiamos esta materia hoy — incrementamos
          materias = materias.map((m, i) =>
            i === matIdx ? { ...m, temas_count: m.temas_count + 1 } : m
          );
        } else {
          materias = [...materias, { materia_id: materiaId, nombre: nombreMateria, temas_count: 1 }];
        }
        const nuevosTemasCount = (existing?.temas_count ?? 0) + 1;

        const sesionActualizada: SesionDia = {
          fecha:       hoy,
          temas_count: nuevosTemasCount,
          materias,
        };

        // Optimistic update local
        set((state) => {
          const idx = state.historial.findIndex((s) => s.fecha === hoy);
          if (idx >= 0) {
            const updated = [...state.historial];
            updated[idx]  = sesionActualizada;
            return { historial: updated };
          }
          return { historial: [...state.historial, sesionActualizada] };
        });

        // Upsert en Supabase
        // ON CONFLICT (user_id, fecha) → actualiza en vez de insertar
        try {
          const { error } = await supabase.from("sesiones").upsert(
            {
              user_id:     USER_ID(),
              fecha:       hoy,
              temas_count: nuevosTemasCount,
              materias,
            },
            { onConflict: "user_id,fecha" }
          );
          if (error) throw error;
        } catch (e) {
          console.error("registrarActividad:", e);
        }
      },

      setMetaDiaria: (meta) => set({ metaDiaria: Math.max(1, meta) }),

      // ── Selectores sincrónicos ──────────────────────────────────────────────
      // Retornan desde el historial en memoria, sin async ni Supabase.

      getHoy: () => {
        const hoy = todayStr();
        return get().historial.find((s) => s.fecha === hoy) ?? null;
      },

      getStreak: () => {
        const hist = get().historial;
        if (hist.length === 0) return 0;

        let streak  = 0;
        const hoy   = new Date(); hoy.setHours(0,0,0,0);
        const check = new Date(hoy);

        // Verificamos día por día hacia atrás
        while (true) {
          const fechaStr = check.toISOString().split("T")[0];
          const tiene    = hist.some((s) => s.fecha === fechaStr && s.temas_count > 0);

          if (!tiene) {
            // Si hoy no tiene actividad aún, la racha puede seguir desde ayer
            if (check.getTime() === hoy.getTime()) {
              check.setDate(check.getDate() - 1);
              continue;
            }
            break; // racha rota
          }

          streak++;
          check.setDate(check.getDate() - 1);
        }

        return streak;
      },
    }),
    {
      name: "studymap-sesiones-v1",
      // Solo persistimos la meta — el historial siempre viene de Supabase
      partialize: (state) => ({ metaDiaria: state.metaDiaria }),
    }
  )
);
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import { toast } from "../components/Toast";
import type { ActividadCategoria, ActividadConfig, TimeControlRow } from "../types";

// ── Configuración por defecto de categorías ───────────────────────────────────
export const DEFAULT_CONFIGS: ActividadConfig[] = [
  { categoria:"estudio",   label:"Estudio",          icon:"📚", color:"#6C5CE7", min_horas:3,  max_horas:8  },
  { categoria:"cursada",   label:"Cursada",           icon:"🎓", color:"#a29bfe", min_horas:0,  max_horas:6  },
  { categoria:"descanso",  label:"Descanso / Sueño",  icon:"😴", color:"#55EFC4", min_horas:7,  max_horas:9  },
  { categoria:"ejercicio", label:"Ejercicio",         icon:"💪", color:"#FF9F43", min_horas:1,  max_horas:3  },
  { categoria:"ocio",      label:"Ocio / Personal",   icon:"🎮", color:"#FF6B6B", min_horas:0,  max_horas:3  },
];



interface TimeControlStore {
  registros:  TimeControlRow[];
  configs:    ActividadConfig[];
  loading:    boolean;

  // Fetch
  fetchRegistros: () => Promise<void>;

  // Registros
  upsertRegistro: (fecha: string, categoria: ActividadCategoria, horas: number, nota?: string) => Promise<void>;
  deleteRegistro: (id: string) => Promise<void>;

  // Config (persisted locally)
  updateConfig: (categoria: ActividadCategoria, patch: Partial<Pick<ActividadConfig,"min_horas"|"max_horas">>) => void;

  // Helpers
  registrosDelDia:   (fecha: string) => TimeControlRow[];
  horasDelDia:       (fecha: string, categoria: ActividadCategoria) => number;
  totalHorasDelDia:  (fecha: string) => number;
  statusCategoria:   (fecha: string, categoria: ActividadCategoria) => "ok" | "bajo" | "excedido" | "sin_dato";
  horasLibresDelDia: (fecha: string) => number;
}

export const useTimeControlStore = create<TimeControlStore>()(
  persist(
    (set, get) => ({
      registros: [],
      configs:   DEFAULT_CONFIGS,
      loading:   false,

      fetchRegistros: async () => {
        const uid = getAuthUserId();
        if (!uid) return;
        set({ loading: true });
        // Traer últimos 30 días
        const desde = new Date();
        desde.setDate(desde.getDate() - 30);
        const { data, error } = await supabase
          .from("time_control")
          .select("*")
          .eq("user_id", uid)
          .gte("fecha", desde.toISOString().split("T")[0])
          .order("fecha", { ascending: false });
        if (error) { toast.error("Error al cargar registros"); set({ loading: false }); return; }
        set({ registros: data as TimeControlRow[], loading: false });
      },

      upsertRegistro: async (fecha, categoria, horas, nota) => {
        const uid = getAuthUserId();
        if (!uid) return;

        // Buscar si ya existe registro del mismo día y categoría
        const existing = get().registros.find(r => r.fecha === fecha && r.categoria === categoria);

        if (existing) {
          // Update
       /*    const prev = get().registros; */
          set(s => ({ registros: s.registros.map(r =>
            r.id === existing.id ? { ...r, horas, nota: nota ?? null } : r
          )}));
          const { error } = await supabase
            .from("time_control")
            .update({ horas, nota: nota ?? null })
            .eq("id", existing.id);
          if (error) { set({ registros: get().registros }); toast.error("Error al actualizar"); return; }
        } else {
          // Insert
          const { data: row, error } = await supabase
            .from("time_control")
            .insert({ user_id: uid, fecha, categoria, horas, nota: nota ?? null })
            .select().single();
          if (error) { toast.error("Error al guardar"); return; }
          set(s => ({ registros: [row as TimeControlRow, ...s.registros] }));
        }
      },

      deleteRegistro: async (id) => {
        const prev = get().registros;
        set(s => ({ registros: s.registros.filter(r => r.id !== id) }));
        const { error } = await supabase.from("time_control").delete().eq("id", id);
        if (error) { set({ registros: prev }); toast.error("Error al eliminar"); }
      },

      updateConfig: (categoria, patch) => {
        set(s => ({
          configs: s.configs.map(c => c.categoria === categoria ? { ...c, ...patch } : c)
        }));
      },

      // ── Helpers ─────────────────────────────────────────────────────────────
      registrosDelDia: (fecha) =>
        get().registros.filter(r => r.fecha === fecha),

      horasDelDia: (fecha, categoria) => {
        const r = get().registros.find(r => r.fecha === fecha && r.categoria === categoria);
        return r?.horas ?? 0;
      },

      totalHorasDelDia: (fecha) =>
        get().registros.filter(r => r.fecha === fecha).reduce((s, r) => s + r.horas, 0),

      statusCategoria: (fecha, categoria) => {
        const cfg = get().configs.find(c => c.categoria === categoria);
        if (!cfg) return "sin_dato";
        const horas = get().horasDelDia(fecha, categoria);
        if (horas === 0) return "sin_dato";
        if (cfg.max_horas > 0 && horas > cfg.max_horas) return "excedido";
        if (cfg.min_horas > 0 && horas < cfg.min_horas) return "bajo";
        return "ok";
      },

      horasLibresDelDia: (fecha) => {
        const total = get().totalHorasDelDia(fecha);
        return Math.max(0, 24 - total);
      },
    }),
    {
      name: "studymap-time-control",
      partialize: (s) => ({ configs: s.configs }), // solo persiste configs localmente
    }
  )
);
import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import { toast } from "../components/Toast";

export type TareaPrioridad = "alta" | "media" | "baja";

export interface TareaRow {
  id:          string;
  user_id:     string;
  titulo:      string;
  descripcion: string | null;
  prioridad:   TareaPrioridad;
  completada:  boolean;
  fecha_limite: string | null;
  created_at:  string;
}

interface TareasStore {
  tareas:   TareaRow[];
  loading:  boolean;

  fetchTareas:    () => Promise<void>;
  createTarea:    (data: Omit<TareaRow, "id" | "user_id" | "created_at">) => Promise<TareaRow | null>;
  toggleTarea:    (id: string) => Promise<void>;
  deleteTarea:    (id: string) => Promise<void>;

  // Top 10 prioritarias sin completar (para la pila)
  topTareas: () => TareaRow[];
}

const PRIORIDAD_ORDER: Record<TareaPrioridad, number> = { alta: 0, media: 1, baja: 2 };

export const useTareasStore = create<TareasStore>((set, get) => ({
  tareas:  [],
  loading: false,

  fetchTareas: async () => {
    const uid = getAuthUserId();
    if (!uid) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("tareas")
      .select("*")
      .eq("user_id", uid)
      .eq("completada", false)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { set({ loading: false }); return; }
    set({ tareas: data as TareaRow[], loading: false });
  },

  createTarea: async (data) => {
    const uid = getAuthUserId();
    if (!uid) return null;
    const { data: row, error } = await supabase
      .from("tareas")
      .insert({ ...data, user_id: uid })
      .select().single();
    if (error) { toast.error("Error al crear tarea"); return null; }
    set(s => ({ tareas: [row as TareaRow, ...s.tareas] }));
    return row as TareaRow;
  },

  toggleTarea: async (id) => {
    const tarea = get().tareas.find(t => t.id === id);
    if (!tarea) return;
    // Optimistic: sacar de la lista (siempre son "pendientes")
    set(s => ({ tareas: s.tareas.filter(t => t.id !== id) }));
    await supabase.from("tareas").update({ completada: true }).eq("id", id);
    toast.success("¡Tarea completada! ✓");
  },

  deleteTarea: async (id) => {
    set(s => ({ tareas: s.tareas.filter(t => t.id !== id) }));
    await supabase.from("tareas").delete().eq("id", id);
  },

  topTareas: () => {
    return [...get().tareas]
      .sort((a, b) => {
        // Primero por prioridad, luego por fecha límite si existe
        const po = PRIORIDAD_ORDER[a.prioridad] - PRIORIDAD_ORDER[b.prioridad];
        if (po !== 0) return po;
        if (a.fecha_limite && b.fecha_limite)
          return a.fecha_limite.localeCompare(b.fecha_limite);
        if (a.fecha_limite) return -1;
        if (b.fecha_limite) return 1;
        return 0;
      })
      .slice(0, 10);
  },
}));
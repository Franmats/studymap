import { create } from "zustand";
import { toast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import type { ExamenRow, ExamenTipo } from "../types";

function USER_ID() { return getAuthUserId(); }

export interface ExamenStore {
  examenes: ExamenRow[];
  loading: boolean;

  fetchExamenes: () => Promise<void>;
  saveExamen: (data: {
    materia_id: string;
    titulo: string;
    fecha: string;
    tipo: ExamenTipo;
    notas?: string;
  }) => Promise<ExamenRow | null>;
  updateExamen: (id: string, data: Partial<Pick<ExamenRow, "titulo" | "fecha" | "tipo" | "notas" | "aprobado">>) => Promise<void>;
  deleteExamen: (id: string) => Promise<void>;
}

export const useExamenStore = create<ExamenStore>()((set, get) => ({
  examenes: [],
  loading: false,

  fetchExamenes: async () => {
    set({ loading: true });
    try {
      const { data, error } = await supabase
        .from("examenes")
        .select("*")
        .eq("user_id", USER_ID())
        .order("fecha", { ascending: true });
      if (error) throw error;
      set({ examenes: (data as ExamenRow[]) ?? [] });
    } catch (e) {
      console.error("fetchExamenes:", e);
    } finally {
      set({ loading: false });
    }
  },

  saveExamen: async ({ materia_id, titulo, fecha, tipo, notas }) => {
    try {
      const { data, error } = await supabase
        .from("examenes")
        .insert({ user_id: USER_ID(), materia_id, titulo, fecha, tipo, notas: notas ?? null, aprobado: null })
        .select()
        .single();
      if (error) throw error;
      const saved = data as ExamenRow;
      // Optimistic: agregamos y re-ordenamos por fecha
      set((state) => ({
        examenes: [...state.examenes, saved].sort((a, b) => a.fecha.localeCompare(b.fecha)),
      }));
      return saved;
    } catch (e) {
      console.error("saveExamen:", e);
      toast.error("No se pudo guardar el examen.");
      return null;
    }
  },

  updateExamen: async (id, data) => {
    const previous = get().examenes;
    // Optimistic update
    set((state) => ({
      examenes: state.examenes
        .map((e) => (e.id === id ? { ...e, ...data } : e))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    }));
    try {
      const { error } = await supabase.from("examenes").update(data).eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("updateExamen:", e);
      set({ examenes: previous }); // rollback
    }
  },

  deleteExamen: async (id) => {
    const previous = get().examenes;
    set((state) => ({ examenes: state.examenes.filter((e) => e.id !== id) }));
    try {
      const { error } = await supabase.from("examenes").delete().eq("id", id);
      if (error) throw error;
    } catch (e) {
      console.error("deleteExamen:", e);
      toast.error("No se pudo eliminar el examen.");
      set({ examenes: previous }); // rollback
    }
  },
}));
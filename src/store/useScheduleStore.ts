import { create } from "zustand";
import { toast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import type { ClaseRow } from "../types";

interface ScheduleStore {
  clases:  ClaseRow[];
  loading: boolean;
  fetchClases:  () => Promise<void>;
  createClase:  (data: Omit<ClaseRow, "id" | "user_id" | "created_at">) => Promise<void>;
  updateClase:  (id: string, data: Partial<Omit<ClaseRow, "id" | "user_id" | "created_at">>) => Promise<void>;
  deleteClase:  (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  clases:  [],
  loading: false,

  fetchClases: async () => {
    const uid = getAuthUserId();
    if (!uid) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("clases").select("*").eq("user_id", uid)
      .order("hora_inicio", { ascending: true });
    if (error) { toast.error("Error al cargar horarios"); set({ loading: false }); return; }
    set({ clases: data as ClaseRow[], loading: false });
  },

  createClase: async (data) => {
    const uid = getAuthUserId();
    if (!uid) return;
    const { data: row, error } = await supabase
      .from("clases").insert({ ...data, user_id: uid }).select().single();
    if (error) { toast.error("Error al guardar clase"); return; }
    set(s => ({ clases: [...s.clases, row as ClaseRow] }));
    toast.success("✅ Clase agregada");
  },

  updateClase: async (id, data) => {
    const prev = get().clases;
    set(s => ({ clases: s.clases.map(c => c.id === id ? { ...c, ...data } : c) }));
    const { error } = await supabase.from("clases").update(data).eq("id", id);
    if (error) { set({ clases: prev }); toast.error("Error al actualizar"); }
  },

  deleteClase: async (id) => {
    const prev = get().clases;
    set(s => ({ clases: s.clases.filter(c => c.id !== id) }));
    const { error } = await supabase.from("clases").delete().eq("id", id);
    if (error) { set({ clases: prev }); toast.error("Error al eliminar"); }
    else toast.success("Clase eliminada");
  },
}));
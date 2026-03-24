import { create } from "zustand";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import { toast } from "../components/Toast";
import type { TPRow, TPEstado } from "../types";

function hoy() { return new Date().toISOString().split("T")[0]; }

function diasHasta(fecha: string): number {
  const diff = new Date(fecha + "T00:00:00").getTime() - new Date(hoy() + "T00:00:00").getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface TPStore {
  tps:     TPRow[];
  loading: boolean;

  fetchTPs:    () => Promise<void>;
  createTP:    (data: Omit<TPRow, "id" | "user_id" | "created_at">) => Promise<TPRow | null>;
  updateTP:    (id: string, patch: Partial<Omit<TPRow, "id" | "user_id" | "created_at">>) => Promise<void>;
  deleteTP:    (id: string) => Promise<void>;
  setEstado:   (id: string, estado: TPEstado) => Promise<void>;

  // Helpers
  tpsByMateria:  (materia_id: string) => TPRow[];
  tpsVencidos:   () => TPRow[];
  tpsProximos:   (dias?: number) => TPRow[];   // vencen en N días
  diasHasta:     (fecha: string) => number;
}

export const useTPStore = create<TPStore>((set, get) => ({
  tps:     [],
  loading: false,

  fetchTPs: async () => {
    const uid = getAuthUserId();
    if (!uid) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("trabajos_practicos")
      .select("*")
      .eq("user_id", uid)
      .order("fecha_entrega", { ascending: true });
    if (error) { toast.error("Error al cargar TPs"); set({ loading: false }); return; }
    set({ tps: data as TPRow[], loading: false });
  },

  createTP: async (data) => {
    const uid = getAuthUserId();
    if (!uid) return null;
    const { data: row, error } = await supabase
      .from("trabajos_practicos")
      .insert({ ...data, user_id: uid })
      .select().single();
    if (error) { toast.error("Error al crear TP"); return null; }
    set(s => ({ tps: [...s.tps, row as TPRow].sort((a, b) =>
      a.fecha_entrega.localeCompare(b.fecha_entrega)
    )}));
    toast.success("TP creado");
    return row as TPRow;
  },

  updateTP: async (id, patch) => {
    const prev = get().tps;
    set(s => ({ tps: s.tps.map(t => t.id === id ? { ...t, ...patch } : t) }));
    const { error } = await supabase
      .from("trabajos_practicos").update(patch).eq("id", id);
    if (error) { set({ tps: prev }); toast.error("Error al actualizar TP"); }
  },

  deleteTP: async (id) => {
    const prev = get().tps;
    set(s => ({ tps: s.tps.filter(t => t.id !== id) }));
    const { error } = await supabase.from("trabajos_practicos").delete().eq("id", id);
    if (error) { set({ tps: prev }); toast.error("Error al eliminar TP"); }
    else toast.success("TP eliminado");
  },

  setEstado: async (id, estado) => {
    await get().updateTP(id, { estado });
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  tpsByMateria: (materia_id) =>
    get().tps.filter(t => t.materia_id === materia_id),

  tpsVencidos: () =>
    get().tps.filter(t =>
      t.estado !== "entregado" && diasHasta(t.fecha_entrega) < 0
    ),

  tpsProximos: (dias = 7) =>
    get().tps.filter(t => {
      const d = diasHasta(t.fecha_entrega);
      return t.estado !== "entregado" && d >= 0 && d <= dias;
    }),

  diasHasta,
}));
import { create } from "zustand";
import { toast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import { useMateriaStore } from "./useMateriaStore";
import type { SprintRow, DailyEntry, Retro } from "../types";

function USER_ID() { return getAuthUserId(); }

interface SprintStore {
  sprints:  SprintRow[];
  loading:  boolean;

  fetchSprints:   () => Promise<void>;
  createSprint:   (data: Omit<SprintRow, "id" | "user_id" | "dailies" | "retro" | "status" | "created_at">) => Promise<SprintRow | null>;
  updateTema:     (sprintId: string, temaKey: string, done: boolean) => Promise<void>;
  addDaily:       (sprintId: string, entry: DailyEntry) => Promise<void>;
  closeSprint:    (sprintId: string, retro: Retro) => Promise<void>;
  cancelSprint:   (sprintId: string) => Promise<void>;

  // helpers
  activeSprint:   () => SprintRow | null;
  velocity:       () => number;  // promedio temas completados por sprint
}

export const useSprintStore = create<SprintStore>((set, get) => ({
  sprints: [],
  loading: false,

  fetchSprints: async () => {
    const uid = USER_ID();
    if (!uid) return;
    set({ loading: true });
    const { data, error } = await supabase
      .from("sprints")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Error al cargar sprints"); set({ loading: false }); return; }
    set({ sprints: data as SprintRow[], loading: false });
  },

  createSprint: async (data) => {
    const uid = USER_ID();
    if (!uid) return null;
    const newSprint: Omit<SprintRow, "id" | "created_at"> = {
      ...data,
      user_id: uid,
      dailies: [],
      retro:   null,
      status:  "active",
    };
    const { data: row, error } = await supabase
      .from("sprints").insert(newSprint).select().single();
    if (error) { toast.error("Error al crear sprint"); return null; }
    set(s => ({ sprints: [row as SprintRow, ...s.sprints] }));
    toast.success("🚀 Sprint creado");
    return row as SprintRow;
  },

  updateTema: async (sprintId, temaKey, done) => {
    const sprint = get().sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    // temaKey = `${materia_id}__${unidad_num}__${tema_idx}`
    const [materia_id, unidad_num, tema_idx] = temaKey.split("__");
    const temas = sprint.temas.map(t =>
      t.materia_id === materia_id &&
      t.unidad_num  === Number(unidad_num) &&
      t.tema_idx    === Number(tema_idx)
        ? { ...t, done }
        : t
    );

    // Optimistic update en el sprint
    set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? { ...sp, temas } : sp) }));

    // ── Sincronizar con la materia ────────────────────────────────────────────
    // Si marcamos done=true, reflejarlo en units_json de la materia.
    // Si marcamos done=false, NO desmarcar — el progreso de la materia es
    // independiente y no retrocede por desmarcar en el sprint.
    if (done) {
      const { materias, updateProgress } = useMateriaStore.getState();
      const materia = materias.find(m => m.id === materia_id);
      if (materia) {
        const newUnits = materia.units_json.map(u => {
          if (u.numero !== Number(unidad_num)) return u;
          const temaStatus = [...(u.temaStatus ?? u.temas.map(() => "pending" as const))];
          temaStatus[Number(tema_idx)] = "done";
          // Recalcular status de la unidad
          const allDone  = temaStatus.every(s => s === "done");
          const anyDone  = temaStatus.some(s => s === "done");
          return {
            ...u,
            temaStatus,
            status: allDone ? "done" : anyDone ? "in_progress" : u.status,
          };
        });
        await updateProgress(materia_id, newUnits);
      }
    }

    // Persistir cambios del sprint en Supabase
    const { error } = await supabase.from("sprints").update({ temas }).eq("id", sprintId);
    if (error) {
      // Rollback solo en el sprint (la materia ya se actualizó correctamente)
      set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? sprint : sp) }));
      toast.error("Error al actualizar tema");
    }
  },

  addDaily: async (sprintId, entry) => {
    const sprint = get().sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    // Reemplazar si ya hay un daily para hoy
    const dailies = [
      ...sprint.dailies.filter(d => d.date !== entry.date),
      entry,
    ];
    set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? { ...sp, dailies } : sp) }));
    const { error } = await supabase.from("sprints").update({ dailies }).eq("id", sprintId);
    if (error) {
      set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? sprint : sp) }));
      toast.error("Error al guardar daily");
    } else {
      toast.success("✅ Daily guardado");
    }
  },

  closeSprint: async (sprintId, retro) => {
    const sprint = get().sprints.find(s => s.id === sprintId);
    if (!sprint) return;
    set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? { ...sp, status: "completed", retro } : sp) }));
    const { error } = await supabase.from("sprints").update({ status: "completed", retro }).eq("id", sprintId);
    if (error) {
      set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? sprint : sp) }));
      toast.error("Error al cerrar sprint");
    } else {
      toast.success("🏁 Sprint completado");
    }
  },

  cancelSprint: async (sprintId) => {
    set(s => ({ sprints: s.sprints.map(sp => sp.id === sprintId ? { ...sp, status: "cancelled" } : sp) }));
    const { error } = await supabase.from("sprints").update({ status: "cancelled" }).eq("id", sprintId);
    if (error) toast.error("Error al cancelar sprint");
  },

  activeSprint: () => get().sprints.find(s => s.status === "active") ?? null,

  velocity: () => {
    const completed = get().sprints.filter(s => s.status === "completed");
    if (!completed.length) return 0;
    const total = completed.reduce((acc, s) => acc + s.temas.filter(t => t.done).length, 0);
    return Math.round(total / completed.length);
  },
}));
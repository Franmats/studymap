// ─────────────────────────────────────────────────────────────────────────────
// useMateriaStore — store de datos (Supabase)
// ─────────────────────────────────────────────────────────────────────────────
// Este store es INTENCIONALMENTE diferente a useAppStore:
//
//   • Sin immer: las operaciones de Supabase son async y devuelven datos nuevos,
//     no mutations. Immer no suma valor acá.
//
//   • Sin persist: los datos vienen de Supabase, que es la fuente de verdad.
//     Persistir en localStorage crearía una segunda fuente que puede divergir.
//     Al montar la app, siempre hacemos fetch fresco.
//
// Patrón "optimistic update":
//   1. Actualizamos el estado LOCAL inmediatamente (UI responde al instante)
//   2. Hacemos el request a Supabase en background
//   3. Si falla, revertimos al estado anterior (rollback)
// ─────────────────────────────────────────────────────────────────────────────

import { create } from "zustand";
import { toast } from "../components/Toast";
import { supabase } from "../lib/supabase";
import { getAuthUserId } from "./useAuthStore";
import type { MateriaRow, Syllabus, Unidad } from "../types";

// USER_ID ahora viene de Supabase Auth
function USER_ID() { return getAuthUserId(); }

export interface MateriaStore {
  materias: MateriaRow[];
  loading: boolean;
  dbError: string | null;

  fetchMaterias:   () => Promise<void>;
  saveMateria:     (syllabus: Syllabus, units: Unidad[]) => Promise<MateriaRow | null>;
  updateProgress:  (materiaId: string, units: Unidad[]) => Promise<void>;
  updateEtiqueta:  (materiaId: string, etiqueta: string | null) => Promise<void>;
  deleteMateria:   (materiaId: string) => Promise<void>;
  checkDuplicate:  (nombre: string) => Promise<MateriaRow | null>;
}

export const useMateriaStore = create<MateriaStore>()((set, get) => ({
  materias: [],
  loading:  false,
  dbError:  null,

  // ── fetchMaterias ─────────────────────────────────────────────────────────
  fetchMaterias: async () => {
    set({ loading: true, dbError: null });
    try {
      const { data, error } = await supabase
        .from("materias")
        .select("*")
        .eq("user_id", USER_ID())
        .order("created_at", { ascending: false });

      if (error) throw error;
      set({ materias: (data as MateriaRow[]) ?? [] });
    } catch (e) {
      set({ dbError: e instanceof Error ? e.message : "Error cargando materias" });
    } finally {
      // `finally` garantiza que loading se apaga aunque el try falle.
      // Si lo pusiéramos solo al final del try, un throw lo saltearía.
      set({ loading: false });
    }
  },

  // ── saveMateria ───────────────────────────────────────────────────────────
  saveMateria: async (syllabus, units) => {
    try {
      const { data, error } = await supabase
        .from("materias")
        .insert({
          user_id:         USER_ID(),
          nombre:          syllabus.materia,
          descripcion:     syllabus.descripcion,
          duracion_semanas: syllabus.duracion_semanas,
          syllabus_json:   syllabus,
          units_json:      units,
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;

      const saved = data as MateriaRow;

      // Actualización optimista: agregamos al inicio de la lista
      // sin esperar un refetch completo.
      // El ID real de Supabase ya está en `saved.id`.
      set((state) => ({ materias: [saved, ...state.materias] }));

      return saved;
    } catch (e) {
      console.error("saveMateria:", e);
      toast.error("No se pudo guardar la materia. Verificá tu conexión.");
      return null;
    }
  },

  // ── updateProgress ────────────────────────────────────────────────────────
  updateProgress: async (materiaId, units) => {
    const totalTemas = units.reduce((a, u) => a + u.temas.length, 0);
    const doneTemas  = units.reduce(
      (a, u) => a + (u.temaStatus?.filter((s) => s === "done").length ?? 0), 0
    );
    const progressPercent = totalTemas > 0
      ? Math.round((doneTemas / totalTemas) * 100)
      : 0;

    // Guardamos el estado actual ANTES de actualizar (por si necesitamos rollback)
    const previous = get().materias;

    // Optimistic update
    set((state) => ({
      materias: state.materias.map((m) =>
        m.id === materiaId
          ? { ...m, units_json: units, progress_percent: progressPercent }
          : m
      ),
    }));

    try {
      const { error } = await supabase
        .from("materias")
        .update({
          units_json:       units,
          progress_percent: progressPercent,
          updated_at:       new Date().toISOString(),
        })
        .eq("id", materiaId);

      if (error) throw error;
    } catch (e) {
      // Rollback: si Supabase falla, volvemos al estado anterior.
      console.error("updateProgress:", e);
      toast.error("No se pudo guardar el progreso. Verificá tu conexión.");
      set({ materias: previous });
    }
  },

  // ── updateEtiqueta ────────────────────────────────────────────────────────
  updateEtiqueta: async (materiaId, etiqueta) => {
    const previous = get().materias;
    set((state) => ({
      materias: state.materias.map((m) =>
        m.id === materiaId ? { ...m, etiqueta } : m
      ),
    }));
    try {
      const { error } = await supabase
        .from("materias")
        .update({ etiqueta })
        .eq("id", materiaId);
      if (error) throw error;
    } catch (e) {
      console.error("updateEtiqueta:", e);
      set({ materias: previous });
    }
  },

  // ── deleteMateria ─────────────────────────────────────────────────────────
  deleteMateria: async (materiaId) => {
    const previous = get().materias;

    // Optimistic delete: la sacamos de la lista antes de confirmar
    set((state) => ({
      materias: state.materias.filter((m) => m.id !== materiaId),
    }));

    try {
      const { error } = await supabase
        .from("materias")
        .delete()
        .eq("id", materiaId);

      if (error) throw error;
    } catch (e) {
      console.error("deleteMateria:", e);
      toast.error("No se pudo eliminar la materia.");
      set({ materias: previous }); // rollback
    }
  },

  // ── checkDuplicate ────────────────────────────────────────────────────────
  checkDuplicate: async (nombre) => {
    try {
      const { data, error } = await supabase
        .from("materias")
        .select("*")
        .eq("user_id", USER_ID())
        .ilike("nombre", nombre.trim())
        .maybeSingle();

      if (error) throw error;
      return data as MateriaRow | null;
    } catch (e) {
      console.error("checkDuplicate:", e);
      return null;
    }
  },
}));
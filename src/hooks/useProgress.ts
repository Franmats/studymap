import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type { MateriaRow, Syllabus, Unidad } from "../types";

const USER_ID = "personal";

interface UseProgressReturn {
  materias: MateriaRow[];
  loading: boolean;
  checkDuplicate: (nombre: string) => Promise<MateriaRow | null>;
  saveMateria: (syllabus: Syllabus, units: Unidad[]) => Promise<MateriaRow | null>;
  updateProgress: (materiaId: string, units: Unidad[]) => Promise<void>;
  deleteMateria: (materiaId: string) => Promise<void>;
}

export function useProgress(): UseProgressReturn {
  const [materias, setMaterias] = useState<MateriaRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMaterias = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("materias")
        .select("*")
        .eq("user_id", USER_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setMaterias((data as MateriaRow[]) ?? []);
    } catch (e) {
      console.error("Error cargando materias:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadMaterias(); }, [loadMaterias]);

  // Busca si ya existe una materia con ese nombre (case-insensitive)
  const checkDuplicate = async (nombre: string): Promise<MateriaRow | null> => {
    try {
      const { data, error } = await supabase
        .from("materias")
        .select("*")
        .eq("user_id", USER_ID)
        .ilike("nombre", nombre.trim())
        .maybeSingle();
      if (error) throw error;
      return data as MateriaRow | null;
    } catch (e) {
      console.error("Error verificando duplicado:", e);
      return null;
    }
  };

  const saveMateria = async (syllabus: Syllabus, units: Unidad[]): Promise<MateriaRow | null> => {
    try {
      const { data, error } = await supabase
        .from("materias")
        .insert({
          user_id: USER_ID,
          nombre: syllabus.materia,
          descripcion: syllabus.descripcion,
          duracion_semanas: syllabus.duracion_semanas,
          syllabus_json: syllabus,
          units_json: units,
          progress_percent: 0,
        })
        .select()
        .single();
      if (error) throw error;
      await loadMaterias();
      return data as MateriaRow;
    } catch (e) {
      console.error("Error guardando materia:", e);
      return null;
    }
  };

  const updateProgress = async (materiaId: string, units: Unidad[]): Promise<void> => {
    try {
      const totalTemas = units.reduce((a, u) => a + u.temas.length, 0);
      const doneTemas = units.reduce(
        (a, u) => a + (u.temaStatus?.filter(s => s === "done").length ?? 0), 0
      );
      const progressPercent = totalTemas > 0 ? Math.round((doneTemas / totalTemas) * 100) : 0;

      const { error } = await supabase
        .from("materias")
        .update({
          units_json: units,
          progress_percent: progressPercent,
          updated_at: new Date().toISOString(),
        })
        .eq("id", materiaId);
      if (error) throw error;

      setMaterias(prev =>
        prev.map(m =>
          m.id === materiaId ? { ...m, units_json: units, progress_percent: progressPercent } : m
        )
      );
    } catch (e) {
      console.error("Error actualizando progreso:", e);
    }
  };

  const deleteMateria = async (materiaId: string): Promise<void> => {
    try {
      const { error } = await supabase.from("materias").delete().eq("id", materiaId);
      if (error) throw error;
      setMaterias(prev => prev.filter(m => m.id !== materiaId));
    } catch (e) {
      console.error("Error eliminando materia:", e);
    }
  };

  return { materias, loading, checkDuplicate, saveMateria, updateProgress, deleteMateria };
}
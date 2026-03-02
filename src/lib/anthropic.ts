import type { Syllabus } from "../types";
import { supabase } from "./supabase";

const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  throw new Error("Falta VITE_API_URL en .env.local");
}

export async function analyzeSyllabus(file: File): Promise<Syllabus> {
  // Obtener el JWT del usuario actual para autenticar el request al backend
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("No hay sesión activa. Iniciá sesión primero.");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${session.access_token}`,
      // NO poner Content-Type — el browser lo setea automático con el boundary de multipart
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Error del servidor" }));
    throw new Error((err as { error?: string }).error ?? "Error desconocido");
  }

  const data = await response.json() as { success: boolean; data: Syllabus };
  return data.data;
}
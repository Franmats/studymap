import type { Syllabus } from "../types";

// En desarrollo apunta a localhost, en producción a Render
const API_URL = import.meta.env.VITE_API_URL as string;

if (!API_URL) {
  throw new Error("Falta VITE_API_URL en .env.local");
}

export async function analyzeSyllabus(file: File): Promise<Syllabus> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    body: formData,
    // No poner Content-Type: el browser lo setea automático con el boundary de multipart
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Error del servidor" }));
    throw new Error((err as { error?: string }).error ?? "Error desconocido");
  }

  const data = await response.json() as { success: boolean; data: Syllabus };
  return data.data;
}
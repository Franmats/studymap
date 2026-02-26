import type { Syllabus } from "../types";

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string;

const PROMPT = `Analiza este temario/programa de materia y extrae toda la información relevante.
Devuelve SOLO un JSON válido con esta estructura exacta (sin markdown, sin backticks):
{
  "materia": "nombre de la materia",
  "descripcion": "breve descripción de la materia",
  "duracion_semanas": número estimado de semanas para cursar,
  "unidades": [
    {
      "numero": 1,
      "titulo": "nombre de la unidad",
      "descripcion": "descripción breve",
      "temas": ["tema 1", "tema 2", "tema 3"],
      "semanas_estimadas": número,
      "dificultad": "baja|media|alta",
      "prerequisitos": [indices de unidades anteriores que son prerequisito, por número]
    }
  ]
}
Sé preciso con los temas, extrae todos los que puedas del documento. Estima tiempos realistas.`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function analyzeSyllabus(file: File): Promise<Syllabus> {
  const base64 = await fileToBase64(file);
  const isPDF = file.type === "application/pdf";

  type ContentBlock =
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string } }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

  const contentBlock: ContentBlock = isPDF
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };

  const response = await fetch(ANTHROPIC_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: [contentBlock, { type: "text", text: PROMPT }],
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error((err as { error?: { message?: string } }).error?.message ?? "Error en la API");
  }

  const data = await response.json() as { content: { type: string; text?: string }[] };
  const text = data.content.map(b => b.text ?? "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean) as Syllabus;
}

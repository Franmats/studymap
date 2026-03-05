export type Dificultad = "baja" | "media" | "alta";
export type UnitStatus = "pending" | "in_progress" | "done";
export type TemaStatus = "pending" | "done";
export type ExamenTipo = "parcial" | "final" | "recuperatorio" | "otro";

export interface RawUnidad {
  numero: number;
  titulo: string;
  descripcion: string;
  temas: string[];
  semanas_estimadas: number;
  dificultad: Dificultad;
  prerequisitos: number[];
}

export interface Syllabus {
  materia: string;
  descripcion: string;
  duracion_semanas: number;
  unidades: RawUnidad[];
}

export interface Unidad extends RawUnidad {
  status: UnitStatus;
  temaStatus: TemaStatus[];
  notas?: string[];   // notas[i] = nota del tema i
}

export interface MateriaRow {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  duracion_semanas: number | null;
  syllabus_json: Syllabus;
  units_json: Unidad[];
  progress_percent: number;
  etiqueta: string | null;   // cuatrimestre / etiqueta libre
  created_at: string;
  updated_at: string;
}

export interface ExamenRow {
  id: string;
  materia_id: string;
  user_id: string;
  titulo: string;
  fecha: string;
  tipo: ExamenTipo;
  notas: string | null;
  aprobado: boolean | null;
  created_at: string;
}

// ── Sprint types ──────────────────────────────────────────────────────────────
export type SprintStatus = "active" | "completed" | "cancelled";

export interface SprintTema {
  materia_id: string;
  materia_nombre: string;
  unidad_num: number;
  unidad_titulo: string;
  tema_idx: number;
  tema_nombre: string;
  done: boolean;
}

export interface DailyEntry {
  date: string;          // YYYY-MM-DD
  temas_done: number;    // cuántos temas completó ese día
  nota?: string;         // nota libre del daily
}

export interface Retro {
  bien: string;          // qué salió bien
  mejorar: string;       // qué mejorar
  next_sprint: string;   // qué hacer diferente
  rating: number;        // 1-5 estrellas
}

export interface SprintRow {
  id: string;
  user_id: string;
  nombre: string;
  objetivo: string | null;
  fecha_inicio: string;  // YYYY-MM-DD
  fecha_fin: string;     // YYYY-MM-DD
  temas: SprintTema[];
  dailies: DailyEntry[];
  retro: Retro | null;
  status: SprintStatus;
  created_at: string;
}

// ── Schedule types ─────────────────────────────────────────────────────────────
export type DiaSemana = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado";
export type ClaseTipo = "teórica" | "práctica" | "laboratorio" | "otra";

export interface ClaseRow {
  id: string;
  user_id: string;
  materia_id: string;
  materia_nombre: string;
  materia_color: string;
  dia: DiaSemana;
  hora_inicio: string;   // "08:00"
  hora_fin: string;      // "10:00"
  tipo: ClaseTipo;
  profesor: string | null;
  aula: string | null;
  created_at: string;
}

// ── Time Control types ─────────────────────────────────────────────────────────
export type ActividadCategoria = "estudio" | "cursada" | "descanso" | "ejercicio" | "ocio";

export interface ActividadConfig {
  categoria:  ActividadCategoria;
  label:      string;
  icon:       string;
  color:      string;
  min_horas:  number;   // mínimo diario en horas (0 = sin mínimo)
  max_horas:  number;   // máximo diario en horas (0 = sin máximo)
}

export interface RegistroActividad {
  id:         string;
  fecha:      string;           // YYYY-MM-DD
  categoria:  ActividadCategoria;
  horas:      number;           // horas registradas ese día
  nota:       string | null;
}

export interface TimeControlRow {
  id:         string;
  user_id:    string;
  fecha:      string;
  categoria:  ActividadCategoria;
  horas:      number;
  nota:       string | null;
  created_at: string;
}
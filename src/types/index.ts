export type Dificultad = "baja" | "media" | "alta";
export type UnitStatus = "pending" | "in_progress" | "done";
export type TemaStatus = "pending" | "done";

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
  notas?: string[];
}

export interface MateriaRow {
  id: string;
  user_id: string;
  nombre: string;
  descripcion: string | null;
  duracion_semanas: number | null;
  syllabus_json: Syllabus;
  units_json: Unidad[];
  etiqueta: string | null; 
  progress_percent: number;
  created_at: string;
  updated_at: string;
}


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




export interface ExamenRow {
  id: string;
  materia_id: string;
  user_id: string;
  titulo: string;
  fecha: string;           // "YYYY-MM-DD"
  tipo: ExamenTipo;
  notas: string | null;
  aprobado: boolean | null; // null=pendiente, true=aprobado, false=desaprobado
  created_at: string;
}
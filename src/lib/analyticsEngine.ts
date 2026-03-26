import type { MateriaRow, ExamenRow, SprintRow } from "../types";
import type { TPRow } from "../types";

// ── Constantes ────────────────────────────────────────────────────────────────
const HRS_POR_TEMA        = 1.2;   // horas promedio por tema
const VELOCIDAD_FALLBACK  = 2.0;   // temas/día si no hay sprints
const DIAS_ESTUDIO_SEMANA = 5;     // días de estudio efectivo por semana

// ── Tipos exportados ──────────────────────────────────────────────────────────
export interface MateriaStats {
  materia:                 MateriaRow;
  temasTotal:              number;
  temasDone:               number;
  temasPendientes:         number;
  progresoPct:             number;
  horasEstimadasRestantes: number;
  semanasRestantes:        number;
  proximoExamen:           ExamenRow | null;
  diasHastaExamen:         number | null;
  enRiesgo:                boolean;
  ritmoNecesario:          number;
}

export interface PlannerSuggestion {
  tipo:     "estudiar" | "tp" | "sprint" | "alerta";
  urgencia: "critica" | "alta" | "media" | "baja";
  titulo:   string;
  detalle:  string;
  accion?:  string;
  meta?:    { materia_id?: string; tp_id?: string };
}

export interface AnalyticsResult {
  horasTotalesRestantes:  number;
  semanasParaTerminar:    number;
  fechaEstimadaFinGlobal: string;
  velocidadReal:          number;
  velocidadFallback:      boolean;
  cargaSemanalNecesaria:  number;
  porMateria:             MateriaStats[];
  materiasEnRiesgo:       MateriaRow[];
  tpsVencidosPronto:      TPRow[];
  tpsVencidos:            TPRow[];
  sugerenciasLocales:     PlannerSuggestion[];
}

// ── Helpers de fecha ──────────────────────────────────────────────────────────
function hoy(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDias(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

// ── Stats por materia ─────────────────────────────────────────────────────────
function calcMateriaStats(
  materia:       MateriaRow,
  examenes:      ExamenRow[],
  velocidadBase: number,
): MateriaStats {
  const units = materia.units_json ?? [];

  const temasTotal = units.reduce((s, u) => s + (u.temas?.length ?? 0), 0);
  const temasDone  = units.reduce((s, u) => {
    const ts = u.temaStatus ?? [];
    return s + ts.filter(t => t === "done").length;
  }, 0);
  const temasPendientes        = temasTotal - temasDone;
  const progresoPct            = temasTotal > 0 ? Math.round((temasDone / temasTotal) * 100) : 0;
  const horasEstimadasRestantes = Math.round(temasPendientes * HRS_POR_TEMA);

  // Próximo examen sin aprobar de esta materia
  const hoyDate = hoy();
  const examenesMateria = (examenes ?? [])
    .filter(e => e.materia_id === materia.id && !e.aprobado)
    .filter(e => diasEntre(hoyDate, new Date(e.fecha + "T00:00:00")) >= 0)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const proximoExamen   = examenesMateria[0] ?? null;
  const diasHastaExamen = proximoExamen
    ? diasEntre(hoyDate, new Date(proximoExamen.fecha + "T00:00:00"))
    : null;

  // Temas pendientes relevantes para ese examen
  // Si el examen tiene unidades asignadas, solo contar esos temas
  const unidadesExamen: number[] = (proximoExamen as any)?.unidades_nums ?? [];
  const temasPendientesExamen = unidadesExamen.length > 0
    ? units
        .filter(u => unidadesExamen.includes(u.numero))
        .reduce((s, u) => {
          const ts = u.temaStatus ?? [];
          const pendientes = ts.filter(t => t !== "done").length;
          return s + pendientes;
        }, 0)
    : temasPendientes;

  const ritmoNecesario = diasHastaExamen && diasHastaExamen > 0 && temasPendientesExamen > 0
    ? temasPendientesExamen / diasHastaExamen
    : 0;

  const enRiesgo = !!proximoExamen
    && diasHastaExamen !== null
    && ritmoNecesario > velocidadBase * 1.5
    && temasPendientesExamen > 0;

  const semanasRestantes = Math.ceil(
    temasPendientes / (velocidadBase * DIAS_ESTUDIO_SEMANA)
  );

  return {
    materia, temasTotal, temasDone, temasPendientes, progresoPct,
    horasEstimadasRestantes, semanasRestantes,
    proximoExamen, diasHastaExamen, enRiesgo, ritmoNecesario,
  };
}

// ── Sugerencias locales ───────────────────────────────────────────────────────
function generarSugerencias(
  porMateria: MateriaStats[],
  tps:        TPRow[],
  sprints:    SprintRow[],
): PlannerSuggestion[] {
  const sugs: PlannerSuggestion[] = [];
  const hoyDate = hoy();
  const haySprintActivo = sprints.some(s => s.status === "active");

  // Materias en riesgo
  [...porMateria]
    .filter(m => m.enRiesgo && m.diasHastaExamen !== null)
    .sort((a, b) => (a.diasHastaExamen ?? 999) - (b.diasHastaExamen ?? 999))
    .slice(0, 3)
    .forEach(m => {
      sugs.push({
        tipo: "alerta", urgencia: "critica",
        titulo: `⚠️ En riesgo: ${m.materia.nombre}`,
        detalle: `Quedan ${m.temasPendientes} temas y ${m.diasHastaExamen}d hasta el examen. Necesitás ${m.ritmoNecesario.toFixed(1)} temas/día.`,
        accion: "Ver materia",
        meta: { materia_id: m.materia.id },
      });
    });

  // TPs críticos (≤3 días)
  tps
    .filter(t => t.estado !== "entregado")
    .map(t => {
      const dias = Math.ceil(
        (new Date(t.fecha_entrega + "T00:00:00").getTime() - hoyDate.getTime()) / 86400000
      );
      return { tp: t, dias };
    })
    .filter(({ dias }) => dias >= 0 && dias <= 3)
    .sort((a, b) => a.dias - b.dias)
    .forEach(({ tp, dias }) => {
      sugs.push({
        tipo: "tp", urgencia: dias === 0 ? "critica" : "alta",
        titulo: `📝 ${tp.titulo}`,
        detalle: `${dias === 0 ? "Vence HOY" : `Vence en ${dias}d`} — ${tp.materia_nombre}`,
        accion: "Ver TPs",
        meta: { tp_id: tp.id },
      });
    });

  // TPs próximos (4–7 días)
  tps
    .filter(t => t.estado !== "entregado")
    .map(t => {
      const dias = Math.ceil(
        (new Date(t.fecha_entrega + "T00:00:00").getTime() - hoyDate.getTime()) / 86400000
      );
      return { tp: t, dias };
    })
    .filter(({ dias }) => dias > 3 && dias <= 7)
    .sort((a, b) => a.dias - b.dias)
    .forEach(({ tp, dias }) => {
      sugs.push({
        tipo: "tp", urgencia: "media",
        titulo: `📋 Preparar: ${tp.titulo}`,
        detalle: `Vence en ${dias}d — ${tp.materia_nombre}`,
        accion: "Ver TPs",
        meta: { tp_id: tp.id },
      });
    });

  // Sugerir sprint si no hay uno activo
  const conTemas = porMateria.filter(m => m.temasPendientes > 0);
  if (!haySprintActivo && conTemas.length > 0) {
    const top = [...conTemas].sort((a, b) => {
      const sa = (a.enRiesgo ? 100 : 0) + 10 / Math.max(a.diasHastaExamen ?? 999, 1);
      const sb = (b.enRiesgo ? 100 : 0) + 10 / Math.max(b.diasHastaExamen ?? 999, 1);
      return sb - sa;
    })[0];
    sugs.push({
      tipo: "sprint", urgencia: "alta",
      titulo: "🚀 Crear sprint semanal",
      detalle: `Sin sprints activos. Empezá con ${top.materia.nombre} (${top.temasPendientes} temas).`,
      accion: "Crear sprint",
    });
  }

  // Qué estudiar hoy
  porMateria
    .filter(m => m.temasPendientes > 0 && !m.enRiesgo)
    .sort((a, b) => (a.diasHastaExamen ?? 999) - (b.diasHastaExamen ?? 999))
    .slice(0, 2)
    .forEach(m => {
      sugs.push({
        tipo: "estudiar", urgencia: "baja",
        titulo: `📚 Estudiar: ${m.materia.nombre}`,
        detalle: `${m.temasPendientes} temas pendientes${m.diasHastaExamen ? ` · examen en ${m.diasHastaExamen}d` : ""}.`,
        accion: "Ver materia",
        meta: { materia_id: m.materia.id },
      });
    });

  return sugs;
}

// ── Entry point ───────────────────────────────────────────────────────────────
export function calcularAnalytics(
  materias: MateriaRow[],
  examenes: ExamenRow[],
  sprints:  SprintRow[],
  tps:      TPRow[],
): AnalyticsResult {
  const hoyDate = hoy();

  // ── Velocidad real desde sprints completados (últimos 60 días) ──────────────
  // Calculamos: temas completados totales / días transcurridos desde primer sprint
  // Esto es más representativo que dividir por la duración interna de cada sprint
  const hace60 = addDias(hoyDate, -60);
  const sprintsRecientes = sprints.filter(s =>
    s.status === "completed" &&
    new Date(s.fecha_fin + "T00:00:00") >= hace60
  );

  let velocidadReal     = 0;
  let velocidadFallback = true;

  if (sprintsRecientes.length > 0) {
    // Total temas hechos / días totales del período (más estable que por sprint)
    const totalHechos = sprintsRecientes.reduce(
      (s, sp) => s + sp.temas.filter(t => t.done).length, 0
    );
    const primerSprint = sprintsRecientes
      .sort((a, b) => a.fecha_inicio.localeCompare(b.fecha_inicio))[0];
    const diasPeriodo = Math.max(
      1,
      diasEntre(new Date(primerSprint.fecha_inicio + "T00:00:00"), hoyDate)
    );
    // Solo contar días de estudio efectivo (5/7)
    const diasEstudio = diasPeriodo * (DIAS_ESTUDIO_SEMANA / 7);
    velocidadReal     = totalHechos / Math.max(diasEstudio, 1);
    velocidadFallback = false;
  }

  const velocidadBase = velocidadReal > 0.1 ? velocidadReal : VELOCIDAD_FALLBACK;

  // Stats por materia (solo incompletas)
  const porMateria = materias
    .filter(m => m.progress_percent < 100)
    .map(m => calcMateriaStats(m, examenes, velocidadBase));

  // Totales
  const horasTotalesRestantes  = porMateria.reduce((s, m) => s + m.horasEstimadasRestantes, 0);
  const temasTotalesPendientes = porMateria.reduce((s, m) => s + m.temasPendientes, 0);
  const diasParaTerminar       = Math.ceil(temasTotalesPendientes / velocidadBase);
  const semanasParaTerminar    = Math.ceil(diasParaTerminar / 7);
  const fechaEstimadaFinGlobal = fmtDate(addDias(hoyDate, diasParaTerminar));

  // Carga necesaria: temas pendientes / semanas hasta el examen más lejano
  const examenMasLejano = (examenes ?? [])
    .filter(e => !e.aprobado && diasEntre(hoyDate, new Date(e.fecha + "T00:00:00")) > 0)
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  const semanasHastaFin = examenMasLejano
    ? Math.max(1, Math.ceil(diasEntre(hoyDate, new Date(examenMasLejano.fecha + "T00:00:00")) / 7))
    : Math.max(semanasParaTerminar, 1);

  const cargaSemanalNecesaria = isFinite(temasTotalesPendientes / semanasHastaFin)
    ? Math.round(temasTotalesPendientes / semanasHastaFin)
    : 0;

  const materiasEnRiesgo = porMateria.filter(m => m.enRiesgo).map(m => m.materia);

  const tpsVencidosPronto = (tps ?? []).filter(t => {
    if (t.estado === "entregado") return false;
    const d = Math.ceil((new Date(t.fecha_entrega + "T00:00:00").getTime() - hoyDate.getTime()) / 86400000);
    return d >= 0 && d <= 7;
  });

  const tpsVencidos = (tps ?? []).filter(t => {
    if (t.estado === "entregado") return false;
    return new Date(t.fecha_entrega + "T00:00:00") < hoyDate;
  });

  const sugerenciasLocales = generarSugerencias(porMateria, tps ?? [], sprints ?? []);

  return {
    horasTotalesRestantes,
    semanasParaTerminar,
    fechaEstimadaFinGlobal,
    velocidadReal: velocidadBase,
    velocidadFallback,
    cargaSemanalNecesaria,
    porMateria,
    materiasEnRiesgo,
    tpsVencidosPronto,
    tpsVencidos,
    sugerenciasLocales,
  };
}

// ── Serializar contexto para IA ───────────────────────────────────────────────
export function serializarContextoParaIA(
  result:  AnalyticsResult,
  tps:     TPRow[],
  sprints: SprintRow[],
): string {
  const hoyStr = new Date().toLocaleDateString("es-AR", {
    weekday: "long", day: "numeric", month: "long",
  });

  const materiasResumen = result.porMateria.slice(0, 12).map(m => {
    const ex = m.proximoExamen
      ? `examen "${m.proximoExamen.titulo}" en ${m.diasHastaExamen}d`
      : "sin examen próximo";
    return `- ${m.materia.nombre}: ${m.progresoPct}% completada, ${m.temasPendientes} temas pendientes, ${ex}${m.enRiesgo ? " ⚠️ EN RIESGO" : ""}`;
  }).join("\n");

  const tpsResumen = (tps ?? [])
    .filter(t => t.estado !== "entregado")
    .slice(0, 10)
    .map(t => {
      const dias = Math.ceil(
        (new Date(t.fecha_entrega + "T00:00:00").getTime() - Date.now()) / 86400000
      );
      return `- "${t.titulo}" (${t.materia_nombre}): ${t.estado}, entrega en ${dias}d`;
    }).join("\n");

  const sprintsActivos = (sprints ?? []).filter(s => s.status === "active");
  const sprintsResumen = sprintsActivos.length > 0
    ? sprintsActivos.map(s => {
        const done = s.temas.filter(t => t.done).length;
        return `- "${s.nombre}": ${done}/${s.temas.length} temas`;
      }).join("\n")
    : "Sin sprints activos";

  return `Hoy es ${hoyStr}.

MATERIAS (incompletas):
${materiasResumen || "Sin materias"}

TPS PENDIENTES:
${tpsResumen || "Sin TPs pendientes"}

SPRINTS:
${sprintsResumen}

MÉTRICAS:
- Velocidad: ${result.velocidadFallback ? `~${result.velocidadReal} temas/día (estimada)` : `${result.velocidadReal.toFixed(2)} temas/día real`}
- Horas restantes estimadas: ${result.horasTotalesRestantes}hs
- Carga semanal necesaria: ${result.cargaSemanalNecesaria} temas/semana
- Materias en riesgo: ${result.materiasEnRiesgo.map(m => m.nombre).join(", ") || "ninguna"}`;
}
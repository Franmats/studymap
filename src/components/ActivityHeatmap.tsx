import { useMemo, memo } from "react";
import { useSesionStore } from "../store/useSesionStore";


const MESES  = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
const DIAS_SEM = ["", "Lu", "", "Mi", "", "Vi", ""];

function getLvl(count: number): string {
  if (count === 0) return "";
  if (count <= 2)  return "lvl-1";
  if (count <= 5)  return "lvl-2";
  if (count <= 10) return "lvl-3";
  return "lvl-4";
}

function buildGrid() {
  // 52 semanas hacia atrás desde hoy
  const hoy    = new Date(); hoy.setHours(0,0,0,0);
  const inicio = new Date(hoy);
  inicio.setDate(inicio.getDate() - 364);
  // Empezamos el domingo de esa semana
  inicio.setDate(inicio.getDate() - inicio.getDay());

  const weeks: { date: string; dayOfWeek: number }[][] = [];
  const cur = new Date(inicio);

  while (cur <= hoy) {
    const week: { date: string; dayOfWeek: number }[] = [];
    for (let d = 0; d < 7; d++) {
      week.push({
        date:       cur.toISOString().split("T")[0],
        dayOfWeek:  cur.getDay(),
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Calculamos en qué posición horizontal va cada mes
function getMonthLabels(weeks: ReturnType<typeof buildGrid>) {
  const labels: { mes: string; col: number }[] = [];
  let lastMes = -1;
  weeks.forEach((week, col) => {
    const mes = new Date(week[0].date + "T00:00:00").getMonth();
    if (mes !== lastMes) {
      labels.push({ mes: MESES[mes], col });
      lastMes = mes;
    }
  });
  return labels;
}

export const ActivityHeatmap = memo(function ActivityHeatmap() {
  const { historial } = useSesionStore();

  const weeks        = useMemo(() => buildGrid(), []);
  const monthLabels  = useMemo(() => getMonthLabels(weeks), [weeks]);
  const mapaActividad: Record<string, number> = {};
  historial.forEach((s) => { mapaActividad[s.fecha] = s.temas_count; });

  const totalTemas = historial.reduce((a, s) => a + s.temas_count, 0);
  const hoyStr     = new Date().toISOString().split("T")[0];
  const CELL_W     = 13; // px por celda + gap

  return (
    <>      <div className="hm">
        <div className="hm-header">
          <span className="hm-title">📊 Actividad</span>
          <span className="hm-total">{totalTemas} temas en el último año</span>
        </div>

        {/* Etiquetas de meses */}
        <div className="hm-months">
          {monthLabels.map(({ mes, col }, i) => {
            const next = monthLabels[i + 1];
            const width = next ? (next.col - col) * CELL_W : undefined;
            return (
              <span key={`${mes}-${col}`} className="hm-month"
                style={{ width: width ? `${width}px` : undefined, display:"block" }}>
                {mes}
              </span>
            );
          })}
        </div>

        <div className="hm-body">
          {/* Días de la semana */}
          <div className="hm-weekdays">
            {DIAS_SEM.map((d, i) => (
              <span key={i} className="hm-weekday">{d}</span>
            ))}
          </div>

          {/* Grilla de semanas */}
          <div className="hm-weeks">
            {weeks.map((week, wi) => (
              <div key={wi} className="hm-week">
                {week.map(({ date }) => {
                  const count = mapaActividad[date] ?? 0;
                  const lvl   = getLvl(count);
                  const isHoy = date === hoyStr;
                  const cls   = ["hm-cell", lvl, isHoy ? "today" : "", count > 0 ? "has-data" : ""]
                    .filter(Boolean).join(" ");

                  return (
                    <div key={date} className="hm-cell-wrap">
                      <div
                        className={cls}
                        style={count > 0 ? { animationDelay: `${wi * 8}ms` } : undefined}
                      />
                      {/* Tooltip solo si hay actividad */}
                      {count > 0 && (
                        <div className="hm-tooltip">
                          {new Date(date + "T00:00:00").toLocaleDateString("es-AR", {
                            day:"numeric", month:"short"
                          })} · {count} tema{count !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="hm-legend">
          <span className="hm-legend-lbl">Menos</span>
          {["", "lvl-1", "lvl-2", "lvl-3", "lvl-4"].map((lvl) => (
            <div key={lvl} className={`hm-legend-cell hm-cell ${lvl}`}
              style={{ background: lvl ? undefined : "rgba(255,255,255,.05)" }}/>
          ))}
          <span className="hm-legend-lbl">Más</span>
        </div>
      </div>
    </>
  );
}
);
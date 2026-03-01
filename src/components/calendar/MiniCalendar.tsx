import { useState } from "react";
import type { ExamenRow, ExamenTipo } from "../../types";

const TIPO_COLOR: Record<ExamenTipo, string> = {
  parcial:       "#6C5CE7",
  final:         "#FF6B6B",
  recuperatorio: "#FF9F43",
  otro:          "#48CAE4",
};

const DIAS   = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
const MESES  = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const CSS = `
  .mc { background: rgba(255,255,255,.04); border-radius: 16px;
    padding: 16px; border: 1px solid rgba(255,255,255,.08); }
  .mc-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
  .mc-mes { font-size: 15px; font-weight: 800; color: #fff; }
  .mc-nav { display: flex; gap: 6px; }
  .mc-nav-btn { background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.1);
    color: rgba(255,255,255,.7); width: 30px; height: 30px; border-radius: 8px;
    cursor: pointer; font-size: 14px; display: flex; align-items: center; justify-content: center;
    -webkit-tap-highlight-color: transparent; }
  .mc-nav-btn:active { background: rgba(255,255,255,.14); }

  .mc-grid { display: grid; grid-template-columns: repeat(7,1fr); gap: 2px; }
  .mc-day-name { text-align: center; font-size: 10px; font-weight: 700;
    color: rgba(255,255,255,.25); padding: 4px 0 8px; letter-spacing: .5px; }
  .mc-day {
    aspect-ratio: 1; border-radius: 8px; display: flex; flex-direction: column;
    align-items: center; justify-content: center; position: relative;
    cursor: default; min-height: 32px;
  }
  .mc-day.other-month { opacity: .25; }
  .mc-day.today { background: rgba(162,155,254,.15); }
  .mc-day.today .mc-day-num { color: #a29bfe; font-weight: 900; }
  .mc-day.has-exam { cursor: pointer; }
  .mc-day.has-exam:active { background: rgba(255,255,255,.06); }
  .mc-day.selected { background: rgba(108,92,231,.25); border: 1px solid #6C5CE7; }

  .mc-day-num { font-size: 12px; color: rgba(255,255,255,.65); font-weight: 500; line-height: 1; }
  .mc-day.has-exam .mc-day-num { color: #fff; font-weight: 700; }

  .mc-dots { display: flex; gap: 2px; margin-top: 2px; flex-wrap: wrap;
    justify-content: center; max-width: 24px; }
  .mc-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .mc-detail { margin-top: 12px; padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,.06); }
  .mc-detail-date { font-size: 11px; font-weight: 700; color: rgba(255,255,255,.4);
    text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
  .mc-detail-item { display: flex; align-items: center; gap: 8px;
    padding: 8px 10px; border-radius: 9px; background: rgba(255,255,255,.05);
    margin-bottom: 5px; }
  .mc-detail-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .mc-detail-name { font-size: 12px; color: #fff; font-weight: 600; flex: 1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .mc-detail-tipo { font-size: 10px; color: rgba(255,255,255,.35); font-weight: 600; }
`;

interface Props {
  examenes: ExamenRow[];
  onDayClick?: (fecha: string, examenes: ExamenRow[]) => void;
}

export function MiniCalendar({ examenes, onDayClick }: Props) {
  const hoy = new Date();
  const [year,  setYear]  = useState(hoy.getFullYear());
  const [month, setMonth] = useState(hoy.getMonth());
  const [selected, setSelected] = useState<string | null>(null);

  // Mapa fecha → examenes para ese día
  const examenMap: Record<string, ExamenRow[]> = {};
  examenes.forEach((e) => {
    if (!examenMap[e.fecha]) examenMap[e.fecha] = [];
    examenMap[e.fecha].push(e);
  });

  // Construir grilla del mes
  const firstDay   = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();

  const cells: { date: string; day: number; currentMonth: boolean }[] = [];

  // Días del mes anterior
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const m = month === 0 ? 11 : month - 1;
    const y = month === 0 ? year - 1 : year;
    cells.push({ date: `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, currentMonth: false });
  }
  // Días del mes actual
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`, day: d, currentMonth: true });
  }
  // Completar hasta 42 celdas (6 semanas)
  let nextDay = 1;
  while (cells.length < 42) {
    const m = month === 11 ? 0  : month + 1;
    const y = month === 11 ? year + 1 : year;
    cells.push({ date: `${y}-${String(m+1).padStart(2,"0")}-${String(nextDay).padStart(2,"0")}`, day: nextDay++, currentMonth: false });
  }

  const todayStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`;

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y-1); } else setMonth(m => m-1); setSelected(null); };
  const next = () => { if (month === 11) { setMonth(0);  setYear(y => y+1); } else setMonth(m => m+1); setSelected(null); };

  const selectedExamenes = selected ? (examenMap[selected] ?? []) : [];

  return (
    <>
      <style>{CSS}</style>
      <div className="mc">
        <div className="mc-header">
          <div className="mc-mes">{MESES[month]} {year}</div>
          <div className="mc-nav">
            <button className="mc-nav-btn" onClick={prev}>‹</button>
            <button className="mc-nav-btn" onClick={next}>›</button>
          </div>
        </div>

        <div className="mc-grid">
          {DIAS.map((d) => <div key={d} className="mc-day-name">{d}</div>)}

          {cells.map((cell) => {
            const cellExamenes = examenMap[cell.date] ?? [];
            const hasExam    = cellExamenes.length > 0;
            const isToday    = cell.date === todayStr;
            const isSelected = cell.date === selected;
            const cls = [
              "mc-day",
              !cell.currentMonth && "other-month",
              isToday           && "today",
              hasExam           && "has-exam",
              isSelected        && "selected",
            ].filter(Boolean).join(" ");

            return (
              <div
                key={cell.date}
                className={cls}
                onClick={() => {
                  if (!hasExam) return;
                  setSelected(isSelected ? null : cell.date);
                  onDayClick?.(cell.date, cellExamenes);
                }}
              >
                <div className="mc-day-num">{cell.day}</div>
                {hasExam && (
                  <div className="mc-dots">
                    {cellExamenes.slice(0, 3).map((e) => (
                      <div key={e.id} className="mc-dot" style={{ background: TIPO_COLOR[e.tipo] }}/>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Detalle del día seleccionado */}
        {selected && selectedExamenes.length > 0 && (
          <div className="mc-detail">
            <div className="mc-detail-date">
              {new Date(selected + "T00:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}
            </div>
            {selectedExamenes.map((e) => (
              <div key={e.id} className="mc-detail-item">
                <div className="mc-detail-dot" style={{ background: TIPO_COLOR[e.tipo] }}/>
                <div className="mc-detail-name">{e.titulo}</div>
                <div className="mc-detail-tipo">{e.tipo}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
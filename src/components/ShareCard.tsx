// ShareCard — genera una imagen del progreso del usuario para compartir.
// Dibuja en un <canvas> y lo convierte a PNG descargable o compartible.
// No depende de librerías externas — Canvas API puro.
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { MateriaRow } from "../types";

const CSS = `
  @keyframes sc-enter { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  @keyframes sc-bg    { from{opacity:0} to{opacity:1} }

  .sc-overlay {
    position:fixed; inset:0; z-index:1000;
    background:rgba(0,0,0,.75); backdrop-filter:blur(6px);
    display:flex; align-items:center; justify-content:center; padding:20px;
    animation:sc-bg .25s ease;
  }
  .sc-modal {
    background:#1a1535; border:1px solid rgba(255,255,255,.1);
    border-radius:20px; padding:24px; width:100%; max-width:400px;
    animation:sc-enter .3s cubic-bezier(.34,1.2,.64,1);
  }
  .sc-title { font-size:16px; font-weight:800; color:#fff; margin-bottom:16px;
    display:flex; align-items:center; gap:8px; }
  .sc-preview {
    border-radius:14px; overflow:hidden; margin-bottom:16px;
    border:1px solid rgba(255,255,255,.08);
  }
  .sc-preview canvas { display:block; width:100%; height:auto; }
  .sc-actions { display:flex; gap:8px; }
  .sc-btn {
    flex:1; padding:11px; border-radius:12px; cursor:pointer; font-size:13px; font-weight:700;
    border:none; transition:transform .15s; -webkit-tap-highlight-color:transparent;
  }
  .sc-btn:active { transform:scale(.97); }
  .sc-btn-cancel { background:rgba(255,255,255,.08); color:rgba(255,255,255,.6); border:1px solid rgba(255,255,255,.1)!important; }
  .sc-btn-download { background:linear-gradient(135deg,#6C5CE7,#a29bfe); color:#fff;
    box-shadow:0 4px 14px rgba(108,92,231,.5); }
  .sc-btn-share { background:linear-gradient(135deg,#55EFC4,#00b894); color:#1a1535;
    box-shadow:0 4px 14px rgba(85,239,196,.4); }
  .sc-generating { text-align:center; padding:40px 20px; color:rgba(255,255,255,.4); font-size:13px; }
`;

// Colores de materias (mismos que App.tsx)
const MAT_COLORS = ["#FF6B6B","#FF9F43","#FECA57","#48CAE4","#6C5CE7","#A29BFE","#55EFC4","#FD79A8"];

/* function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = word;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, y);
  return y + lineH;
} */

function drawCard(canvas: HTMLCanvasElement, materias: MateriaRow[], streak: number) {
  const W = 800, H = Math.max(480, 220 + materias.length * 72 + 80);
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Fondo degradado
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0f0c29");
  grad.addColorStop(.6, "#302b63");
  grad.addColorStop(1, "#1a1040");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Glow decorativo
  const glow = ctx.createRadialGradient(W - 80, 60, 0, W - 80, 60, 220);
  glow.addColorStop(0, "rgba(108,92,231,.3)");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Logo + título
  ctx.fillStyle = "#6C5CE7";
  roundRect(ctx, 32, 28, 44, 44, 12);
  ctx.fill();
  ctx.font = "bold 26px Arial"; ctx.fillStyle = "#fff";
  ctx.fillText("🗺", 34, 62);

  ctx.font = "bold 26px Arial"; ctx.fillStyle = "#fff";
  ctx.fillText("StudyMap AI", 90, 52);
  ctx.font = "14px Arial"; ctx.fillStyle = "rgba(255,255,255,.4)";
  ctx.fillText("Mi progreso de estudio", 90, 72);

  // Streak badge
  if (streak > 0) {
    ctx.font = "bold 14px Arial"; ctx.fillStyle = "#FECA57";
    ctx.fillText(`🔥 ${streak} días de racha`, W - 180, 52);
  }

  // Fecha
  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(255,255,255,.3)";
  const fecha = new Date().toLocaleDateString("es-AR", { day:"numeric", month:"long", year:"numeric" });
  ctx.fillText(fecha, W - 180, 72);

  // Línea separadora
  ctx.strokeStyle = "rgba(255,255,255,.08)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, 96); ctx.lineTo(W - 32, 96); ctx.stroke();

  // Estadísticas globales
  const totalMaterias  = materias.length;
  const completadas    = materias.filter((m) => m.progress_percent === 100).length;
  const avgProgress    = totalMaterias > 0
    ? Math.round(materias.reduce((a, m) => a + m.progress_percent, 0) / totalMaterias)
    : 0;

  const stats = [
    { label:"Materias",    value: String(totalMaterias) },
    { label:"Completadas", value: String(completadas)   },
    { label:"Progreso promedio", value: `${avgProgress}%` },
  ];

  let sx = 40;
  stats.forEach(({ label, value }) => {
    ctx.font = "bold 28px Arial"; ctx.fillStyle = "#fff";
    ctx.fillText(value, sx, 140);
    ctx.font = "12px Arial"; ctx.fillStyle = "rgba(255,255,255,.4)";
    ctx.fillText(label, sx, 158);
    sx += 220;
  });

  // Línea
  ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(32, 174); ctx.lineTo(W - 32, 174); ctx.stroke();

  // Lista de materias
  let y = 192;
  materias.slice(0, 6).forEach((mat, i) => {
    const pct   = mat.progress_percent;
    const color = MAT_COLORS[i % MAT_COLORS.length];
    const barW  = W - 200;

    // Nombre
    ctx.font = "bold 15px Arial"; ctx.fillStyle = "#fff";
    const nombre = mat.nombre.length > 30 ? mat.nombre.slice(0, 28) + "…" : mat.nombre;
    ctx.fillText(nombre, 40, y + 16);

    // Porcentaje
    ctx.font = "bold 15px Arial"; ctx.fillStyle = color;
    ctx.fillText(`${pct}%`, W - 60, y + 16);

    // Barra
    ctx.fillStyle = "rgba(255,255,255,.06)";
    roundRect(ctx, 40, y + 24, barW, 8, 4); ctx.fill();
    if (pct > 0) {
      ctx.fillStyle = color;
      roundRect(ctx, 40, y + 24, Math.max(8, barW * pct / 100), 8, 4); ctx.fill();
    }
    y += 60;
  });

  if (materias.length > 6) {
    ctx.font = "12px Arial"; ctx.fillStyle = "rgba(255,255,255,.3)";
    ctx.fillText(`+ ${materias.length - 6} materias más`, 40, y + 10);
    y += 30;
  }

  // Footer
  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(255,255,255,.2)";
  ctx.fillText("Creado con StudyMap AI", 40, H - 20);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

interface Props {
  materias: MateriaRow[];
  streak:   number;
  onClose:  () => void;
}

export function ShareCard({ materias, streak, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready,  setReady]  = useState(false);
  const [shared, setShared] = useState(false);

  // Dibuja cuando el canvas está listo
  const onCanvasReady = (el: HTMLCanvasElement | null) => {
    if (!el || ready) return;
    (canvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
    drawCard(el, materias, streak);
    setReady(true);
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `studymap-progreso-${new Date().toISOString().split("T")[0]}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], "progreso.png", { type:"image/png" })] })) {
        await navigator.share({
          title: "Mi progreso en StudyMap AI",
          files: [new File([blob], "progreso.png", { type:"image/png" })],
        });
        setShared(true);
      } else {
        // Fallback: download
        handleDownload();
      }
    }, "image/png");
  };

  const canShareNative = typeof navigator !== "undefined" && !!navigator.share;

  return createPortal(
    <>
      <style>{CSS}</style>
      <div className="sc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="sc-modal">
          <div className="sc-title">
            <span>📤</span> Compartir progreso
          </div>

          <div className="sc-preview">
            <canvas ref={onCanvasReady} />
          </div>

          <div className="sc-actions">
            <button className="sc-btn sc-btn-cancel" onClick={onClose}>Cerrar</button>
            <button className="sc-btn sc-btn-download" onClick={handleDownload}>⬇ Descargar</button>
            {canShareNative && (
              <button className="sc-btn sc-btn-share" onClick={handleShare}>
                {shared ? "✓ Listo" : "↗ Compartir"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
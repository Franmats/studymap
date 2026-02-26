import type { Syllabus, Unidad } from "../types";

const COLORS_HEX: [number, number, number][] = [
  [255, 107, 107], [255, 159, 67], [254, 202, 87], [72, 202, 228],
  [108, 92, 231], [162, 155, 254], [85, 239, 196], [253, 121, 168],
];
const DIFF_LABEL: Record<string, string> = { baja: "Baja", media: "Media", alta: "Alta" };
const DIFF_COLOR: Record<string, [number, number, number]> = {
  baja: [85, 239, 196], media: [254, 202, 87], alta: [255, 107, 107],
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente", in_progress: "En progreso", done: "Completado",
};
const STATUS_ICON: Record<string, string> = { pending: "○", in_progress: "◐", done: "●" };

export async function exportToPDF(syllabus: Syllabus, units: Unidad[]): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210, margin = 16, contentW = W - margin * 2;
  let y = 0;

  const addPage = () => {
    doc.addPage();
    doc.setFillColor(15, 12, 41); doc.rect(0, 0, 210, 297, "F");
    doc.setFillColor(108, 92, 231); doc.rect(0, 0, 4, 297, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.setTextColor(108, 92, 231);
    doc.text("STUDYMAP AI  ·  " + syllabus.materia.toUpperCase(), margin + 8, 10);
    doc.setDrawColor(40, 35, 80); doc.setLineWidth(0.3);
    doc.line(margin + 8, 13, W - margin, 13);
    y = 20;
  };

  // COVER
  doc.setFillColor(15, 12, 41); doc.rect(0, 0, 210, 297, "F");
  doc.setFillColor(108, 92, 231); doc.rect(0, 0, 8, 297, "F");
  doc.setFillColor(25, 20, 60); doc.circle(180, 60, 50, "F");
  doc.setFillColor(108, 92, 231); doc.circle(180, 60, 30, "F");
  doc.setFillColor(162, 155, 254); doc.circle(180, 60, 12, "F");

  y = 40;
  doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.setTextColor(162, 155, 254);
  doc.text("STUDYMAP AI — ROADMAP DE ESTUDIO", margin + 10, y);
  y += 14;
  doc.setFontSize(30); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  const titleLines = doc.splitTextToSize(syllabus.materia, contentW - 20);
  doc.text(titleLines, margin + 10, y);
  y += titleLines.length * 12 + 6;
  doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 130, 200);
  const descLines = doc.splitTextToSize(syllabus.descripcion ?? "", contentW - 20);
  doc.text(descLines, margin + 10, y);
  y += descLines.length * 6 + 16;
  doc.setDrawColor(108, 92, 231); doc.setLineWidth(0.6);
  doc.line(margin + 10, y, W - margin - 10, y);
  y += 14;

  const totalTemas = units.reduce((a, u) => a + u.temas.length, 0);
  const doneTemas = units.reduce((a, u) => a + (u.temaStatus?.filter(s => s === "done").length ?? 0), 0);
  const globalProgress = totalTemas > 0 ? Math.round((doneTemas / totalTemas) * 100) : 0;
  const totalSemanas = units.reduce((a, u) => a + (u.semanas_estimadas ?? 0), 0);

  const stats = [
    { label: "Unidades", value: String(units.length) },
    { label: "Temas", value: String(totalTemas) },
    { label: "Semanas", value: String(totalSemanas) },
    { label: "Progreso", value: `${globalProgress}%` },
  ];
  const statW = (contentW - 20) / stats.length;
  stats.forEach((s, i) => {
    const sx = margin + 10 + i * statW;
    doc.setFillColor(25, 22, 55); doc.roundedRect(sx, y, statW - 4, 28, 4, 4, "F");
    doc.setFontSize(20); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(s.value, sx + (statW - 4) / 2, y + 14, { align: "center" });
    doc.setFontSize(7.5); doc.setFont("helvetica", "normal"); doc.setTextColor(162, 155, 254);
    doc.text(s.label, sx + (statW - 4) / 2, y + 22, { align: "center" });
  });
  y += 38;
  doc.setFillColor(35, 30, 70); doc.roundedRect(margin + 10, y, contentW - 20, 7, 3, 3, "F");
  if (globalProgress > 0) {
    doc.setFillColor(108, 92, 231);
    doc.roundedRect(margin + 10, y, (contentW - 20) * (globalProgress / 100), 7, 3, 3, "F");
  }
  y += 12; doc.setFontSize(8); doc.setTextColor(162, 155, 254);
  doc.text(`${doneTemas} de ${totalTemas} temas completados · ${globalProgress}% avanzado`, margin + 10, y);
  doc.setFontSize(8); doc.setTextColor(60, 55, 100);
  doc.text(`Generado el ${new Date().toLocaleDateString("es-AR")} con StudyMap AI`, W / 2, 285, { align: "center" });

  // UNITS
  addPage();
  doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
  doc.text("Roadmap de Estudio", margin + 8, y);
  y += 14;

  units.forEach((unit, i) => {
    const colorHex = COLORS_HEX[i % COLORS_HEX.length];
    const doneCount = unit.temaStatus?.filter(s => s === "done").length ?? 0;
    const unitProgress = unit.temas.length > 0 ? Math.round((doneCount / unit.temas.length) * 100) : 0;
    const diff = unit.dificultad ?? "media";
    const status = unit.status ?? "pending";
    let estH = 44;
    if (unit.descripcion) estH += 10;
    if (unit.prerequisitos?.length > 0) estH += 8;
    unit.temas.forEach(t => { estH += doc.splitTextToSize("○ " + t, contentW - 36).length * 5.2; });
    estH += 6;
    if (y + estH > 278) addPage();
    const cardX = margin + 8, cardW = contentW - 16;
    doc.setFillColor(22, 18, 50); doc.roundedRect(cardX, y, cardW, estH, 5, 5, "F");
    doc.setFillColor(...colorHex); doc.roundedRect(cardX, y, 4, estH, 3, 3, "F");
    doc.setFillColor(...colorHex); doc.circle(cardX + 16, y + 13, 8, "F");
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    doc.text(String(i + 1), cardX + 16, y + 16.5, { align: "center" });
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(255, 255, 255);
    const tLines = doc.splitTextToSize(unit.titulo, cardW - 70);
    doc.text(tLines, cardX + 28, y + 10);
    let bx = cardX + 28;
    const by = y + 10 + tLines.length * 6 + 1;
    const drawBadge = (label: string, textRGB: [number, number, number], w = 26) => {
      doc.setFillColor(30, 26, 65); doc.roundedRect(bx, by, w, 6.5, 2, 2, "F");
      doc.setFontSize(6.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...textRGB);
      doc.text(label, bx + w / 2, by + 4.5, { align: "center" });
      bx += w + 3;
    };
    drawBadge(`${unit.semanas_estimadas} sem.`, colorHex, 24);
    drawBadge(`Dif: ${DIFF_LABEL[diff] ?? diff}`, DIFF_COLOR[diff] ?? [162, 155, 254], 28);
    drawBadge(`${STATUS_ICON[status]} ${STATUS_LABEL[status]}`, [200, 200, 220] as [number, number, number], 32);
    const pbx = cardX + cardW - 34;
    doc.setFillColor(35, 30, 70); doc.roundedRect(pbx, y + 7, 26, 4, 2, 2, "F");
    if (unitProgress > 0) { doc.setFillColor(...colorHex); doc.roundedRect(pbx, y + 7, 26 * (unitProgress / 100), 4, 2, 2, "F"); }
    doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(...colorHex);
    doc.text(`${unitProgress}%`, pbx + 13, y + 18, { align: "center" });
    let ty = y + 10 + tLines.length * 6 + 10;
    if (unit.descripcion) {
      doc.setFontSize(7.5); doc.setFont("helvetica", "italic"); doc.setTextColor(130, 120, 170);
      const dls = doc.splitTextToSize(unit.descripcion, cardW - 36);
      doc.text(dls, cardX + 12, ty); ty += dls.length * 4.5 + 3;
    }
    if (unit.prerequisitos?.length > 0) {
      doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(90, 80, 140);
      doc.text(`Prerequisitos: Unidad(es) ${unit.prerequisitos.join(", ")}`, cardX + 12, ty); ty += 7;
    }
    doc.setFontSize(7.5);
    unit.temas.forEach((tema, ti) => {
      const isDone = unit.temaStatus?.[ti] === "done";
      doc.setFont("helvetica", "normal");
      doc.setTextColor(isDone ? 85 : 180, isDone ? 239 : 170, isDone ? 196 : 210);
      const temaLines = doc.splitTextToSize((isDone ? "✓ " : "○ ") + tema, cardW - 36);
      doc.text(temaLines, cardX + 12, ty); ty += temaLines.length * 5.2;
    });
    y += estH + 5;
    if (i < units.length - 1 && y + 8 <= 278) { doc.setFillColor(...colorHex); doc.circle(cardX + cardW / 2, y - 1, 1.5, "F"); }
  });

  const pageCount = doc.getNumberOfPages();
  for (let p = 2; p <= pageCount; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setTextColor(70, 60, 110);
    doc.text(`${p - 1} / ${pageCount - 1}`, W - margin, 292, { align: "right" });
    doc.text(`StudyMap AI · ${syllabus.materia}`, margin + 8, 292);
  }
  doc.save(`roadmap-${syllabus.materia.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

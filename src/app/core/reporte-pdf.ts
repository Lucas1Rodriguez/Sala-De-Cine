import type { DiaReporte } from './reportes.service';
import { fmtFecha, notaDia, totalesReporte } from './reportes-datos';
import { plata } from './utils';

export async function exportarPdf(dias: DiaReporte[], desde: string, hasta: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const t = totalesReporte(dias);
  let y = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('Reporte de facturación', 15, y);
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(`Período: ${fmtFecha(desde)} al ${fmtFecha(hasta)}  ·  Generado: ${new Date().toLocaleString('es-AR')}`, 15, y);
  y += 10;

  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.text(`Facturado: ${plata(t.facturado)}     Entradas: ${t.entradas}     Compras: ${t.compras}`, 15, y);
  y += 6;

  doc.setFontSize(10);
  doc.setTextColor(110);
  doc.text(
    `Cobrado: ${plata(t.cobrado)}     Con crédito: ${plata(t.credito)}     Canjes por puntos: ${t.canjes} (${t.puntos} pts)`,
    15, y
  );
  doc.setTextColor(0);
  y += 10;

  const cabecera = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Día', 15, y);
    doc.text('Compras', 110, y, { align: 'right' });
    doc.text('Entradas', 145, y, { align: 'right' });
    doc.text('Facturado', 195, y, { align: 'right' });
    y += 2;
    doc.line(15, y, 195, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
  };
  cabecera();

  for (const d of dias.filter((x) => x.cant_ordenes > 0)) {
    const nota = notaDia(d);
    const lineas = nota ? doc.splitTextToSize(nota, 180) : [];
    const alto = 6 + (lineas.length ? lineas.length * 4 + 1 : 0);

    if (y + alto > 280) {
      doc.addPage();
      y = 20;
      cabecera();
    }

    doc.text(fmtFecha(d.fecha), 15, y);
    doc.text(String(d.cant_ordenes), 110, y, { align: 'right' });
    doc.text(String(d.cant_entradas), 145, y, { align: 'right' });
    doc.text(plata(d.total_facturado), 195, y, { align: 'right' });
    y += 6;

    if (lineas.length) {
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(lineas, 15, y - 1);
      y += lineas.length * 4;
      doc.setFontSize(10);
      doc.setTextColor(0);
    }
  }

  if (y > 270) {
    doc.addPage();
    y = 20;
  }
  y += 2;
  doc.line(15, y, 195, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Total', 15, y);
  doc.text(String(t.compras), 110, y, { align: 'right' });
  doc.text(String(t.entradas), 145, y, { align: 'right' });
  doc.text(plata(t.facturado), 195, y, { align: 'right' });

  doc.save(`facturacion_${desde}_${hasta}.pdf`);
}
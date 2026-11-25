import { OrdenDetalle } from './models';
import { qrDataUrl } from './qr';
import { plata, colorGenero, hexARgb, agruparItems, textoItem } from './utils';

export async function descargarEntradaPdf(o: OrdenDetalle) {
  const { jsPDF } = await import('jspdf');
  const qr = await qrDataUrl(o.codigo, 400);

  const f = o.funciones;
  const genero = f.peliculas.pelicula_generos[0]?.generos.nombre ?? '';
  const [cr, cg, cb] = hexARgb(colorGenero(genero));

  const butacas = o.entradas
    .filter((e) => e.estado === 'pagada')
    .map((e) => `${e.butacas.fila}${e.butacas.numero}${e.butacas.tipo === 'vip' ? ' (VIP)' : ''}`)
    .join(', ');
  
    const candy = agruparItems(o.orden_items).map((i) => textoItem(i, 'x')).join(', ');  const fecha = new Date(f.inicio).toLocaleString('es-AR', {
    weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
  const idioma = f.idioma === 'castellano' ? 'Castellano' : 'Subtitulada';
  const lineas = [
    fecha,
    `${f.salas.nombre} · ${f.formato} · ${idioma}`,
    `Butacas: ${butacas}`,
    ...(candy ? [`Candy: ${candy}`] : []),
    `Total pagado: ${plata(o.total)}`,
  ];

  const dibujar = (doc: any, h: number): number => {
    doc.setFillColor(7, 9, 15);
    doc.rect(0, 0, 200, h, 'F');
    doc.setFillColor(cr, cg, cb);
    doc.rect(0, 0, 4, h, 'F');

    doc.setTextColor(cr, cg, cb);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(genero ? `ÓRBITA CINE · ${genero.toUpperCase()}` : 'ÓRBITA CINE', 14, 14);

    doc.setTextColor(232, 236, 248);
    doc.setFontSize(20);
    const titulo: string[] = doc.splitTextToSize(f.peliculas.nombre, 112).slice(0, 3);
    doc.text(titulo, 14, 26);
    let y = 26 + titulo.length * 8 + 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    for (const l of lineas) {
      const partes: string[] = doc.splitTextToSize(l, 112);
      doc.text(partes, 14, y);
      y += partes.length * 5.5;
    }

    if (f.peliculas.clasificacion_edad > 0) {
      y += 2;
      doc.setTextColor(255, 93, 115);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      const aviso: string[] = doc.splitTextToSize(
        `Película +${f.peliculas.clasificacion_edad}: los menores deben asistir acompañados de un adulto.`, 112);
      doc.text(aviso, 14, y);
      y += aviso.length * 4.5;
    }

    const dy = Math.max(0, (h - 90) / 2);
    doc.setDrawColor(35, 44, 71);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(134, 8, 134, h - 8);
    doc.setLineDashPattern([], 0);

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(142, 12 + dy, 46, 46, 3, 3, 'F');
    doc.addImage(qr, 'PNG', 144, 14 + dy, 42, 42);

    doc.setTextColor(138, 148, 179);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('CÓDIGO MANUAL', 165, 65 + dy, { align: 'center' });
    doc.setTextColor(cr, cg, cb);
    doc.setFont('courier', 'bold');
    doc.setFontSize(17);
    doc.text(o.codigo, 165, 74 + dy, { align: 'center' });
    doc.setTextColor(138, 148, 179);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text('Válido para un solo uso', 165, 82 + dy, { align: 'center' });

    return y;
  };

  const medida = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [200, 150] });
  const alto = Math.max(90, Math.ceil(dibujar(medida, 150) + 8));
  const doc = new jsPDF({ orientation: alto > 200 ? 'portrait' : 'landscape', unit: 'mm', format: [200, alto] });
  dibujar(doc, alto);
  doc.save(`entrada-${o.codigo}.pdf`);
}
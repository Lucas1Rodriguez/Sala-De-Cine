import type { DiaReporte } from './reportes.service';
import { totalesReporte } from './reportes-datos';

export async function exportarExcel(dias: DiaReporte[], desde: string, hasta: string) {
  const mod: any = await import('exceljs');
  const ExcelJS = mod.default ?? mod;

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet('Facturación');
  hoja.columns = [
    { header: 'Fecha', key: 'fecha', width: 14, style: { numFmt: 'dd/mm/yyyy' } },
    { header: 'Compras', key: 'compras', width: 12 },
    { header: 'Entradas', key: 'entradas', width: 12 },
    { header: 'Facturado', key: 'total', width: 16, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Cobrado (tarjeta)', key: 'cobrado', width: 18, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Pagado con crédito', key: 'credito', width: 20, style: { numFmt: '"$"#,##0.00' } },
    { header: 'Compras con canje por puntos', key: 'canjes', width: 30 },
    { header: 'Puntos canjeados', key: 'puntos', width: 18 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const d of dias) {
    const [a, m, dia] = d.fecha.split('-').map(Number);
    hoja.addRow({
      fecha: new Date(Date.UTC(a, m - 1, dia)),
      compras: d.cant_ordenes,
      entradas: d.cant_entradas,
      total: d.total_facturado,
      cobrado: d.cobrado,
      credito: d.credito_usado,
      canjes: d.cant_canje,
      puntos: d.puntos_canjeados,
    });
  }

  const t = totalesReporte(dias);
  hoja.addRow({
    fecha: 'Total', compras: t.compras, entradas: t.entradas, total: t.facturado,
    cobrado: t.cobrado, credito: t.credito, canjes: t.canjes, puntos: t.puntos,
  }).font = { bold: true };

  const buffer = await libro.xlsx.writeBuffer();
  descargar(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `facturacion_${desde}_${hasta}.xlsx`
  );
}

function descargar(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(url);
}
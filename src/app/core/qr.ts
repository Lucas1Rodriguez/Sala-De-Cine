export async function qrDataUrl(texto: string, ancho = 400): Promise<string> {
  const mod: any = await import('qrcode');
  const toDataURL = mod.toDataURL ?? mod.default.toDataURL;
  return toDataURL(texto, { margin: 1, width: ancho });
}
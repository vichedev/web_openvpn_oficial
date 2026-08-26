// ============================================================================
//  zip.js — creacion de archivos .zip sin dependencias.
//
//  Se usa para entregar de una vez los .ovpn de todos los usuarios. Los perfiles
//  son texto pequeno, asi que se guardan SIN comprimir (metodo "store", 0): el
//  formato queda valido para cualquier descompresor y el codigo cabe en una
//  pagina, en lugar de arrastrar una libreria entera al bundle.
// ============================================================================

/** Tabla precalculada de CRC-32 (polinomio 0xEDB88320). */
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

/** CRC-32 de una secuencia de bytes, como exige el formato ZIP. */
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Fecha y hora en el formato MS-DOS que usa el ZIP. */
function dosDateTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/**
 * Crea un ZIP con los archivos indicados.
 *
 * @param {Array<{name:string, content:string}>} files
 * @param {Date} [now] Fecha de los archivos (parametrizable para los tests).
 * @returns {Blob} listo para descargar.
 */
export function createZip(files, now = new Date()) {
  const encoder = new TextEncoder();
  const { time, date } = dosDateTime(now);

  const entries = files.map((file) => ({
    nameBytes: encoder.encode(file.name),
    data: encoder.encode(file.content),
  }));
  for (const entry of entries) entry.crc = crc32(entry.data);

  const LOCAL_HEADER = 30;
  const CENTRAL_HEADER = 46;
  const EOCD = 22;

  const localSize = entries.reduce(
    (acc, e) => acc + LOCAL_HEADER + e.nameBytes.length + e.data.length,
    0
  );
  const centralSize = entries.reduce((acc, e) => acc + CENTRAL_HEADER + e.nameBytes.length, 0);

  const buffer = new ArrayBuffer(localSize + centralSize + EOCD);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let offset = 0;

  // --- Cabeceras locales + datos ---
  for (const entry of entries) {
    entry.offset = offset;
    view.setUint32(offset, 0x04034b50, true); // firma
    view.setUint16(offset + 4, 20, true); // version necesaria
    view.setUint16(offset + 6, 0x0800, true); // flag: nombres en UTF-8
    view.setUint16(offset + 8, 0, true); // metodo: sin comprimir
    view.setUint16(offset + 10, time, true);
    view.setUint16(offset + 12, date, true);
    view.setUint32(offset + 14, entry.crc, true);
    view.setUint32(offset + 18, entry.data.length, true); // tamano comprimido
    view.setUint32(offset + 22, entry.data.length, true); // tamano original
    view.setUint16(offset + 26, entry.nameBytes.length, true);
    view.setUint16(offset + 28, 0, true); // sin campo extra
    offset += LOCAL_HEADER;

    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
    bytes.set(entry.data, offset);
    offset += entry.data.length;
  }

  // --- Directorio central ---
  const centralStart = offset;
  for (const entry of entries) {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true); // creado por
    view.setUint16(offset + 6, 20, true); // version necesaria
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, time, true);
    view.setUint16(offset + 14, date, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.data.length, true);
    view.setUint32(offset + 24, entry.data.length, true);
    view.setUint16(offset + 28, entry.nameBytes.length, true);
    view.setUint16(offset + 30, 0, true); // extra
    view.setUint16(offset + 32, 0, true); // comentario
    view.setUint16(offset + 34, 0, true); // disco
    view.setUint16(offset + 36, 0, true); // atributos internos
    view.setUint32(offset + 38, 0, true); // atributos externos
    view.setUint32(offset + 42, entry.offset, true);
    offset += CENTRAL_HEADER;
    bytes.set(entry.nameBytes, offset);
    offset += entry.nameBytes.length;
  }

  // --- Fin del directorio central ---
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 4, 0, true);
  view.setUint16(offset + 6, 0, true);
  view.setUint16(offset + 8, entries.length, true);
  view.setUint16(offset + 10, entries.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true);

  return new Blob([buffer], { type: "application/zip" });
}

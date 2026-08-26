// ============================================================================
//  rosSafe.js — Saneado y validacion de todo lo que acaba dentro de un script
//  de RouterOS (.rsc) o de un archivo .ovpn.
//
//  MOTIVO DE SEGURIDAD (critico): el script generado se ejecuta en el MikroTik
//  con permisos de administrador. Si un valor del formulario (por ejemplo una
//  contrasena que contenga una comilla) se inserta sin escapar, cierra la
//  cadena y el resto se interpreta como COMANDOS. Ejemplo real:
//
//      password="abc" ; /system reset-configuration no-defaults=yes; :put "x"
//
//  Todo valor que viaje al .rsc pasa por escapeRos(); todo nombre pasa por
//  sanitizeName(); y los formularios validan antes de generar.
// ============================================================================

/** Caracteres con significado especial dentro de una cadena "..." de RouterOS. */
// Se escriben con String.raw para que el nivel de escapado sea inequivoco:
// String.raw`\$` es EXACTAMENTE los dos caracteres  \  y  $.
const ROS_ESCAPES = {
  "\\": String.raw`\\`,
  '"': String.raw`\"`,
  $: String.raw`\$`,
  "?": String.raw`\?`,
};

/**
 * Escapa un valor para insertarlo dentro de comillas dobles en RouterOS.
 * Ademas elimina saltos de linea y caracteres de control, que romperian el
 * script (y el .ovpn) aunque fuesen escapados.
 */
export function escapeRos(value) {
  return String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\"$?]/g, (ch) => ROS_ESCAPES[ch]);
}

/**
 * Normaliza un identificador (nombre de VPN, de usuario, de certificado).
 * RouterOS acepta nombres sin espacios; nos limitamos a un juego seguro para
 * que ademas sirva como nombre de archivo exportado.
 *
 * @param {string} value    Texto introducido por el usuario.
 * @param {string} fallback Valor si al limpiar no queda nada.
 * @param {number} maxLen   Longitud maxima (RouterOS admite mas, pero nombres
 *                          cortos evitan lios en Files).
 */
export function sanitizeName(value, fallback = "", maxLen = 24) {
  const clean = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // tildes -> letra base
    .replace(/[^A-Za-z0-9._-]/g, "") // solo caracteres seguros
    .replace(/^[._-]+/, "") // no empezar por separador
    .slice(0, maxLen);
  return clean || fallback;
}

/** true si el nombre ya esta en forma segura (no hace falta corregirlo). */
export function isCleanName(value) {
  return Boolean(value) && sanitizeName(value) === value;
}

// ---------------------------------------------------------------------------
//  Direcciones IP y redes
// ---------------------------------------------------------------------------

const IPV4_RE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
const HOSTNAME_RE = /^(?=.{1,253}$)([A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

/** Valida una IPv4 real (rechaza 300.1.1.1, que un regex de digitos deja pasar). */
export function isValidIp(value) {
  const m = String(value ?? "").trim().match(IPV4_RE);
  if (!m) return false;
  return m.slice(1).every((o) => o.length <= 3 && Number(o) <= 255);
}

/** Acepta una IPv4 valida o un nombre de dominio (DDNS, etc.). */
export function isValidHost(value) {
  const v = String(value ?? "").trim();
  return isValidIp(v) || HOSTNAME_RE.test(v);
}

export function ipToInt(ip) {
  return ip.split(".").reduce((acc, o) => acc * 256 + Number(o), 0);
}

export function intToIp(n) {
  const x = ((n % 4294967296) + 4294967296) % 4294967296;
  return [(x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255].join(".");
}

/**
 * Direccion de red y broadcast de un bloque, como enteros SIN SIGNO.
 *
 * Los operadores de bits de JavaScript trabajan con enteros de 32 bits CON
 * signo: `ipToInt("192.168.1.0") & ~255` sale NEGATIVO, porque cualquier IP por
 * encima de 127.x.x.x supera 2^31. Comparar contra ese negativo daba resultados
 * absurdos ("el gateway 172.20.5.1 esta fuera de 172.20.5.0/24"). El `>>> 0`
 * final es lo que devuelve el valor al rango sin signo.
 *
 * @returns {{netInt:number, broadcast:number, size:number}}
 */
export function networkBounds(ip, prefix) {
  const size = 2 ** (32 - prefix);
  const netInt = (ipToInt(ip) & ~(size - 1)) >>> 0;
  return { netInt, broadcast: netInt + size - 1, size };
}

/**
 * Analiza una red en notacion CIDR.
 * @returns {{ok:boolean, error?:string, ip?:string, prefix?:number}}
 */
export function parseCidr(cidr) {
  const raw = String(cidr ?? "").trim();
  const parts = raw.split("/");
  if (parts.length !== 2) {
    return { ok: false, error: "Formato esperado: red/mascara, por ejemplo 10.10.10.0/24." };
  }
  const [ip, prefixStr] = parts;
  if (!isValidIp(ip)) {
    return { ok: false, error: `"${ip}" no es una direccion IPv4 valida (cada octeto va de 0 a 255).` };
  }
  if (!/^\d{1,2}$/.test(prefixStr)) {
    return { ok: false, error: "La mascara debe ser un numero, por ejemplo /24." };
  }
  const prefix = Number(prefixStr);
  if (prefix < 8 || prefix > 30) {
    return { ok: false, error: "Usa una mascara entre /8 y /30 (lo habitual es /24)." };
  }
  return { ok: true, ip, prefix };
}

// ---------------------------------------------------------------------------
//  Sugerencias aleatorias (red y puerto)
// ---------------------------------------------------------------------------

/** Entero aleatorio en [0, max) con CSPRNG y sin sesgo de modulo. */
function randomInt(max) {
  const limit = Math.floor(4294967296 / max) * max;
  const buf = new Uint32Array(1);
  let v;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

/**
 * Redes /24 que se evitan al sortear: son las que traen de fabrica los routers
 * domesticos y las que mas a menudo chocan con la LAN de quien se conecta.
 * Si la red de la VPN coincide con la de casa del usuario, su equipo no sabe
 * por donde enviar el trafico y la conexion "no funciona" sin motivo aparente.
 */
const REDES_CONFLICTIVAS = new Set([
  "192.168.0.0/24",
  "192.168.1.0/24",
  "192.168.2.0/24",
  "192.168.8.0/24",
  "192.168.10.0/24",
  "192.168.88.0/24", // por defecto en MikroTik
  "192.168.100.0/24",
  "10.0.0.0/24",
  "10.0.1.0/24",
  "10.1.1.0/24",
  "172.16.0.0/24",
]);

/**
 * Sortea una red privada /24 (RFC1918) poco propensa a chocar con la LAN del
 * cliente. Un /24 da 253 direcciones utilizables, de sobra para una VPN.
 *
 * @returns {string} Ej. "10.213.47.0/24"
 */
export function randomPrivateNetwork() {
  for (let intento = 0; intento < 50; intento++) {
    let cidr;
    switch (randomInt(3)) {
      case 0: // 10.0.0.0/8 -> 10.x.y.0/24
        cidr = `10.${randomInt(256)}.${randomInt(256)}.0/24`;
        break;
      case 1: // 172.16.0.0/12 -> 172.(16-31).x.0/24
        cidr = `172.${16 + randomInt(16)}.${randomInt(256)}.0/24`;
        break;
      default: // 192.168.0.0/16 -> 192.168.x.0/24
        cidr = `192.168.${randomInt(256)}.0/24`;
        break;
    }
    if (!REDES_CONFLICTIVAS.has(cidr)) return cidr;
  }
  return "10.10.10.0/24";
}

/** Puertos que ya usan otros servicios del router o son objetivo habitual. */
const PUERTOS_RESERVADOS = new Set([
  1194, // el estandar de OpenVPN: precisamente el que queremos evitar
  8291, // Winbox
  8728, 8729, // API de RouterOS
  20, 21, 22, 23, 25, 53, 80, 443, 123, 161, 179, 445, 500, 1701, 1723, 3389,
  4500, 5060, 5900, 8080, 8443, 10000,
]);

/**
 * Sortea un puerto para el servidor OpenVPN.
 *
 * Se elige entre 10000 y 49151 a proposito: por debajo estan los puertos
 * conocidos, y por encima (49152+) esta el rango efimero que el propio router
 * usa para sus conexiones salientes, donde podria haber colisiones.
 *
 * @returns {string} Ej. "23418"
 */
export function randomVpnPort() {
  let port;
  do {
    port = 10000 + randomInt(39152);
  } while (PUERTOS_RESERVADOS.has(port));
  return String(port);
}

/** true si la IP pertenece a un rango privado (RFC1918). Solo para avisar. */
export function isPrivateIp(ip) {
  if (!isValidIp(ip)) return false;
  const n = ipToInt(ip);
  return (
    (n >= ipToInt("10.0.0.0") && n <= ipToInt("10.255.255.255")) ||
    (n >= ipToInt("172.16.0.0") && n <= ipToInt("172.31.255.255")) ||
    (n >= ipToInt("192.168.0.0") && n <= ipToInt("192.168.255.255"))
  );
}

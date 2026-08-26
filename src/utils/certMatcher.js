// ============================================================================
//  certMatcher — reparte automaticamente los archivos que el usuario suelta.
//
//  Con varios usuarios en el mismo servidor, subir los archivos de uno en uno
//  es lo que hace lento el proceso. Aqui se aceptan TODOS de golpe (el ca.crt y
//  el par .crt/.key de cada usuario) y se emparejan por su nombre.
//
//  El caso dificil es el prefijo comun: "vpntestvicente" y "vpntestvicente2"
//  comparten principio, asi que la coincidencia exacta manda y la aproximada
//  se queda con el nombre MAS LARGO que encaje.
// ============================================================================

import { certNameFor } from "./mikrotikGenerator.js";

const CERT_HEADER = "-----BEGIN CERTIFICATE-----";
const KEY_HEADER = /-----BEGIN (?:ENCRYPTED |RSA |EC )?PRIVATE KEY-----/;

/** Tipo real del archivo segun su contenido, no segun su extension. */
export function detectFileKind(text) {
  const content = String(text || "");
  if (KEY_HEADER.test(content)) return "key";
  if (content.includes(CERT_HEADER)) return "cert";
  return "unknown";
}

/** Quita la extension conocida del nombre de archivo. */
function baseName(name) {
  return String(name || "").replace(/\.(crt|cer|pem|key)$/i, "");
}

/**
 * Busca a que usuario pertenece un archivo.
 * @returns {{user:Object|null, exact:boolean, ambiguous:boolean}}
 */
export function findUserForFile(fileName, names, users) {
  const base = baseName(fileName).toLowerCase();

  // 1. Coincidencia exacta con el nombre del certificado exportado, o con el
  //    propio nombre del usuario (por si el archivo se renombro).
  for (const u of users) {
    const certName = certNameFor(names, u.name).toLowerCase();
    if (base === certName || base === u.name.toLowerCase()) {
      return { user: u, exact: true, ambiguous: false };
    }
  }

  // 2. Aproximada: el nombre del usuario aparece dentro del archivo. Con
  //    prefijos comunes gana el nombre mas largo ("...vicente2" antes que
  //    "...vicente"); si hay empate real, se marca como ambiguo.
  const candidates = users
    .filter((u) => base.includes(u.name.toLowerCase()))
    .sort((a, b) => b.name.length - a.name.length);

  if (candidates.length === 0) return { user: null, exact: false, ambiguous: false };
  const ambiguous =
    candidates.length > 1 && candidates[0].name.length === candidates[1].name.length;
  return { user: candidates[0], exact: false, ambiguous };
}

/** true si el archivo parece el certificado de la CA. */
function looksLikeCa(fileName, names) {
  const base = baseName(fileName).toLowerCase();
  return base === names.ca.toLowerCase() || /^ca[-_.]?/.test(base);
}

/**
 * Clasifica una tanda de archivos: CA, par .crt/.key de cada usuario y sobras.
 *
 * @param {Array<{name:string,text:string}>} incoming Archivos leidos.
 * @param {Object} names   Nombres del servidor (resolveNames).
 * @param {Array}  users   Usuarios de la sesion.
 * @param {Object} previous Reparto anterior, para ir acumulando entre tandas.
 * @returns {{ca:Object|null, byUser:Object, warnings:string[]}}
 */
export function classifyFiles(incoming, names, users, previous = { ca: null, byUser: {} }) {
  const result = {
    ca: previous.ca ?? null,
    byUser: { ...previous.byUser },
    warnings: [],
  };

  // Primero los certificados que no son de nadie: candidatos a CA.
  const leftoverCerts = [];

  for (const file of incoming) {
    const kind = detectFileKind(file.text);
    if (kind === "unknown") {
      result.warnings.push(`"${file.name}" no es un certificado ni una llave: se ignora.`);
      continue;
    }

    // El CA se reconoce por el nombre y solo puede ser un certificado.
    if (kind === "cert" && looksLikeCa(file.name, names)) {
      result.ca = file;
      continue;
    }

    const { user, exact, ambiguous } = findUserForFile(file.name, names, users);
    if (!user) {
      if (kind === "cert") leftoverCerts.push(file);
      else result.warnings.push(`"${file.name}": no se reconoce de que usuario es esta llave.`);
      continue;
    }
    if (ambiguous) {
      result.warnings.push(
        `"${file.name}" podria ser de varios usuarios: asignalo a mano si no es correcto.`
      );
    }
    if (!exact) {
      result.warnings.push(`"${file.name}" se asigno a "${user.name}" por parecido de nombre.`);
    }

    const slot = result.byUser[user.id] ?? { cert: null, key: null };
    slot[kind] = file;
    result.byUser[user.id] = slot;
  }

  // Un certificado suelto que no es de ningun usuario casi siempre es la CA.
  if (!result.ca && leftoverCerts.length === 1) {
    result.ca = leftoverCerts[0];
    result.warnings.push(`"${leftoverCerts[0].name}" se tomo como certificado de la CA.`);
  } else {
    for (const f of leftoverCerts) {
      result.warnings.push(`"${f.name}": no coincide con ningun usuario de la lista.`);
    }
  }

  return result;
}

/**
 * Estado de cada usuario de cara a generar su .ovpn.
 * @returns {Array<{user:Object, cert:Object|null, key:Object|null, ready:boolean, missing:string[]}>}
 */
export function buildUserStatus(users, assignment, hasCa) {
  return users.map((user) => {
    const slot = assignment.byUser[user.id] ?? { cert: null, key: null };
    const missing = [];
    if (!hasCa) missing.push("certificado CA");
    if (!slot.cert) missing.push("su .crt");
    if (!slot.key) missing.push("su .key");
    if (!user.password) missing.push("su contrasena");
    return { user, cert: slot.cert, key: slot.key, ready: missing.length === 0, missing };
  });
}

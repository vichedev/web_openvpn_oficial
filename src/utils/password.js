// ============================================================================
//  Contrasenas: generacion segura y evaluacion de robustez.
//
//  La contrasena de un usuario VPN hace DOS cosas: autentica el /ppp secret y
//  cifra la llave privada exportada (.key). Una contrasena debil compromete las
//  dos. Por eso generamos con CSPRNG (crypto.getRandomValues) y no con Math.random.
// ============================================================================

// Alfabeto sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar por
// telefono sin errores, y sin comillas ni $ para no depender del escapado.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789.-_";

/** Caracteres de control: rompen tanto el script .rsc como el archivo .ovpn. */
const CONTROL_CHARS = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(31) + String.fromCharCode(127) + "]");

/** Genera una contrasena aleatoria criptograficamente segura. */
export function generatePassword(length = 16) {
  const size = Math.max(12, Math.min(64, length));
  const out = new Uint32Array(size);
  crypto.getRandomValues(out);
  // Rechazo del sesgo de modulo: descartamos los valores del ultimo bloque
  // parcial, que apareceria con mas probabilidad que el resto.
  const limit = Math.floor(4294967296 / ALPHABET.length) * ALPHABET.length;
  let result = "";
  for (let i = 0; i < size; i++) {
    let v = out[i];
    while (v >= limit) {
      const extra = new Uint32Array(1);
      crypto.getRandomValues(extra);
      v = extra[0];
    }
    result += ALPHABET[v % ALPHABET.length];
  }
  return result;
}

/**
 * Evalua una contrasena de usuario VPN.
 * @returns {{score:0|1|2|3|4, label:string, error:(string|null), warnings:string[]}}
 *          error != null => no se puede generar el script con ella.
 */
export function checkPassword(password) {
  const pw = String(password ?? "");
  const warnings = [];

  // MikroTik exige un minimo de 8 caracteres en export-passphrase.
  if (pw.length < 8) {
    return {
      score: 0,
      label: "Muy debil",
      error:
        "La contrasena debe tener al menos 8 caracteres (lo exige MikroTik al exportar la llave).",
      warnings,
    };
  }
  if (CONTROL_CHARS.test(pw)) {
    return {
      score: 0,
      label: "No valida",
      error: "La contrasena no puede contener saltos de linea ni caracteres de control.",
      warnings,
    };
  }
  if (/\s/.test(pw)) {
    return {
      score: 0,
      label: "No valida",
      error: "La contrasena no puede contener espacios: rompe el archivo .ovpn al conectar.",
      warnings,
    };
  }

  let score = 0;
  if (pw.length >= 12) score++;
  if (pw.length >= 16) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  score = Math.min(4, score);

  if (pw.length < 12) warnings.push("Con menos de 12 caracteres es facil de romper por fuerza bruta.");
  if (/^[a-zA-Z]+$/.test(pw)) warnings.push("Solo letras: anade numeros o simbolos.");
  if (/(1234|abcd|qwerty|password|admin|mikrotik|vpn)/i.test(pw))
    warnings.push("Contiene una secuencia muy comun; evitala.");
  if (/["$\\?]/.test(pw))
    warnings.push('Los caracteres " $ \\ ? se escapan solos en el script, pero complican dictarla.');

  const labels = ["Muy debil", "Debil", "Aceptable", "Fuerte", "Muy fuerte"];
  return { score, label: labels[score], error: null, warnings };
}

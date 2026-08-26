// ============================================================================
//  handoff.js — documentos que acompanan a los perfiles .ovpn.
//
//  Cuando se entrega una VPN a varias personas no basta con los .ovpn: hace
//  falta saber que contrasena lleva cada uno y como se importa. Aqui se arman
//  los dos documentos que van dentro del ZIP:
//
//    · credenciales.csv -> tabla usuario / contrasena / servidor
//    · LEEME.txt        -> instrucciones de instalacion y avisos
//
//  OJO: el CSV lleva las contrasenas en claro. Es util para el administrador,
//  pero el ZIP completo NO debe reenviarse a los usuarios finales: a cada
//  persona se le manda unicamente SU archivo .ovpn.
// ============================================================================

/** Escapa un campo para CSV (comillas dobles y separador). */
function csvCell(value) {
  const text = String(value ?? "");
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Tabla de credenciales en CSV.
 *
 * Separador ';' y BOM UTF-8 porque el destino habitual es Excel en espanol:
 * con ',' parte mal las columnas y sin BOM rompe los acentos.
 */
export function buildCredentialsCsv({ session, users, isV6 }) {
  const proto = isV6 ? "tcp" : session.protocol;
  const filas = [
    ["Usuario", "Contrasena", "Servidor", "Puerto", "Protocolo", "Archivo .ovpn"],
    ...users.map((u) => [
      u.name,
      u.password || "(no guardada)",
      session.publicIp,
      session.port,
      proto,
      `${u.name}.ovpn`,
    ]),
  ];
  // BOM explicito para que Excel reconozca el UTF-8 y no rompa los acentos.
  // Se escribe como escape y no como caracter literal: un BOM suelto en el
  // fuente es invisible y cualquier editor puede comerselo.
  const BOM = "\ufeff";
  const CRLF = "\r\n"; // Excel en Windows espera CRLF
  return BOM + filas.map((f) => f.map(csvCell).join(";")).join(CRLF) + CRLF;
}

/** Instrucciones que acompanan al paquete. */
export function buildReadme({ session, users, names, isV6, embedCredentials }) {
  const proto = (isV6 ? "tcp" : session.protocol).toUpperCase();
  const L = [];

  L.push("=========================================================");
  L.push("  VPN OpenVPN - archivos de conexion");
  L.push("  Generado por Web OpenVPN - MAAT");
  L.push("=========================================================");
  L.push("");
  L.push(`Servidor : ${session.publicIp}:${session.port}/${proto}`);
  L.push(`Usuarios : ${users.length}`);
  L.push(`Red VPN  : ${session.vpnNetwork}`);
  L.push("");

  L.push("---------------------------------------------------------");
  L.push(" QUE HAY EN ESTE PAQUETE");
  L.push("---------------------------------------------------------");
  L.push("  credenciales.csv .... usuario y contrasena de cada persona");
  L.push("  LEEME.txt ........... este archivo");
  for (const u of users) L.push(`  ${u.name}.ovpn ${".".repeat(Math.max(0, 14 - u.name.length))} perfil de ${u.name}`);
  L.push("");
  L.push("  A cada persona se le entrega UNICAMENTE su propio .ovpn.");
  L.push("  Este paquete completo es para el administrador.");
  L.push("");

  L.push("---------------------------------------------------------");
  L.push(" COMO SE CONECTA UNA PERSONA");
  L.push("---------------------------------------------------------");
  L.push("  1. Instalar OpenVPN Connect:");
  L.push("       Windows / macOS / Linux : https://openvpn.net/client/");
  L.push("       Android / iOS           : buscar 'OpenVPN Connect' en la tienda");
  L.push("  2. Abrir la aplicacion y elegir Import / Importar -> desde archivo.");
  L.push("  3. Seleccionar su archivo .ovpn.");
  L.push("  4. Conectar.");
  L.push("");

  L.push("---------------------------------------------------------");
  L.push(" QUE PIDE AL CONECTAR");
  L.push("---------------------------------------------------------");
  if (embedCredentials) {
    L.push("  Usuario y contrasena ya van dentro del archivo .ovpn.");
    L.push("");
    L.push("  Solo se pedira 'Private Key Password': es la contrasena de esa");
    L.push("  MISMA persona. MikroTik exporta la llave privada cifrada, y esa");
    L.push("  clave es la que la abre.");
  } else {
    L.push("  El archivo NO lleva credenciales dentro, asi que pedira:");
    L.push("");
    L.push("    Username ............. el nombre del usuario");
    L.push("    Password ............. su contrasena (autentica contra el router)");
    L.push("    Private Key Password . la MISMA contrasena (abre su llave privada)");
  }
  L.push("");
  L.push("  IMPORTANTE: cada usuario tiene SU PROPIA llave privada, cifrada con");
  L.push("  SU PROPIA contrasena. La clave de un usuario no sirve para otro.");
  L.push(`  Lo unico comun a todos es el certificado de la CA (${names.ca}.crt),`);
  L.push("  que ya va embebido dentro de cada .ovpn.");
  L.push("");

  L.push("---------------------------------------------------------");
  L.push(" SI ALGO NO FUNCIONA");
  L.push("---------------------------------------------------------");
  L.push("  No conecta (timeout)");
  L.push(`    -> Comprobar que el puerto ${session.port}/${proto} llega al router.`);
  L.push("  Falla la autenticacion");
  L.push("    -> Usuario o contrasena mal escritos. Ver credenciales.csv.");
  L.push("  Conecta pero no navega");
  L.push("    -> Es cosa del router: NAT o firewall. Avisar al administrador.");
  L.push("  Conecta pero no abre paginas");
  L.push("    -> Falta el DNS. Avisar al administrador.");
  L.push("");

  L.push("---------------------------------------------------------");
  L.push(" AVISO");
  L.push("---------------------------------------------------------");
  L.push("  credenciales.csv contiene contrasenas en texto plano.");
  L.push("  Guardalo en un sitio seguro y no lo reenvies junto con los perfiles.");
  L.push("");

  return L.join("\r\n");
}

/**
 * Arma la lista de archivos del paquete de entrega.
 *
 * @param {Object} opts
 * @param {Object} opts.generated  { [userId]: contenido del .ovpn }
 * @param {boolean} opts.includeCredentials  si se incluye credenciales.csv
 * @returns {Array<{name:string, content:string}>}
 */
export function buildHandoffFiles({
  generated,
  users,
  session,
  names,
  isV6,
  embedCredentials,
  includeCredentials = true,
}) {
  const incluidos = users.filter((u) => generated[u.id]);

  const files = incluidos.map((u) => ({ name: `${u.name}.ovpn`, content: generated[u.id] }));

  files.push({
    name: "LEEME.txt",
    content: buildReadme({ session, users: incluidos, names, isV6, embedCredentials }),
  });

  if (includeCredentials) {
    files.push({
      name: "credenciales.csv",
      content: buildCredentialsCsv({ session, users: incluidos, isV6 }),
    });
  }

  return files;
}

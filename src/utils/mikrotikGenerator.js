// ============================================================================
//  Generador de configuraciones OpenVPN para MikroTik RouterOS
//  Web OpenVPN - MAAT
//
//  MODELO: UN SERVIDOR OpenVPN EN EL MIKROTIK  +  N USUARIOS
//  --------------------------------------------------------------------------
//  El servidor OVPN del router (con su CA, su certificado, su pool, su perfil
//  PPP y su puerto) se crea UNA sola vez. A partir de ahi cada usuario es
//  unicamente:
//        certificado de cliente firmado por ESA MISMA CA  +  /ppp secret
//  Todos los usuarios se conectan al MISMO servidor y al MISMO puerto.
//  Anadir o revocar un usuario no toca la infraestructura ni afecta al resto.
//
//  Artefactos que produce:
//    1. generateServerScript()      -> .rsc: servidor + usuarios (idempotente)
//    2. generateAddUsersScript()    -> .rsc: SOLO anade usuarios al servidor existente
//    3. generateRevokeUsersScript() -> .rsc: revoca usuarios (corta su acceso)
//    4. generateOvpnFile()          -> .ovpn del cliente (Windows/Android/iOS/Linux/Mac)
//    5. generateClientRouterScript()-> .rsc: otro MikroTik como cliente (site-to-site)
//
//  Compatibilidad:
//    - RouterOS 6        -> OpenVPN solo TCP. Cifrados sin sufijo. Servidor unico.
//    - RouterOS 7.0-7.16 -> UDP/TCP, cifrados -cbc/-gcm. Servidor unico ("set").
//    - RouterOS 7.17+    -> servidor multi-instancia ("add name=..."). Varias VPN
//                           independientes pueden convivir en el mismo router.
//
//  SEGURIDAD: todos los valores del usuario pasan por escapeRos()/sanitizeName()
//  antes de entrar al script. Ver rosSafe.js.
// ============================================================================

import {
  escapeRos,
  sanitizeName,
  parseCidr,
  ipToInt,
  intToIp,
  isValidIp,
  networkBounds,
} from "./rosSafe.js";

export * from "./rosSafe.js";

/** Valores por defecto de una VPN nueva. El usuario puede cambiarlos todos. */
export const VPN_DEFAULTS = {
  vpnName: "vpn1",
  port: "1194",
  proto: "udp",
  auth: "SHA1",
  cipher: "AES-256-CBC",
  poolName: "ovpn-pool",
  poolRange: "10.10.10.2-10.10.10.254",
  localAddress: "10.10.10.1",
  network: "10.10.10.0/24",
  netmask: "24",
  dns: "8.8.8.8,1.1.1.1",
  profileName: "ovpn-profile",
  natMode: "auto",
  keySize: "2048",
  daysValid: 3650,
};

/** Tamano maximo del pool que autogeneramos (aunque la red sea enorme). */
const MAX_POOL_HOSTS = 254;

// ============================================================================
//  Red de la VPN
// ============================================================================

/**
 * Deduce red, mascara, gateway y pool a partir de un CIDR, con matematica real
 * (antes se asumia /24 y con /30 o /16 salian rangos imposibles).
 *
 * @param {string} cidr  Ej. "10.8.0.0/24", "192.168.9.0/30".
 * @returns {{network:string, netmask:string, localAddress:string, poolRange:string,
 *            valid:boolean, error:(string|null), hosts:number}}
 */
export function deriveVpnNetwork(cidr) {
  const fallback = {
    network: VPN_DEFAULTS.network,
    netmask: VPN_DEFAULTS.netmask,
    localAddress: VPN_DEFAULTS.localAddress,
    poolRange: VPN_DEFAULTS.poolRange,
    valid: false,
    error: null,
    hosts: 254,
  };

  const parsed = parseCidr(cidr);
  if (!parsed.ok) return { ...fallback, error: parsed.error };

  const { ip, prefix } = parsed;
  // Direccion de red REAL (no la tecleada) y su broadcast, sin signo.
  const { netInt, broadcast } = networkBounds(ip, prefix);

  const gateway = netInt + 1; // el MikroTik dentro de la VPN
  // El pool arranca en la PRIMERA direccion utilizable por un cliente, que es
  // la siguiente al gateway: asi se aprovecha el rango entero en vez de dejar
  // un hueco arbitrario al principio.
  const poolStart = gateway + 1;
  const lastUsable = broadcast - 1;
  const poolEnd = Math.min(lastUsable, poolStart + MAX_POOL_HOSTS - 1);

  if (poolStart > poolEnd) {
    return {
      ...fallback,
      error:
        "La red es demasiado pequena para repartir IPs. Usa /30 o mayor (recomendado /24).",
    };
  }

  return {
    network: `${intToIp(netInt)}/${prefix}`,
    netmask: String(prefix),
    localAddress: intToIp(gateway),
    poolRange: `${intToIp(poolStart)}-${intToIp(poolEnd)}`,
    valid: true,
    error: null,
    hosts: poolEnd - poolStart + 1,
  };
}

/**
 * Comprueba que un rango "inicio-fin" es coherente y cabe dentro de la red.
 * @returns {string|null} mensaje de error, o null si es valido.
 */
export function validatePoolRange(range, cidr) {
  const value = String(range ?? "").trim();
  const m = value.match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (!m) return "Formato esperado: IP_inicio-IP_fin (ej. 10.10.10.10-10.10.10.254).";
  const [, startIp, endIp] = m;
  if (!isValidIp(startIp) || !isValidIp(endIp)) return "El rango contiene una IP no valida.";

  const start = ipToInt(startIp);
  const end = ipToInt(endIp);
  if (start > end) return "La IP inicial del pool es mayor que la final.";

  const parsed = parseCidr(cidr);
  if (!parsed.ok) return null; // el error del CIDR se reporta aparte

  const { netInt, broadcast } = networkBounds(parsed.ip, parsed.prefix);
  if (start <= netInt || end >= broadcast) {
    return `El pool debe quedar dentro de ${intToIp(netInt)}/${parsed.prefix}, sin usar la direccion de red (${intToIp(netInt)}) ni la de broadcast (${intToIp(broadcast)}).`;
  }
  return null;
}

/** El gateway debe estar en la red y NO dentro del pool (si no, conflicto de IP). */
export function validateGateway(gateway, cidr, poolRange) {
  if (!isValidIp(gateway)) return "El gateway debe ser una IPv4 valida.";
  const parsed = parseCidr(cidr);
  if (!parsed.ok) return null;

  const { netInt, broadcast } = networkBounds(parsed.ip, parsed.prefix);
  const g = ipToInt(gateway);
  if (g <= netInt || g >= broadcast) {
    return `El gateway ${gateway} esta fuera de la red ${intToIp(netInt)}/${parsed.prefix}.`;
  }
  const m = String(poolRange ?? "").match(/^([\d.]+)\s*-\s*([\d.]+)$/);
  if (m && isValidIp(m[1]) && isValidIp(m[2])) {
    if (g >= ipToInt(m[1]) && g <= ipToInt(m[2])) {
      return `El gateway ${gateway} esta DENTRO del pool: se lo asignaria a un cliente y chocaria con el router.`;
    }
  }
  return null;
}

/** Lista de DNS validos a partir de un texto separado por comas/espacios. */
export function parseDnsList(dns) {
  return String(dns ?? "")
    .split(/[\s,;]+/)
    .map((d) => d.trim())
    .filter((d) => isValidIp(d));
}

// ============================================================================
//  Nombres de los objetos en el router
// ============================================================================

/**
 * Nombres de todos los objetos del servidor VPN.
 *
 * - Servidor unico (v6 / 7.0-7.16): el router solo admite UN servidor OVPN, asi
 *   que usamos nombres fijos. Cambiarlos romperia instalaciones ya desplegadas,
 *   por eso se mantienen tal cual.
 * - Multi-instancia (7.17+): todo cuelga del nombre de la VPN, de modo que
 *   pueden convivir varios servidores VPN independientes en el mismo router.
 *
 * En AMBOS casos un servidor atiende a TODOS sus usuarios: la CA y el perfil
 * son comunes, y cada usuario solo anade su certificado y su /ppp secret.
 */
export function resolveNames({ routerVersion = "v7", vpnName = VPN_DEFAULTS.vpnName } = {}) {
  const singleton = routerVersion === "v6" || routerVersion === "v7-legacy";
  const vpn = sanitizeName(vpnName, VPN_DEFAULTS.vpnName, 16);

  if (singleton) {
    return {
      singleton: true,
      vpn,
      ca: "ca-ovpn",
      srv: "srv-ovpn",
      pool: "ovpn-pool",
      prof: "ovpn-profile",
      server: null,
      fw: "OpenVPN-Web",
      fwd: "OpenVPN-Web-FWD",
      nat: "OpenVPN-Web-NAT",
      certPrefix: "",
    };
  }
  return {
    singleton: false,
    vpn,
    ca: `ca-${vpn}`,
    srv: `srv-${vpn}`,
    pool: `pool-${vpn}`,
    prof: `prof-${vpn}`,
    server: `ovpn-${vpn}`,
    fw: `OpenVPN-Web-${vpn}`,
    fwd: `OpenVPN-Web-FWD-${vpn}`,
    nat: `OpenVPN-Web-NAT-${vpn}`,
    certPrefix: `${vpn}-`,
  };
}

/** Nombre del certificado (y de los archivos exportados) de un usuario. */
export function certNameFor(names, userName) {
  return `${names.certPrefix}${sanitizeName(userName, "cliente1")}`;
}

/** Archivos que hay que descargar de Files para ese usuario. */
export function exportedFilesFor(names, userName) {
  const cert = certNameFor(names, userName);
  return { ca: `${names.ca}.crt`, cert: `${cert}.crt`, key: `${cert}.key` };
}

// ============================================================================
//  Bloques de script reutilizables
// ============================================================================

/** Espera activa a que el router termine de firmar un certificado. */
const waitSigned = (name) =>
  `:for i from=1 to=180 do={ :if ([/certificate get [find name=${name}] serial-number] = "") do={ :delay 1s } }`;

/**
 * Bloque que crea (o recrea) UN usuario del servidor VPN: certificado de
 * cliente firmado por la CA del servidor + /ppp secret + exportacion.
 * Es idempotente: si el usuario ya existe lo regenera, sin tocar a los demas.
 */
function buildUserBlock({ names, user, days, keySize }) {
  const login = sanitizeName(user.name, "cliente1");
  const cert = certNameFor(names, login);
  const pass = escapeRos(user.password || "");
  const L = [];

  L.push(`# ---- Usuario "${login}" ----`);
  L.push(`:put "Creando usuario ${login}..."`);
  // Limpieza SOLO de este usuario.
  L.push(`/ppp secret remove [find name="${login}"]`);
  L.push(`:do { /ppp active remove [find name="${login}"] } on-error={}`);
  L.push(`/certificate remove [find name="${cert}"]`);
  L.push(`/file remove [find name="${cert}.crt"]`);
  L.push(`/file remove [find name="${cert}.key"]`);
  // Certificado de cliente firmado por la CA del servidor.
  L.push(
    `/certificate add name="${cert}" common-name="${cert}" days-valid=${days} key-size=${keySize} key-usage=tls-client`
  );
  L.push(`/certificate sign "${cert}" ca="${names.ca}" name="${cert}"`);
  L.push(waitSigned(`"${cert}"`));
  L.push(`/certificate set [find name="${cert}"] trusted=yes`);
  // Credenciales PPP con las que se autentica el cliente.
  L.push(
    `/ppp secret add name="${login}" password="${pass}" service=ovpn profile="${names.prof}" comment="OpenVPN-Web"`
  );
  // Exportacion: la .key sale CIFRADA con la contrasena del usuario.
  L.push(`/certificate export-certificate "${cert}" export-passphrase="${pass}" file-name="${cert}"`);
  L.push(`:put "  -> ${cert}.crt y ${cert}.key listos en Files"`);
  L.push("");
  return L;
}

/**
 * Bloque que exporta el certificado PUBLICO de la CA a Files.
 *
 * Es imprescindible: ese archivo va en el bloque <ca> de TODOS los .ovpn. Sin
 * el, los usuarios tienen su .crt y su .key pero no hay forma de armar el
 * perfil de conexion. Se exporta sin passphrase porque solo contiene la parte
 * publica (la llave privada de la CA nunca sale del router).
 */
function buildCaExportBlock(names) {
  return [
    "# --- EXPORTAR LA CA (el MISMO archivo para todos los usuarios) ---",
    "# Este .crt es el que se sube en la pestana 'Configurar' de la web.",
    `/file remove [find name="${names.ca}.crt"]`,
    `/certificate export-certificate "${names.ca}" file-name="${names.ca}"`,
    `:put "  -> ${names.ca}.crt listo en Files"`,
    "",
  ];
}

/** Cabecera comun de todos los scripts. */
function header(title, names, extra = []) {
  return [
    "# ============================================================",
    `# ${title}`,
    "# Generado por Web OpenVPN - MAAT",
    `# CA: ${names.ca}   Perfil: ${names.prof}   Servidor: ${names.server || "unico (RouterOS 6/7.0-7.16)"}`,
    ...extra.map((l) => `# ${l}`),
    "#",
    "# >>> EJECUTALO CON:  /import file-name=<archivo>.rsc  <<<",
    "# (Contiene bloques condicionales :if; importar es lo fiable, NO pegar.)",
    "# ============================================================",
    "",
  ];
}

/** Normaliza y acota la validez de los certificados. */
function normalizeDays(daysValid) {
  return Math.max(1, Math.min(9999, Math.round(Number(daysValid)) || VPN_DEFAULTS.daysValid));
}

/**
 * Cifrados y algoritmos de autenticacion que habilitamos en el servidor.
 * Se listan TODOS los soportados para que acepte cualquier combinacion que
 * elija el cliente (evita el error "no shared cipher").
 *
 * OJO con ser optimista: si un valor no existe en esa build de RouterOS, el
 * comando 'set' falla ENTERO y el servidor se queda sin configurar. Por eso
 * sha512 solo se ofrece en 7.17+, donde esta garantizado.
 */
export function algorithmsFor(routerVersion) {
  if (routerVersion === "v6") {
    return { cipherList: "aes128,aes192,aes256", authList: "sha1,md5" };
  }
  const cipherList = "aes128-cbc,aes192-cbc,aes256-cbc,aes128-gcm,aes192-gcm,aes256-gcm";
  return {
    cipherList,
    authList: routerVersion === "v7-legacy" ? "sha1,sha256" : "sha1,sha256,sha512",
  };
}

/** Algoritmos de auth que el CLIENTE puede elegir, alineados con el servidor. */
export function clientAuthOptions(routerVersion) {
  if (routerVersion === "v6") return ["SHA1", "MD5"];
  if (routerVersion === "v7-legacy") return ["SHA256", "SHA1"];
  return ["SHA256", "SHA512", "SHA1"];
}

/** Solo permitimos tamanos de clave que RouterOS firma sin problemas. */
function normalizeKeySize(keySize) {
  return /^(1024|2048|4096)$/.test(String(keySize)) ? String(keySize) : "2048";
}

// ============================================================================
//  1. SCRIPT DEL SERVIDOR (servidor + usuarios)
// ============================================================================

/**
 * Script .rsc completo: monta el servidor OpenVPN del MikroTik (certificados,
 * pool, perfil, servidor, firewall y NAT) y da de alta los usuarios indicados.
 *
 * Es IDEMPOTENTE: la infraestructura se crea solo si no existe, asi que se
 * puede reejecutar para anadir usuarios sin romper los ya creados.
 *
 * @param {Object}   opts
 * @param {"v6"|"v7-legacy"|"v7"} opts.routerVersion
 * @param {Array<{name:string,password:string}>} opts.users Usuarios del servidor.
 * @param {"masquerade"|"srcnat"} opts.natMode  masquerade = funciona tambien si
 *        el MikroTik esta detras de otro router/modem (caso mas habitual).
 */
export function generateServerScript({
  routerVersion = "v7",
  vpnName = VPN_DEFAULTS.vpnName,
  publicIp = "",
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  users = [],
  poolRange = VPN_DEFAULTS.poolRange,
  localAddress = VPN_DEFAULTS.localAddress,
  network = VPN_DEFAULTS.network,
  netmask = VPN_DEFAULTS.netmask,
  dns = VPN_DEFAULTS.dns,
  daysValid = VPN_DEFAULTS.daysValid,
  natMode = VPN_DEFAULTS.natMode,
  keySize = VPN_DEFAULTS.keySize,
} = {}) {
  const isV6 = routerVersion === "v6";
  const names = resolveNames({ routerVersion, vpnName });
  const finalProto = isV6
    ? "tcp"
    : String(proto || "udp").toLowerCase() === "tcp"
      ? "tcp"
      : "udp";
  const days = normalizeDays(daysValid);
  const size = normalizeKeySize(keySize);
  const { cipherList, authList } = algorithmsFor(routerVersion);

  const host = escapeRos(publicIp || "<IP_PUBLICA_DEL_SERVIDOR>");
  const portNum = String(Number(port) || 1194);
  const dnsList = parseDnsList(dns).join(",") || VPN_DEFAULTS.dns;
  const safePool = escapeRos(poolRange);
  const safeLocal = escapeRos(localAddress);
  const safeNet = escapeRos(network);
  const safeMask = String(Number(netmask) || 24);
  const protoParam = isV6 ? "" : ` protocol=${finalProto}`;
  // subject-alt-name ayuda a que los clientes estrictos validen el certificado
  // del servidor. RouterOS 6 no lo admite en todas las builds -> solo en v7.
  const san =
    !isV6 && publicIp
      ? ` subject-alt-name=${isValidIp(publicIp) ? "IP" : "DNS"}:${escapeRos(publicIp)}`
      : "";

  const versionLabel = isV6 ? "6" : routerVersion === "v7-legacy" ? "7.0-7.16" : "7.17+";
  const L = header(`SERVIDOR OpenVPN "${names.vpn}" (RouterOS ${versionLabel})`, names, [
    `Puerto ${portNum}/${finalProto.toUpperCase()}   Red VPN ${network}   Validez ${days} dias`,
    `Un unico servidor OVPN atiende a TODOS los usuarios (${users.length} en este script).`,
    "Reejecutable: la infraestructura solo se crea la primera vez.",
  ]);

  // --- 1. CA del servidor ----------------------------------------------------
  L.push("# --- 1. AUTORIDAD CERTIFICADORA (solo si aun no existe) ---");
  L.push("# TODOS los usuarios de este servidor se firman con esta MISMA CA: es lo");
  L.push("# que evita el error 'peer certificate verification failure'.");
  L.push(`:if ([:len [/certificate find name="${names.ca}"]] = 0) do={`);
  L.push(`  :put "Creando CA ${names.ca} (puede tardar 1-2 minutos)..."`);
  L.push(
    `  /certificate add name="${names.ca}" common-name="${names.ca}" key-size=${size} key-usage=key-cert-sign,crl-sign days-valid=${days}`
  );
  L.push(`  /certificate sign "${names.ca}" ca-crl-host=${host} name="${names.ca}"`);
  L.push(`  ${waitSigned(`"${names.ca}"`)}`);
  L.push("}");
  L.push("");

  // --- 2. Certificado del servidor ------------------------------------------
  L.push("# --- 2. CERTIFICADO DEL SERVIDOR (solo si aun no existe) ---");
  L.push(`:if ([:len [/certificate find name="${names.srv}"]] = 0) do={`);
  L.push(`  :put "Creando certificado de servidor ${names.srv}..."`);
  L.push(
    `  /certificate add name="${names.srv}" common-name="${names.srv}" days-valid=${days} key-size=${size} key-usage=digital-signature,key-encipherment,tls-server${san}`
  );
  L.push(`  /certificate sign "${names.srv}" ca="${names.ca}" name="${names.srv}"`);
  L.push(`  ${waitSigned(`"${names.srv}"`)}`);
  L.push("}");
  L.push("# Reaseguramos trusted=yes por si una ejecucion anterior se interrumpio.");
  L.push(`/certificate set [find name="${names.ca}"] trusted=yes`);
  L.push(`/certificate set [find name="${names.srv}"] trusted=yes`);
  L.push("");

  // --- 3. Pool y perfil ------------------------------------------------------
  L.push("# --- 3. POOL de IPs y PERFIL PPP (compartidos por todos los usuarios) ---");
  L.push(`:if ([:len [/ip pool find name="${names.pool}"]] = 0) do={`);
  L.push(`  /ip pool add name="${names.pool}" ranges=${safePool}`);
  L.push(`} else={ /ip pool set [find name="${names.pool}"] ranges=${safePool} }`);
  L.push(`:if ([:len [/ppp profile find name="${names.prof}"]] = 0) do={`);
  L.push(
    `  /ppp profile add name="${names.prof}" local-address=${safeLocal} remote-address="${names.pool}" use-encryption=yes change-tcp-mss=yes dns-server=${dnsList}`
  );
  L.push("} else={");
  L.push(
    `  /ppp profile set [find name="${names.prof}"] local-address=${safeLocal} remote-address="${names.pool}" use-encryption=yes change-tcp-mss=yes dns-server=${dnsList}`
  );
  L.push("}");
  L.push("");

  // --- 4. Servidor OVPN ------------------------------------------------------
  L.push("# --- 4. SERVIDOR OpenVPN (uno solo, para todos los usuarios) ---");
  if (names.singleton) {
    L.push("# RouterOS 6 / 7.0-7.16: el router admite UN solo servidor OVPN ('set').");
    L.push(
      `/interface ovpn-server server set enabled=yes certificate="${names.srv}" require-client-certificate=yes auth=${authList} cipher=${cipherList}${protoParam} default-profile="${names.prof}" netmask=${safeMask} mode=ip port=${portNum}`
    );
  } else {
    L.push("# RouterOS 7.17+: multi-instancia. Este servidor atiende a todos los");
    L.push("# usuarios de esta VPN; otras VPN del router quedan intactas.");
    L.push(`:if ([:len [/interface ovpn-server server find name="${names.server}"]] = 0) do={`);
    L.push(
      `  /interface ovpn-server server add name="${names.server}" certificate="${names.srv}" require-client-certificate=yes auth=${authList} cipher=${cipherList} protocol=${finalProto} default-profile="${names.prof}" netmask=${safeMask} mode=ip port=${portNum} disabled=no`
    );
    L.push("} else={");
    L.push(
      `  /interface ovpn-server server set [find name="${names.server}"] certificate="${names.srv}" require-client-certificate=yes auth=${authList} cipher=${cipherList} protocol=${finalProto} default-profile="${names.prof}" netmask=${safeMask} mode=ip port=${portNum} disabled=no`
    );
    L.push("}");
  }
  L.push("");

  // --- 5. Firewall -----------------------------------------------------------
  L.push("# --- 5. FIREWALL ---");
  L.push("# 5a. Abrir el puerto del servidor (chain=input).");
  L.push(`/ip firewall filter remove [find comment="${names.fw}"]`);
  L.push(
    `/ip firewall filter add chain=input action=accept protocol=${finalProto} dst-port=${portNum} comment="${names.fw}"`
  );
  L.push(`/ip firewall filter move [find comment="${names.fw}"] destination=0`);
  L.push("# 5b. Permitir que el trafico de los clientes ATRAVIESE el router");
  L.push("#     (chain=forward). Sin esto, con el firewall por defecto de MikroTik");
  L.push("#     la VPN conecta pero el cliente NO navega ni ve la LAN.");
  L.push(`/ip firewall filter remove [find comment="${names.fwd}"]`);
  L.push(
    `/ip firewall filter add chain=forward action=accept src-address=${safeNet} comment="${names.fwd}"`
  );
  L.push(
    `/ip firewall filter add chain=forward action=accept dst-address=${safeNet} connection-state=established,related comment="${names.fwd}"`
  );
  L.push(`/ip firewall filter move [find comment="${names.fwd}"] destination=0`);
  L.push("");

  // --- 6. NAT ----------------------------------------------------------------
  //
  //  IMPORTANTE (aprendido en un router real): esta regla se anade AL FINAL de
  //  la cadena, nunca en destination=0.
  //
  //  Muchos routers ya tienen su propia regla de salida, y puede ser la unica
  //  correcta. Caso real: un router con la IP publica en la interfaz "lo" y un
  //  enganche CGNAT en ether1 necesita 'src-nat to-addresses=<publica>', porque
  //  es la unica IP que el ISP enruta de vuelta. Si nuestra regla masquerade se
  //  coloca ANTES, captura el trafico de la VPN y lo traduce a la IP del
  //  enganche: los paquetes salen y no vuelve ninguno. La VPN conecta pero no
  //  hay Internet.
  //
  //  Al ir al final, si el router ya NATea bien, nuestra regla ni se usa; y si
  //  no habia ninguna, es la que hace el trabajo.
  L.push("# --- 6. NAT: salida a Internet para los clientes VPN ---");
  L.push(`/ip firewall nat remove [find comment="${names.nat}"]`);
  if (natMode === "auto") {
    // Modo AUTOMATICO (por defecto): el router decide.
    //
    // Si ya hay reglas de srcnat, son las que dan salida a Internet al resto de
    // la red y casi siempre cubren tambien la VPN. Crear otra por delante es
    // justo lo que rompe instalaciones como la del caso real que motivo esto:
    // masquerade traducia a la IP del enganche CGNAT en vez de a la publica.
    //
    // Asi que: si no hay ninguna, creamos masquerade; si ya hay, no tocamos
    // nada y avisamos por pantalla.
    L.push("# Modo automatico: si el router ya tiene NAT de salida, se respeta.");
    L.push(`:local otrasNat [:len [/ip firewall nat find chain=srcnat]]`);
    L.push(":if ($otrasNat = 0) do={");
    L.push(
      `  /ip firewall nat add chain=srcnat action=masquerade src-address=${safeNet} comment="${names.nat}"`
    );
    L.push('  :put "NAT: no habia ninguna regla de salida; se creo masquerade para la VPN."');
    L.push("} else={");
    L.push(
      '  :put "NAT: el router ya tiene $otrasNat regla(s) en srcnat; se respetan y NO se crea ninguna."'
    );
    L.push(`  :put "     Si los clientes conectan pero no navegan, comprueba que esas reglas"`);
    L.push(`  :put "     cubran la red ${network} (mira /ip firewall nat print stats)."`);
    L.push("}");
  } else if (natMode === "none") {
    L.push("# Elegiste NO crear regla de NAT: el router ya tiene la suya y se");
    L.push("# encargara del trafico de la VPN. Si los clientes conectan pero no");
    L.push("# navegan, revisa esa regla existente.");
  } else if (natMode === "srcnat" && publicIp && isValidIp(publicIp)) {
    L.push("# Modo src-nat: traduce a una IP publica FIJA. Es lo correcto cuando");
    L.push("# la IP publica es tuya aunque este en 'lo' (loopback) y la salida sea");
    L.push("# un enganche CGNAT: masquerade usaria la IP del enganche y el trafico");
    L.push("# no tendria retorno.");
    L.push(
      `/ip firewall nat add chain=srcnat action=src-nat to-addresses=${host} src-address=${safeNet} comment="${names.nat}"`
    );
  } else {
    L.push("# Modo masquerade: traduce a la IP de la interfaz de salida. Vale para");
    L.push("# IP dinamica y para el router detras de un modem domestico.");
    L.push(
      `/ip firewall nat add chain=srcnat action=masquerade src-address=${safeNet} comment="${names.nat}"`
    );
  }
  L.push("# NOTA: la regla queda al FINAL a proposito. Si el router ya tiene una");
  L.push("# regla de salida que funciona, esa manda y esta no estorba.");
  L.push(':put "Servidor OpenVPN listo."');
  L.push("");

  // --- 7. Exportar la CA -----------------------------------------------------
  L.push("# --- 7. CERTIFICADO DE LA CA ---");
  L.push(...buildCaExportBlock(names));

  // --- 8. Usuarios -----------------------------------------------------------
  L.push(`# --- 8. USUARIOS DE ESTE SERVIDOR (${users.length}) ---`);
  if (!users.length) {
    L.push("# (Ningun usuario en este script: anadelos desde la web y reejecuta,");
    L.push("#  o usa el script 'Anadir usuarios'.)");
    L.push("");
  }
  for (const user of users) {
    L.push(...buildUserBlock({ names, user, days, keySize: size }));
  }

  L.push(':put "=== TODO LISTO ==="');
  L.push(`:put "Descarga de Files: ${names.ca}.crt y el .crt/.key de cada usuario."`);
  return L.join("\n") + "\n";
}

// ============================================================================
//  2. SCRIPT PARA ANADIR USUARIOS AL SERVIDOR YA CREADO
// ============================================================================

/**
 * Script .rsc que SOLO da de alta usuarios en el servidor existente. No toca
 * CA, servidor, pool, perfil, firewall ni NAT: los usuarios que ya estaban
 * siguen conectados y funcionando.
 */
export function generateAddUsersScript({
  routerVersion = "v7",
  vpnName = VPN_DEFAULTS.vpnName,
  users = [],
  daysValid = VPN_DEFAULTS.daysValid,
  keySize = VPN_DEFAULTS.keySize,
} = {}) {
  const names = resolveNames({ routerVersion, vpnName });
  const days = normalizeDays(daysValid);
  const size = normalizeKeySize(keySize);

  const L = header(`ANADIR ${users.length} USUARIO(S) al servidor OpenVPN`, names, [
    "Usa la CA y el perfil que ya existen: no toca el servidor ni al resto de usuarios.",
    "Requiere que el servidor ya este creado en este router.",
  ]);

  L.push("# --- Comprobacion previa: el servidor debe existir ---");
  L.push(`:if ([:len [/certificate find name="${names.ca}"]] = 0) do={`);
  L.push(`  :error "No existe la CA ${names.ca}. Ejecuta primero el script del SERVIDOR."`);
  L.push("}");
  L.push(`:if ([:len [/ppp profile find name="${names.prof}"]] = 0) do={`);
  L.push(`  :error "No existe el perfil ${names.prof}. Ejecuta primero el script del SERVIDOR."`);
  L.push("}");
  L.push("");

  // La CA se reexporta: hace falta para el .ovpn de los usuarios nuevos y puede
  // que ya no este en Files (se borra a mano con frecuencia).
  L.push(...buildCaExportBlock(names));

  for (const user of users) {
    L.push(...buildUserBlock({ names, user, days, keySize: size }));
  }

  L.push(':put "Usuarios anadidos correctamente."');
  return L.join("\n") + "\n";
}

// ============================================================================
//  3. SCRIPT DE REVOCACION
// ============================================================================

/**
 * Corta el acceso de uno o varios usuarios: elimina su /ppp secret (que es lo
 * que realmente bloquea el login), cierra su sesion activa y borra/revoca su
 * certificado y los archivos exportados. El servidor y el resto de usuarios
 * siguen funcionando.
 */
export function generateRevokeUsersScript({
  routerVersion = "v7",
  vpnName = VPN_DEFAULTS.vpnName,
  users = [],
} = {}) {
  const names = resolveNames({ routerVersion, vpnName });

  const L = header(`REVOCAR ${users.length} USUARIO(S) del servidor OpenVPN`, names, [
    "Elimina credenciales, sesion activa, certificado y archivos exportados.",
    "El servidor y el resto de usuarios quedan intactos.",
  ]);

  L.push("# NOTA: el servidor OpenVPN de MikroTik no publica CRL a los clientes,");
  L.push("# asi que lo que corta el acceso de verdad es borrar el /ppp secret.");
  L.push("# Aun asi revocamos y borramos el certificado para dejarlo todo limpio.");
  L.push("");

  for (const user of users) {
    const login = sanitizeName(user.name, "cliente1");
    const cert = certNameFor(names, login);
    L.push(`# ---- Revocar "${login}" ----`);
    L.push(`/ppp secret remove [find name="${login}"]`);
    L.push(`:do { /ppp active remove [find name="${login}"] } on-error={}`);
    L.push(`:do { /certificate issued-revoke [find name="${cert}"] } on-error={}`);
    L.push(`/certificate remove [find name="${cert}"]`);
    L.push(`/file remove [find name="${cert}.crt"]`);
    L.push(`/file remove [find name="${cert}.key"]`);
    L.push(`:put "Usuario ${login} revocado."`);
    L.push("");
  }

  L.push(':put "Revocacion completada."');
  return L.join("\n") + "\n";
}

// ============================================================================
//  3b. SCRIPT DE DIAGNOSTICO
// ============================================================================

/**
 * Script .rsc que NO cambia nada: revisa la VPN y escribe un informe en la
 * terminal. Nace de un caso real en el que la VPN conectaba pero no daba
 * Internet, y hacia falta mirar seis sitios distintos para dar con el motivo.
 *
 * Comprueba, en este orden: certificados, pool, perfil, servidor, usuarios,
 * sesiones activas, firewall y NAT.
 */
export function generateDiagnosticScript({
  routerVersion = "v7",
  vpnName = VPN_DEFAULTS.vpnName,
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  network = VPN_DEFAULTS.network,
} = {}) {
  const names = resolveNames({ routerVersion, vpnName });
  const isV6 = routerVersion === "v6";
  const finalProto = isV6 ? "tcp" : String(proto || "udp").toLowerCase() === "tcp" ? "tcp" : "udp";
  const portNum = String(Number(port) || 1194);
  const safeNet = escapeRos(network);

  const L = [];
  L.push("# ============================================================");
  L.push(`# DIAGNOSTICO de la VPN "${names.vpn}"`);
  L.push("# Generado por Web OpenVPN - MAAT");
  L.push("#");
  L.push("# SOLO LEE: no modifica nada del router. Ejecutalo con la VPN");
  L.push("# conectada para que tambien revise la sesion activa.");
  L.push("#");
  L.push("# >>> /import file-name=<archivo>.rsc  <<<");
  L.push("# ============================================================");
  L.push("");
  L.push(':put "=================================================="');
  L.push(`:put "  DIAGNOSTICO VPN ${names.vpn}"`);
  L.push(':put "=================================================="');
  L.push("");

  // 1. Certificados
  L.push(':put "--- 1. CERTIFICADOS ---"');
  L.push(`:if ([:len [/certificate find name="${names.ca}"]] > 0) do={`);
  L.push(`  :local caOk [/certificate get [find name="${names.ca}"] trusted]`);
  L.push(`  :put "  [OK] CA ${names.ca} existe (trusted=$caOk)"`);
  L.push(`  :if ($caOk = false) do={ :put "  [!!] La CA NO es de confianza -> peer certificate verification failure" }`);
  L.push(`} else={ :put "  [!!] FALTA la CA ${names.ca}. Ejecuta el script del servidor." }`);
  L.push(`:if ([:len [/certificate find name="${names.srv}"]] > 0) do={`);
  L.push(`  :put "  [OK] Certificado de servidor ${names.srv} existe"`);
  L.push(`} else={ :put "  [!!] FALTA el certificado de servidor ${names.srv}" }`);
  L.push(`:if ([:len [/file find name="${names.ca}.crt"]] > 0) do={`);
  L.push(`  :put "  [OK] ${names.ca}.crt esta en Files (es el que se sube a la web)"`);
  L.push(`} else={ :put "  [!!] ${names.ca}.crt NO esta en Files -> exportalo o no podras crear .ovpn" }`);
  L.push("");

  // 2. Pool y perfil
  L.push(':put "--- 2. POOL Y PERFIL ---"');
  L.push(`:if ([:len [/ip pool find name="${names.pool}"]] > 0) do={`);
  L.push(`  :put "  [OK] Pool ${names.pool}: $[/ip pool get [find name="${names.pool}"] ranges]"`);
  L.push(`} else={ :put "  [!!] FALTA el pool ${names.pool}" }`);
  L.push(`:if ([:len [/ppp profile find name="${names.prof}"]] > 0) do={`);
  L.push(`  :put "  [OK] Perfil ${names.prof} -> local-address=$[/ppp profile get [find name="${names.prof}"] local-address]"`);
  L.push(`  :put "       dns-server=$[/ppp profile get [find name="${names.prof}"] dns-server]"`);
  L.push(`} else={ :put "  [!!] FALTA el perfil ${names.prof}" }`);
  L.push("");

  // 3. Servidor
  L.push(':put "--- 3. SERVIDOR OpenVPN ---"');
  if (names.singleton) {
    L.push(':local srvOn [/interface ovpn-server server get enabled]');
    L.push(':local srvPort [/interface ovpn-server server get port]');
    L.push(':put "  Servidor unico: enabled=$srvOn puerto=$srvPort"');
    L.push(':if ($srvOn = false) do={ :put "  [!!] El servidor esta DESHABILITADO" }');
  } else {
    L.push(`:if ([:len [/interface ovpn-server server find name="${names.server}"]] > 0) do={`);
    L.push(`  :local sPort [/interface ovpn-server server get [find name="${names.server}"] port]`);
    L.push(`  :local sProto [/interface ovpn-server server get [find name="${names.server}"] protocol]`);
    L.push(`  :local sOff [/interface ovpn-server server get [find name="${names.server}"] disabled]`);
    L.push(`  :put "  [OK] ${names.server}: puerto=$sPort protocolo=$sProto disabled=$sOff"`);
    L.push(`  :if ($sOff = true) do={ :put "  [!!] El servidor esta DESHABILITADO" }`);
    L.push(`} else={ :put "  [!!] FALTA el servidor ${names.server}" }`);
  }
  L.push("");

  // 4. Usuarios y sesiones
  L.push(':put "--- 4. USUARIOS Y SESIONES ---"');
  L.push(`:local nUsers [:len [/ppp secret find profile="${names.prof}"]]`);
  L.push(':put "  Usuarios dados de alta en este perfil: $nUsers"');
  L.push(':if ($nUsers = 0) do={ :put "  [!!] No hay ningun /ppp secret con este perfil: nadie podra autenticar" }');
  L.push(`:foreach u in=[/ppp secret find profile="${names.prof}"] do={`);
  L.push('  :put "    - $[/ppp secret get $u name] (ultimo acceso: $[/ppp secret get $u last-logged-out])"');
  L.push("}");
  L.push(":local nAct [:len [/ppp active find]]");
  L.push(':put "  Sesiones activas ahora: $nAct"');
  L.push(":foreach a in=[/ppp active find] do={");
  L.push('  :local ip [/ppp active get $a address]');
  L.push('  :put "    - $[/ppp active get $a name] con IP $ip"');
  L.push(`  :if ([:typeof [:find $ip "${network.split("/")[0].split(".").slice(0, 3).join(".")}."]] = "nil") do={`);
  L.push(`    :put "      [!!] Esa IP NO parece de la red ${network}: las reglas de NAT y firewall"`);
  L.push('    :put "           filtradas por esa red no le aplicaran. Revisa que el usuario"');
  L.push(`    :put "           use el perfil ${names.prof}."`);
  L.push("  }");
  L.push("}");
  L.push("");

  // 5. Firewall
  L.push(':put "--- 5. FIREWALL ---"');
  L.push(
    `:local fwIn [/ip firewall filter find chain=input action=accept protocol=${finalProto} dst-port=${portNum}]`
  );
  L.push(":if ([:len $fwIn] > 0) do={");
  L.push(`  :put "  [OK] Hay regla de input que abre ${portNum}/${finalProto.toUpperCase()}"`);
  L.push("} else={");
  L.push(`  :put "  [??] No veo una regla input que abra ${portNum}/${finalProto.toUpperCase()}."`);
  L.push('  :put "       Si la VPN conecta, otra regla lo permite; si no conecta, este es el motivo."');
  L.push("}");
  L.push(`:local nDrop [:len [/ip firewall filter find chain=forward action=drop]]`);
  L.push(':put "  Reglas drop en la cadena forward: $nDrop"');
  L.push(`:put "     Si el cliente conecta pero no navega, comprueba que ninguna atrape ${safeNet}"`);
  L.push("");

  // 6. NAT — el punto donde fallo el caso real
  L.push(':put "--- 6. NAT (salida a Internet) ---"');
  L.push(":local nNat [:len [/ip firewall nat find chain=srcnat]]");
  L.push(':put "  Reglas en srcnat: $nNat"');
  L.push(':if ($nNat = 0) do={');
  L.push('  :put "  [!!] No hay NINGUNA regla de NAT: los clientes VPN no podran salir a Internet."');
  L.push("}");
  L.push(":local idx 0");
  L.push(":foreach n in=[/ip firewall nat find chain=srcnat] do={");
  L.push('  :local acc [/ip firewall nat get $n action]');
  L.push('  :local pkt [/ip firewall nat get $n packets]');
  L.push('  :local cmt [/ip firewall nat get $n comment]');
  L.push('  :put "    [$idx] action=$acc packets=$pkt  $cmt"');
  L.push("  :set idx ($idx + 1)");
  L.push("}");
  L.push(':put "  Como leerlo:"');
  L.push(':put "   - La PRIMERA regla que coincida es la que manda."');
  L.push(`:put "   - Si la que cubre ${safeNet} tiene packets=0 mientras hay clientes"`);
  L.push('  :put "     conectados, no esta haciendo match y por eso no navegan."');
  L.push('  :put "   - Con la IP publica en la interfaz \'lo\' y salida por CGNAT, la regla"');
  L.push('  :put "     correcta es src-nat a esa IP publica, NO masquerade."');
  L.push("");
  L.push(':put "=================================================="');
  L.push(':put "  FIN DEL DIAGNOSTICO"');
  L.push(':put "=================================================="');

  return L.join("\n") + "\n";
}

// ============================================================================
//  4. ARCHIVO CLIENTE .ovpn
// ============================================================================

/** Limpia un PEM: normaliza saltos de linea y quita espacios sobrantes. */
function cleanPem(text, placeholder) {
  if (!text || !String(text).trim()) return placeholder;
  return String(text).replace(/\r\n/g, "\n").trim();
}

/** RouterOS 6 solo soporta TCP en OpenVPN. */
function normalizeProto(version, proto) {
  const p = String(proto || "udp").toLowerCase();
  if (Number(version) === 6) return "tcp";
  return p === "tcp" ? "tcp" : "udp";
}

/**
 * Genera el contenido de un archivo .ovpn listo para importar en OpenVPN
 * Connect / OpenVPN GUI.
 *
 * @param {boolean}  opts.embedCredentials  false => el .ovpn NO lleva usuario ni
 *        contrasena (mas seguro si el archivo se envia por correo/WhatsApp).
 * @param {boolean}  opts.redirectGateway   true = todo el trafico por la VPN;
 *        false = tunel dividido, solo las redes de opts.routes.
 * @param {string[]} opts.routes            Redes remotas en tunel dividido.
 */
export function generateOvpnFile({
  version = 7,
  remote,
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  username = "",
  password = "",
  auth = VPN_DEFAULTS.auth,
  cipher = VPN_DEFAULTS.cipher,
  caCert = "",
  clientCert = "",
  clientKey = "",
  redirectGateway = true,
  routes = [],
  dns = VPN_DEFAULTS.dns,
  embedCredentials = true,
}) {
  const finalProto = normalizeProto(version, proto);
  const isGcm = /gcm/i.test(cipher);
  const isV6 = Number(version) === 6;
  const host = remote && remote.trim() ? remote.trim() : "<IP_DEL_SERVIDOR>";

  const lines = [
    "# ============================================================",
    "# Configuracion OpenVPN generada por Web OpenVPN - MAAT",
    `# Compatible con MikroTik RouterOS ${version}`,
    "# ============================================================",
    "client",
    "dev tun",
    `proto ${finalProto}`,
    `remote ${host} ${port}`,
    "nobind",
    "persist-key",
    "persist-tun",
    "resolv-retry infinite",
    "remote-cert-tls server",
    `auth ${auth}`,
  ];

  // RouterOS 7 negocia TLS 1.2: forzar el minimo evita degradar a TLS 1.0/1.1.
  if (!isV6) lines.push("tls-version-min 1.2");

  const dataCiphers = (list) => [...new Set(list)].join(":");

  // Compatibilidad de cifrado:
  //  - RouterOS 6: NO negocia cifrado (sin NCP) -> hay que FORZARLO.
  //  - RouterOS 7 + CBC: ofrecemos SOLO CBC. RouterOS 7.17+ tiene un bug de
  //    descifrado con AES-*-GCM ("cipher final failed") que rompe el handshake.
  //  - RouterOS 7 + GCM: elegido expresamente; GCM con CBC de respaldo.
  if (isV6) {
    lines.push(`cipher ${cipher}`);
    lines.push(`data-ciphers ${cipher}`);
    lines.push(`data-ciphers-fallback ${cipher}`);
  } else if (isGcm) {
    lines.push(
      `data-ciphers ${dataCiphers([cipher, "AES-256-GCM", "AES-128-GCM", "AES-256-CBC", "AES-128-CBC"])}`
    );
    lines.push("data-ciphers-fallback AES-256-CBC");
  } else {
    lines.push(`cipher ${cipher}`);
    lines.push(`data-ciphers ${dataCiphers([cipher, "AES-256-CBC", "AES-128-CBC"])}`);
    lines.push(`data-ciphers-fallback ${cipher}`);
  }

  // NO usamos 'auth-nocache': OpenVPN Connect lo rechaza al reconectar con
  // "Required credentials are missing for the reconnection attempt".
  lines.push("mute 10");
  lines.push("verb 3");

  if (redirectGateway) {
    lines.push("redirect-gateway def1");
  } else {
    lines.push("# Tunel dividido: solo estas redes van por la VPN.");
    for (const r of routes) {
      const parsed = parseCidr(r);
      if (!parsed.ok) continue;
      const { netInt, size } = networkBounds(parsed.ip, parsed.prefix);
      const mask = intToIp((~(size - 1) >>> 0));
      lines.push(`route ${intToIp(netInt)} ${mask}`);
    }
  }

  // DNS del cliente. El servidor OVPN de MikroTik NO hace push de DNS: el
  // 'dns-server' del perfil PPP no llega al PC/movil. Si tunelizamos todo y no
  // fijamos DNS aqui, el cliente conecta pero no resuelve nombres.
  if (redirectGateway) {
    for (const d of parseDnsList(dns)) lines.push(`dhcp-option DNS ${d}`);
  }
  lines.push("");

  if (embedCredentials && username) {
    lines.push("<auth-user-pass>");
    lines.push(username);
    lines.push(password || "");
    lines.push("</auth-user-pass>");
  } else {
    lines.push("# Las credenciales NO van dentro del archivo: OpenVPN las pedira");
    lines.push("# al conectar. Es lo recomendado si el .ovpn se envia por correo.");
    lines.push("auth-user-pass");
  }
  lines.push("");

  lines.push("<ca>");
  lines.push(cleanPem(caCert, "# >>> Pega aqui el contenido de ca.crt <<<"));
  lines.push("</ca>");
  lines.push("");
  lines.push("<cert>");
  lines.push(cleanPem(clientCert, "# >>> Pega aqui el contenido de client.crt <<<"));
  lines.push("</cert>");
  lines.push("");
  lines.push("# NOTA: MikroTik exporta la llave .key CIFRADA con la contrasena del");
  lines.push("# usuario. Al conectar, OpenVPN pedira esa misma contrasena (Private Key).");
  lines.push("<key>");
  lines.push(cleanPem(clientKey, "# >>> Pega aqui el contenido de client.key <<<"));
  lines.push("</key>");

  return lines.join("\n") + "\n";
}

// ============================================================================
//  5. OTRO MIKROTIK COMO CLIENTE (site-to-site)
// ============================================================================

/**
 * Script .rsc para que OTRO MikroTik se conecte como cliente OpenVPN al
 * servidor. Util para enlazar dos sucursales.
 */
export function generateClientRouterScript({
  version = 7,
  remote,
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  username = "<USUARIO_PPP>",
  password = "<CLAVE_PPP>",
  auth = VPN_DEFAULTS.auth,
  cipher = VPN_DEFAULTS.cipher,
  caFilename = "ca.crt",
  clientCertFilename = "client.crt",
  clientKeyFilename = "client.key",
  interfaceName = "ovpn-out",
  addDefaultRoute = false,
  remoteNetworks = [],
} = {}) {
  const isV6 = Number(version) === 6;
  const finalProto = normalizeProto(version, proto);
  const host = escapeRos(remote && remote.trim() ? remote.trim() : "<IP_DEL_SERVIDOR>");
  const iface = sanitizeName(interfaceName, "ovpn-out");
  const user = escapeRos(username);
  const pass = escapeRos(password);

  const a = String(auth).toLowerCase();
  let c = String(cipher).toLowerCase().replace(/-cbc$/, "").replace(/-gcm$/, "");
  if (!isV6) c = c + "-cbc"; // RouterOS 7 requiere el sufijo.

  // Nombre con el que RouterOS registra el certificado importado.
  const importedCert = clientCertFilename.replace(/\.(crt|cer)$/i, "") + ".crt_0";

  const L = [];
  L.push("# ============================================================");
  L.push(`# CLIENTE OpenVPN (site-to-site) - MikroTik RouterOS ${version}`);
  L.push("# Generado por Web OpenVPN - MAAT");
  L.push("# ============================================================");
  L.push("");
  L.push("# --- 1. Sube los 3 archivos a Files y luego importalos ---");
  L.push(`#    Archivos: ${caFilename}, ${clientCertFilename}, ${clientKeyFilename}`);
  L.push(`/certificate import file-name=${caFilename} passphrase=""`);
  L.push(`/certificate import file-name=${clientCertFilename} passphrase=""`);
  L.push("# La llave privada va cifrada con la contrasena del usuario VPN:");
  L.push(`/certificate import file-name=${clientKeyFilename} passphrase="${pass}"`);
  L.push("");
  L.push("# Comprueba el nombre real del certificado importado:");
  L.push("#   /certificate print");
  L.push(`# Suele quedar como ${importedCert}. Ajustalo abajo si no coincide.`);
  L.push("");

  L.push("# --- 2. Crear la interfaz cliente OpenVPN ---");
  L.push(`/interface ovpn-client remove [find name="${iface}"]`);
  const params = [
    `add name="${iface}"`,
    `connect-to=${host}`,
    `port=${port}`,
    !isV6 ? `protocol=${finalProto}` : "",
    `user="${user}"`,
    `password="${pass}"`,
    `certificate="${importedCert}"`,
    `auth=${a}`,
    `cipher=${c}`,
    "mode=ip",
    `add-default-route=${addDefaultRoute ? "yes" : "no"}`,
    !isV6 ? "verify-server-certificate=yes" : "",
    "disabled=no",
  ]
    .filter(Boolean)
    .join(" ");
  L.push(`/interface ovpn-client ${params}`);
  L.push("");

  const validNets = remoteNetworks
    .map((n) => parseCidr(n))
    .filter((p) => p.ok);
  if (validNets.length) {
    L.push("# --- 3. Rutas hacia las redes del otro extremo ---");
    for (const p of validNets) {
      const { netInt } = networkBounds(p.ip, p.prefix);
      L.push(`/ip route add dst-address=${intToIp(netInt)}/${p.prefix} gateway="${iface}"`);
    }
    L.push("");
  }

  L.push("# --- 4. Comprobar el estado de la conexion ---");
  L.push("/interface ovpn-client print");
  L.push(`/interface ovpn-client monitor "${iface}" once`);

  return L.join("\n") + "\n";
}

// ----------------------------------------------------------------------------
//  Alias retrocompatibles (no romper imports antiguos)
// ----------------------------------------------------------------------------
export const generateRsc = generateClientRouterScript;
export const generateTerminalCommands = generateClientRouterScript;

// ============================================================================
//  Generador de configuraciones OpenVPN para MikroTik RouterOS
//  Web OpenVPN - MAAT
//
//  Cubre los 3 artefactos necesarios para montar una VPN completa:
//    1. generateOvpnFile()       -> archivo cliente .ovpn (Windows/Android/iOS/Linux/Mac)
//    2. generateServerScript()   -> script .rsc para el MikroTik que actua de SERVIDOR
//    3. generateClientRouterScript() -> script .rsc para un MikroTik que actua de CLIENTE
//
//  Notas de compatibilidad:
//    - RouterOS 6  -> OpenVPN solo soporta TCP. Cifrados sin sufijo (-cbc/-gcm).
//    - RouterOS 7  -> soporta UDP y TCP. Cifrados con sufijo -cbc y -gcm.
//    - RouterOS 7.15+ -> el servidor OVPN se crea con "add" (multiples servidores).
// ============================================================================

/** Valores por defecto compartidos por todos los generadores.
 *  El usuario PUEDE sobrescribir la red VPN completa (pool, gateway, red, máscara)
 *  desde la interfaz. Estos valores solo se usan como sugerencia inicial. */
export const VPN_DEFAULTS = {
  port: "1194",
  proto: "udp",
  auth: "SHA1",
  cipher: "AES-256-CBC",
  poolName: "ovpn-pool",
  poolRange: "10.10.10.10-10.10.10.254",
  localAddress: "10.10.10.1",
  network: "10.10.10.0/24",
  netmask: "24",
  dns: "8.8.8.8,1.1.1.1",
  profileName: "ovpn-profile",
};

/**
 * A partir de una red en notación CIDR (ej. "10.8.0.0/24") deduce valores
 * coherentes para el resto de campos de la VPN. Pensado para redes /24
 * (el caso habitual). Si el CIDR no es válido devuelve los valores por defecto.
 *
 * @param {string} cidr  Red VPN, ej. "10.8.0.0/24".
 * @returns {{network:string, netmask:string, localAddress:string, poolRange:string}}
 */
export function deriveVpnNetwork(cidr) {
  const fallback = {
    network: VPN_DEFAULTS.network,
    netmask: VPN_DEFAULTS.netmask,
    localAddress: VPN_DEFAULTS.localAddress,
    poolRange: VPN_DEFAULTS.poolRange,
  };

  const m = String(cidr || "").trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/);
  if (!m) return fallback;

  const oct = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  const prefix = Number(m[5]);
  if (oct.some((o) => o > 255) || prefix < 8 || prefix > 30) return fallback;

  // Base de la red (los 3 primeros octetos). Asumimos /24 para el pool.
  const base = `${oct[0]}.${oct[1]}.${oct[2]}`;
  return {
    network: `${base}.0/${prefix}`,
    netmask: String(prefix),
    localAddress: `${base}.1`,
    poolRange: `${base}.10-${base}.254`,
  };
}

/** Limpia un texto de certificado: quita espacios extra y normaliza saltos de linea. */
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

// ============================================================================
//  1. ARCHIVO CLIENTE .ovpn
// ============================================================================

/**
 * Genera el contenido de un archivo .ovpn listo para importar en la app
 * OpenVPN Connect / OpenVPN GUI de cualquier sistema operativo.
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
  dns = VPN_DEFAULTS.dns,
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

  // Une una lista de cifrados quitando duplicados y conservando el orden.
  const dataCiphers = (list) => [...new Set(list)].join(":");

  // Compatibilidad de cifrado:
  //  - RouterOS 6: NO negocia cifrado (sin NCP). Hay que FORZAR el cifrado elegido
  //    y limitar data-ciphers al mismo, o el cliente moderno se queja.
  //  - RouterOS 7 + CBC: forzamos SOLO CBC y NO ofrecemos GCM. RouterOS 7.17+ tiene
  //    un bug de descifrado con AES-*-GCM ("cipher final failed") que rompe el
  //    handshake; si el cliente ofreciera GCM, el servidor podria negociarlo y
  //    fallar. Ofrecer unicamente CBC garantiza una conexion estable.
  //  - RouterOS 7 + GCM: el usuario lo eligio expresamente; ofrecemos GCM con CBC
  //    como respaldo. (Si tu router es 7.17+ y no conecta, cambia a un cifrado CBC.)
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

  // NO usamos 'auth-nocache': OpenVPN Connect lo rechaza al reconectar con el
  // error "Required credentials are missing for the reconnection attempt"
  // (sin la credencial cacheada no puede renegociar). Dejar que el cliente
  // recuerde usuario/clave es lo que permite que la reconexion funcione.
  lines.push("mute 10");
  lines.push("verb 3");
  if (redirectGateway) lines.push("redirect-gateway def1");

  // DNS para el cliente. IMPORTANTE: el servidor OpenVPN de MikroTik NO envia
  // (push) servidores DNS al cliente -> el 'dns-server' del perfil PPP es solo
  // para el enlace, no llega al PC/movil. Si tunelizamos todo el trafico con
  // 'redirect-gateway def1' y no fijamos DNS aqui, el cliente conecta pero NO
  // resuelve nombres ("VPN conectada pero sin internet"). Por eso emitimos los
  // DNS con 'dhcp-option DNS', soportado por OpenVPN Connect y OpenVPN GUI.
  const dnsServers = String(dns || "")
    .split(/[\s,;]+/)
    .map((d) => d.trim())
    .filter((d) => /^\d{1,3}(\.\d{1,3}){3}$/.test(d));
  for (const d of dnsServers) lines.push(`dhcp-option DNS ${d}`);
  lines.push("");

  // Usuario/clave PPP embebidos (si se proporcionan) o solicitud interactiva.
  if (username) {
    lines.push("<auth-user-pass>");
    lines.push(username);
    lines.push(password || "");
    lines.push("</auth-user-pass>");
  } else {
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
  lines.push("# cliente. Al conectar, OpenVPN pedira esa misma contrasena (Private Key).");
  lines.push("<key>");
  lines.push(cleanPem(clientKey, "# >>> Pega aqui el contenido de client.key <<<"));
  lines.push("</key>");

  return lines.join("\n") + "\n";
}

// ============================================================================
//  2. SCRIPT DEL SERVIDOR (.rsc)
// ============================================================================

/**
 * Genera el script .rsc COMPLETO para convertir un MikroTik en servidor OpenVPN:
 * certificados, pool de IP, perfil PPP, usuario, servidor OVPN, firewall y NAT.
 *
 * @param {Object} opts
 * @param {"v6"|"v7"} opts.routerVersion  RouterOS 6 o RouterOS 7 (cualquier 7.x).
 */
export function generateServerScript({
  routerVersion = "v7",
  publicIp = "<IP_PUBLICA_DEL_SERVIDOR>",
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  clientName = "cliente1",
  clientPassword = "<CLAVE_DEL_CLIENTE>",
  poolRange = VPN_DEFAULTS.poolRange,
  localAddress = VPN_DEFAULTS.localAddress,
  network = VPN_DEFAULTS.network,
  netmask = VPN_DEFAULTS.netmask,
  dns = VPN_DEFAULTS.dns,
  daysValid = 3650,
} = {}) {
  // 3 ramas explicitas elegidas por el usuario (sin deteccion automatica):
  //   - "v6"        : RouterOS 6.x          -> servidor singleton, set enabled=yes, TCP.
  //   - "v7-legacy" : RouterOS 7.0 - 7.16   -> servidor singleton, set enabled=yes, UDP/TCP.
  //   - "v7"        : RouterOS 7.17 o sup.  -> servidor multi-instancia, add ... disabled=no.
  // NOTA: el modelo multi-instancia ('add name=...') aparecio en 7.17, NO en 7.15.
  // En 7.15 y 7.16 el servidor sigue siendo unico y se configura con 'set enabled=yes'
  // (rama "v7-legacy"). Elegir "v7" en un router 7.15/7.16 daria error de sintaxis.
  const isV6 = routerVersion === "v6";
  const isV7Legacy = routerVersion === "v7-legacy";
  // El resto (routerVersion === "v7" o vacio) cae en la rama multi-instancia 7.17+.
  const usesSingleton = isV6 || isV7Legacy;
  const finalProto = isV6 ? "tcp" : (proto || "udp").toLowerCase();
  const cn = clientName || "cliente1";

  // ---------------------------------------------------------------------------
  //  NOMBRES UNICOS POR VPN
  //  Cada objeto (CA, cert servidor, pool, perfil, servidor OVPN, reglas de
  //  firewall y archivos exportados) cuelga del nombre del cliente. Asi puedes
  //  crear VARIAS VPN en el MISMO router sin que choquen ni se borren entre si.
  //  La limpieza de mas abajo SOLO toca los objetos de ESTA VPN (su nombre unico),
  //  nunca las demas.
  // ---------------------------------------------------------------------------
  const caName = `ca-${cn}`;        // certificado CA de esta VPN
  const srvCert = `srv-${cn}`;      // certificado del servidor de esta VPN
  const poolNm = `pool-${cn}`;      // pool de IPs de esta VPN
  const profNm = `prof-${cn}`;      // perfil PPP de esta VPN
  const srvName = `ovpn-${cn}`;     // servidor OVPN (solo en 7.17+ multi-instancia)
  const fwComment = `OpenVPN-Web-${cn}`;
  const natComment = `OpenVPN-Web-NAT-${cn}`;

  // Validez de los certificados (en dias). Es lo que fija la "fecha de fin" de la
  // VPN: cuando el certificado del servidor o del cliente caduca, la conexion deja
  // de funcionar. El usuario elige una fecha en la web y se convierte a dias aqui.
  // Acotamos a un minimo de 1 dia y un maximo de ~27 anios (RouterOS lo admite).
  const days = Math.max(1, Math.min(9999, Math.round(Number(daysValid)) || 3650));

  // Cifrados y autenticaciones soportados segun la version de RouterOS.
  // Listamos TODOS los soportados para que el servidor acepte cualquier
  // combinacion que el cliente .ovpn elija (evita el error "no shared cipher").
  const cipherList = isV6
    ? "aes128,aes192,aes256"
    : "aes128-cbc,aes192-cbc,aes256-cbc,aes128-gcm,aes192-gcm,aes256-gcm";
  const authList = isV6 ? "sha1,md5" : "sha1,md5,sha256";

  const L = [];
  L.push(`# === VPN "${cn}" -> objetos con nombre unico para convivir con otras VPN ===`);
  L.push(`# CA=${caName}  cert-servidor=${srvCert}  pool=${poolNm}  perfil=${profNm}`);
  if (!usesSingleton) L.push(`# servidor OVPN=${srvName}  (puerto ${port})`);
  L.push("");

  L.push("# --- 0. LIMPIEZA ACOTADA: SOLO esta VPN, nunca las demas ---");
  L.push("# Borramos exclusivamente los objetos con el nombre unico de ESTA VPN.");
  L.push("# Asi, reejecutar el mismo cliente lo ACTUALIZA, pero las otras VPN del");
  L.push("# router quedan intactas. Si find no encuentra nada, remove no hace nada.");
  if (usesSingleton) {
    L.push("# OJO (RouterOS 6 / 7.0-7.16): el servidor OVPN es de INSTANCIA UNICA.");
    L.push("# Solo puede existir UN servidor OpenVPN en el router, y mas abajo se");
    L.push("# (re)configura con 'set'. En estas versiones NO es posible tener varios");
    L.push("# servidores OVPN independientes: para varias VPN usa RouterOS 7.17+.");
    L.push("# No tocamos el servidor aqui para no cortar conexiones en curso.");
  } else {
    L.push(`# RouterOS 7.17+: multi-instancia -> borramos SOLO nuestro servidor (${srvName}).`);
    L.push(`/interface ovpn-server server remove [find name=${srvName}]`);
  }
  L.push(`/ppp secret remove [find name=${cn}]`);
  L.push(`/ppp profile remove [find name=${profNm}]`);
  L.push(`/ip pool remove [find name=${poolNm}]`);
  L.push(`/ip firewall filter remove [find comment="${fwComment}"]`);
  L.push(`/ip firewall nat remove [find comment="${natComment}"]`);
  L.push(`/certificate remove [find name=${cn}]`);
  L.push(`/certificate remove [find name=${srvCert}]`);
  L.push(`/certificate remove [find name=${caName}]`);
  L.push("# Archivos exportados de ESTA VPN (nombre exacto, sin regex).");
  L.push(`/file remove [find name="${caName}.crt"]`);
  L.push(`/file remove [find name="${cn}.crt"]`);
  L.push(`/file remove [find name="${cn}.key"]`);
  L.push(`:put "Limpieza de la VPN ${cn} OK (otras VPN intactas)."`);
  L.push("");

  L.push("# --- 1. CERTIFICADOS: crear plantillas (CA, servidor y cliente) ---");
  L.push("# Usamos la ruta completa en cada linea (no dependemos del contexto /certificate).");
  L.push(`# Validez configurada por el usuario: ${days} dias desde la firma.`);
  L.push(`/certificate add name=${caName} common-name=${caName} key-usage=key-cert-sign,crl-sign days-valid=${days}`);
  L.push(`/certificate add name=${srvCert} common-name=${srvCert} days-valid=${days} key-usage=digital-signature,key-encipherment,tls-server`);
  L.push(`/certificate add name=${cn} common-name=${cn} days-valid=${days} key-usage=tls-client`);
  L.push("");

  L.push("# --- 2. FIRMAR los certificados (cada uno puede tardar de segundos a 1-2 min) ---");
  L.push("# Cada par (sign + :for de espera) son 2 LINEAS INDEPENDIENTES. El :for");
  L.push("# es un one-liner con llaves balanceadas en la misma linea -> el terminal");
  L.push("# nunca queda atrapado esperando '}'.");
  L.push(`/certificate sign ${caName} ca-crl-host=${publicIp} name=${caName}`);
  L.push(`:for i from=1 to=180 do={ :if ([/certificate get [find name=${caName}] serial-number] = "") do={ :delay 1s } }`);
  L.push(`/certificate sign ${srvCert} ca=${caName} name=${srvCert}`);
  L.push(`:for i from=1 to=180 do={ :if ([/certificate get [find name=${srvCert}] serial-number] = "") do={ :delay 1s } }`);
  L.push(`/certificate sign ${cn} ca=${caName} name=${cn}`);
  L.push(`:for i from=1 to=180 do={ :if ([/certificate get [find name=${cn}] serial-number] = "") do={ :delay 1s } }`);
  L.push(':put "Certificados firmados OK."');
  L.push("");

  L.push("# --- 3. Marcar los certificados como CONFIABLES ---");
  L.push("# IMPORTANTE: en RouterOS 7.x el certificado del CLIENTE tambien debe ir");
  L.push("# como trusted=yes. Si no, el servidor OVPN responde con 'alert 48");
  L.push("# (unknown_ca)' en el handshake mutuo aunque la cadena este perfecta.");
  L.push(`/certificate set ${caName} trusted=yes`);
  L.push(`/certificate set ${srvCert} trusted=yes`);
  L.push(`/certificate set ${cn} trusted=yes`);
  L.push("");

  L.push("# --- 4. POOL de direcciones IP para los clientes VPN ---");
  L.push("# Usa una RED DISTINTA por cada VPN para que no se solapen (ej: 10.69.x / 10.70.x).");
  L.push(`/ip pool add name=${poolNm} ranges=${poolRange}`);
  L.push("");

  L.push("# --- 5. PERFIL PPP (parametros de la conexion VPN) ---");
  L.push(`/ppp profile add name=${profNm} local-address=${localAddress} remote-address=${poolNm} use-encryption=yes change-tcp-mss=yes dns-server=${dns}`);
  L.push("");

  L.push("# --- 6. USUARIO VPN (credenciales que iran en el archivo .ovpn) ---");
  L.push(`/ppp secret add name=${cn} password="${clientPassword}" service=ovpn profile=${profNm}`);
  L.push("");

  L.push("# --- 7. ACTIVAR el servidor OpenVPN ---");
  if (isV6) {
    L.push("# RouterOS 6: servidor de instancia unica con 'set enabled=yes'. Sin parametro protocol.");
    L.push("# (En v6 todas las VPN comparten este unico servidor.)");
    L.push(`/interface ovpn-server server set enabled=yes certificate=${srvCert} require-client-certificate=yes auth=${authList} cipher=${cipherList} default-profile=${profNm} netmask=${netmask} mode=ip port=${port}`);
  } else if (isV7Legacy) {
    L.push("# RouterOS 7.0 - 7.16: servidor de instancia unica con 'set enabled=yes' + protocol=.");
    L.push("# (En estas versiones todas las VPN comparten este unico servidor.)");
    L.push(`/interface ovpn-server server set enabled=yes certificate=${srvCert} require-client-certificate=yes auth=${authList} cipher=${cipherList} protocol=${finalProto} default-profile=${profNm} netmask=${netmask} mode=ip port=${port}`);
  } else {
    L.push("# RouterOS 7.17 o superior: servidor multi-instancia con 'add ... disabled=no'.");
    L.push(`# Cada VPN crea su propio servidor (${srvName}) en su propio puerto (${port}).`);
    L.push(`/interface ovpn-server server add name=${srvName} certificate=${srvCert} require-client-certificate=yes auth=${authList} cipher=${cipherList} protocol=${finalProto} default-profile=${profNm} netmask=${netmask} mode=ip port=${port} disabled=no`);
  }
  L.push(':put "Servidor OpenVPN activado OK."');
  L.push("");

  L.push("# --- 8. FIREWALL: permitir el puerto de OpenVPN (regla movida al inicio) ---");
  L.push(`/ip firewall filter add chain=input action=accept protocol=${finalProto} dst-port=${port} comment="${fwComment}"`);
  L.push(`/ip firewall filter move [find comment="${fwComment}"] destination=0`);
  L.push("");

  L.push("# --- 9. NAT: dar salida a Internet a los clientes VPN (src-nat a la IP publica) ---");
  L.push("# Usamos src-nat con to-addresses fijo a tu IP publica (no masquerade).");
  L.push("# Si tu IP publica fuera dinamica, cambia la accion a action=masquerade.");
  L.push(`/ip firewall nat add chain=srcnat action=src-nat to-addresses=${publicIp} src-address=${network} comment="${natComment}"`);
  L.push(`/ip firewall nat move [find comment="${natComment}"] destination=0`);
  L.push("");

  L.push("# --- 10. EXPORTAR los certificados (descargar desde Files) ---");
  L.push(`/certificate export-certificate ${caName} file-name=${caName}`);
  L.push(`/certificate export-certificate ${cn} export-passphrase="${clientPassword}" file-name=${cn}`);
  L.push("");
  L.push(`# Resultado: en Files apareceran  ${caName}.crt  /  ${cn}.crt  /  ${cn}.key`);
  L.push("# Descarguelos y uselos en la pestana 'Configurar' de esta web.");

  return L.join("\n") + "\n";
}

// ============================================================================
//  3. SCRIPT DE UN MIKROTIK COMO CLIENTE (.rsc)
// ============================================================================

/**
 * Genera el script .rsc para que OTRO MikroTik se conecte como cliente OpenVPN
 * al servidor. Util para enlazar dos sucursales (site-to-site).
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
} = {}) {
  const isV6 = Number(version) === 6;
  const finalProto = normalizeProto(version, proto);
  const host = remote && remote.trim() ? remote.trim() : "<IP_DEL_SERVIDOR>";

  // RouterOS usa el cifrado/auth en minusculas y con sufijos segun version.
  const a = String(auth).toLowerCase();
  let c = String(cipher).toLowerCase().replace(/-cbc$/, "").replace(/-gcm$/, "");
  if (!isV6) c = c + "-cbc"; // RouterOS 7 requiere el sufijo.

  const L = [];
  L.push("# ============================================================");
  L.push("# CLIENTE OpenVPN - MikroTik RouterOS " + version);
  L.push("# Generado por Web OpenVPN - MAAT");
  L.push("# ============================================================");
  L.push("");
  L.push("# --- 1. Suba los 3 archivos al router (Files) y luego importelos ---");
  L.push(`#    Archivos necesarios: ${caFilename}, ${clientCertFilename}, ${clientKeyFilename}`);
  L.push("/certificate");
  L.push(`import file-name=${caFilename} passphrase=""`);
  L.push(`import file-name=${clientCertFilename} passphrase=""`);
  L.push(`import file-name=${clientKeyFilename} passphrase=""`);
  L.push("");
  L.push("# Verifique el nombre real del certificado importado con:");
  L.push("#   /certificate print");
  L.push("# y reemplace 'cert-cliente' abajo por ese nombre (suele ser client.crt_0).");
  L.push("");

  L.push("# --- 2. Crear la interfaz cliente OpenVPN ---");
  L.push("/interface ovpn-client");
  if (isV6) {
    // RouterOS 6: sin parametro protocol (solo TCP).
    L.push(`add name=ovpn-out connect-to=${host} port=${port} \\`);
    L.push(`    user=${username} password=${password} \\`);
    L.push(`    certificate=cert-cliente auth=${a} cipher=${c} \\`);
    L.push("    mode=ip add-default-route=yes disabled=no");
  } else {
    L.push(`add name=ovpn-out connect-to=${host} port=${port} protocol=${finalProto} \\`);
    L.push(`    user=${username} password=${password} \\`);
    L.push(`    certificate=cert-cliente auth=${a} cipher=${c} \\`);
    L.push("    mode=ip add-default-route=yes verify-server-certificate=yes disabled=no");
  }
  L.push("");
  L.push("# --- 3. Comprobar el estado de la conexion ---");
  L.push("/interface ovpn-client print");
  L.push("/interface ovpn-client monitor ovpn-out once");

  return L.join("\n") + "\n";
}

// ----------------------------------------------------------------------------
//  Alias retrocompatibles (no romper imports antiguos)
// ----------------------------------------------------------------------------
export const generateRsc = generateClientRouterScript;
export const generateTerminalCommands = generateClientRouterScript;

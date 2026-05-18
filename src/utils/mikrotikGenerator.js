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

/** Valores por defecto compartidos por todos los generadores. */
export const VPN_DEFAULTS = {
  port: "1194",
  proto: "udp",
  auth: "SHA1",
  cipher: "AES-256-CBC",
  poolName: "ovpn-pool",
  poolRange: "10.10.10.10-10.10.10.250",
  localAddress: "10.10.10.1",
  network: "10.10.10.0/24",
  netmask: "24",
  dns: "8.8.8.8,1.1.1.1",
  profileName: "ovpn-profile",
};

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
}) {
  const finalProto = normalizeProto(version, proto);
  const isGcm = /gcm/i.test(cipher);
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

  // El cifrado "cipher" quedo obsoleto en OpenVPN 2.5+. Para GCM usamos
  // data-ciphers y mantenemos un fallback CBC por compatibilidad con RouterOS 6/7.
  if (isGcm) {
    lines.push(`data-ciphers ${cipher}:AES-256-CBC:AES-128-CBC`);
    lines.push("data-ciphers-fallback AES-256-CBC");
  } else {
    lines.push(`cipher ${cipher}`);
    lines.push(`data-ciphers ${cipher}:AES-256-GCM:AES-128-GCM`);
  }

  lines.push("auth-nocache");
  lines.push("mute 10");
  lines.push("verb 3");
  if (redirectGateway) lines.push("redirect-gateway def1");
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
 * @param {"v6"|"v7"|"v7_modern"} opts.routerVersion  Version de RouterOS del servidor.
 */
export function generateServerScript({
  routerVersion = "v7_modern",
  publicIp = "<IP_PUBLICA_DEL_SERVIDOR>",
  port = VPN_DEFAULTS.port,
  proto = VPN_DEFAULTS.proto,
  clientName = "cliente1",
  clientPassword = "<CLAVE_DEL_CLIENTE>",
  poolName = VPN_DEFAULTS.poolName,
  poolRange = VPN_DEFAULTS.poolRange,
  localAddress = VPN_DEFAULTS.localAddress,
  network = VPN_DEFAULTS.network,
  netmask = VPN_DEFAULTS.netmask,
  dns = VPN_DEFAULTS.dns,
  profileName = VPN_DEFAULTS.profileName,
} = {}) {
  const isV6 = routerVersion === "v6";
  const isModern = routerVersion === "v7_modern";
  const finalProto = isV6 ? "tcp" : (proto || "udp").toLowerCase();
  const cn = clientName || "cliente1";

  // Cifrados soportados segun la version de RouterOS.
  const cipherList = isV6
    ? "aes128,aes192,aes256"
    : "aes128-cbc,aes192-cbc,aes256-cbc,aes128-gcm,aes192-gcm,aes256-gcm";

  const L = [];
  L.push("# --- 1. CERTIFICADOS: crear plantillas (CA, servidor y cliente) ---");
  L.push("/certificate");
  L.push("add name=ca common-name=ca-ovpn key-usage=key-cert-sign,crl-sign days-valid=3650");
  L.push("add name=server common-name=server-ovpn days-valid=3650 \\");
  L.push("    key-usage=digital-signature,key-encipherment,tls-server");
  L.push(`add name=${cn} common-name=${cn} days-valid=3650 key-usage=tls-client`);
  L.push("");

  L.push("# --- 2. FIRMAR los certificados (este paso puede tardar 1-2 min) ---");
  L.push("/certificate");
  L.push(`sign ca ca-crl-host=${publicIp} name=ca`);
  L.push(":delay 4s");
  L.push("sign server ca=ca name=server");
  L.push(":delay 4s");
  L.push(`sign ${cn} ca=ca name=${cn}`);
  L.push(":delay 4s");
  L.push("");

  L.push("# --- 3. Marcar los certificados como CONFIABLES ---");
  L.push("/certificate set ca trusted=yes");
  L.push("/certificate set server trusted=yes");
  L.push("");

  L.push("# --- 4. POOL de direcciones IP para los clientes VPN ---");
  L.push("/ip pool");
  L.push(`add name=${poolName} ranges=${poolRange}`);
  L.push("");

  L.push("# --- 5. PERFIL PPP (parametros de la conexion VPN) ---");
  L.push("/ppp profile");
  L.push(`add name=${profileName} local-address=${localAddress} remote-address=${poolName} \\`);
  L.push(`    use-encryption=yes change-tcp-mss=yes dns-server=${dns}`);
  L.push("");

  L.push("# --- 6. USUARIO VPN (credenciales que ira en el archivo .ovpn) ---");
  L.push("/ppp secret");
  L.push(`add name=${cn} password=${clientPassword} service=ovpn profile=${profileName}`);
  L.push("");

  L.push("# --- 7. ACTIVAR el servidor OpenVPN ---");
  L.push("/interface ovpn-server server");
  if (isV6) {
    // RouterOS 6: sintaxis "set", solo TCP, sin parametro protocol.
    L.push("set enabled=yes certificate=server require-client-certificate=yes \\");
    L.push(`    auth=sha1,md5 cipher=${cipherList} \\`);
    L.push(`    default-profile=${profileName} netmask=${netmask} mode=ip port=${port}`);
  } else if (isModern) {
    // RouterOS 7.15+: sintaxis "add" (permite varios servidores).
    L.push(`add name=ovpn-server1 certificate=server require-client-certificate=yes \\`);
    L.push(`    auth=sha1,sha256 cipher=${cipherList} protocol=${finalProto} \\`);
    L.push(`    default-profile=${profileName} netmask=${netmask} mode=ip port=${port} disabled=no`);
  } else {
    // RouterOS 7 (6.15 - 7.14): sintaxis "set" con protocolo configurable.
    L.push("set enabled=yes certificate=server require-client-certificate=yes \\");
    L.push(`    auth=sha1,sha256 cipher=${cipherList} protocol=${finalProto} \\`);
    L.push(`    default-profile=${profileName} netmask=${netmask} mode=ip port=${port}`);
  }
  L.push("");

  L.push("# --- 8. FIREWALL: permitir el puerto de OpenVPN (regla movida al inicio) ---");
  L.push("/ip firewall filter");
  L.push(`add chain=input action=accept protocol=${finalProto} dst-port=${port} comment="OpenVPN-Web"`);
  L.push('move [find comment="OpenVPN-Web"] destination=0');
  L.push("");

  L.push("# --- 9. NAT: dar salida a Internet a los clientes VPN (regla en posicion 0) ---");
  L.push("/ip firewall nat");
  L.push(`add chain=srcnat action=masquerade src-address=${network} comment="OpenVPN-Web-NAT"`);
  L.push('move [find comment="OpenVPN-Web-NAT"] destination=0');
  L.push("");

  L.push("# --- 10. EXPORTAR los certificados (descargar desde Files) ---");
  L.push("/certificate export-certificate ca file-name=ca");
  L.push(`/certificate export-certificate ${cn} export-passphrase=${clientPassword} file-name=${cn}`);
  L.push("");
  L.push("# Resultado: en Files apareceran  ca.crt  /  " + cn + ".crt  /  " + cn + ".key");
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

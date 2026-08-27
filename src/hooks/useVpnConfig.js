// ============================================================================
//  useVpnConfig — todo lo que se deduce de la sesion, en un solo sitio.
//
//  Antes esta logica vivia dentro del componente gigante de la seccion
//  "Servidor". Al partir el flujo en pasos, cada uno necesita las mismas
//  cuentas (validacion, nombres de objetos, scripts), asi que se extraen aqui.
// ============================================================================
import { useMemo } from "react";
import {
  generateServerScript,
  generateAddUsersScript,
  generateRevokeUsersScript,
  generateDiagnosticScript,
  deriveVpnNetwork,
  validatePoolRange,
  validateGateway,
  resolveNames,
  parseDnsList,
  isValidHost,
  isValidIp,
  isPrivateIp,
  VPN_DEFAULTS,
} from "../utils/mikrotikGenerator";
import { checkPassword } from "../utils/password";
import { useSession } from "../context/SessionContext";

/** Fecha local en formato YYYY-MM-DD (sin desfase de zona horaria). */
export function toISODate(date) {
  const off = date.getTimezoneOffset();
  return new Date(date.getTime() - off * 60000).toISOString().slice(0, 10);
}

/** Fecha de hoy + n dias, en YYYY-MM-DD. */
export function addDaysISO(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

export const VALID_PRESETS = [
  { label: "30 dias", days: 30 },
  { label: "90 dias", days: 90 },
  { label: "1 ano", days: 365 },
  { label: "5 anos", days: 1825 },
  { label: "10 anos", days: 3650 },
];

export function useVpnConfig() {
  const ctx = useSession();
  const { session, users } = ctx;

  const isV6 = session.routerVersion === "v6";
  const names = useMemo(
    () => resolveNames({ routerVersion: session.routerVersion, vpnName: session.vpnName }),
    [session.routerVersion, session.vpnName]
  );

  // --- Caducidad de los certificados ---------------------------------------
  const todayISO = toISODate(new Date());
  const effectiveValidUntil = session.validUntil || addDaysISO(3650);
  const validDays = Math.round(
    (new Date(`${effectiveValidUntil}T00:00:00`) - new Date(`${todayISO}T00:00:00`)) / 86400000
  );

  // --- Red de la VPN --------------------------------------------------------
  const net = useMemo(() => deriveVpnNetwork(session.vpnNetwork), [session.vpnNetwork]);

  // --- Validacion -----------------------------------------------------------
  // Se separan los errores del SERVIDOR de los de USUARIOS para que cada paso
  // del asistente sepa si esta completo por si mismo.
  const serverErrors = useMemo(() => {
    const e = {};
    if (!session.publicIp.trim()) e.publicIp = "Indica la IP publica o el dominio del MikroTik.";
    else if (!isValidHost(session.publicIp.trim()))
      e.publicIp = "No parece una IPv4 ni un dominio valido (ej. 181.188.203.190 o vpn.midominio.ec).";

    const p = Number(session.port);
    if (!session.port) e.port = "Indica el puerto de OpenVPN.";
    else if (!Number.isInteger(p) || p < 1 || p > 65535) e.port = "El puerto va de 1 a 65535.";

    if (net.error) e.vpnNetwork = net.error;

    const poolErr = validatePoolRange(session.poolRange, session.vpnNetwork);
    if (poolErr) e.poolRange = poolErr;

    const gwErr = validateGateway(session.localAddress, session.vpnNetwork, session.poolRange);
    if (gwErr) e.localAddress = gwErr;

    if (session.dns.trim() && parseDnsList(session.dns).length === 0)
      e.dns = "Ningun DNS valido. Escribe IPs separadas por coma (ej. 8.8.8.8,1.1.1.1).";

    if (validDays < 1) e.validUntil = "La fecha de caducidad debe ser posterior a hoy.";
    return e;
  }, [session, net, validDays]);

  const userErrors = useMemo(() => {
    if (!users.length) return { users: "Anade al menos un usuario al servidor." };
    const bad = users.find((u) => checkPassword(u.password || "").error);
    if (bad)
      return {
        users: `La contrasena de "${bad.name}" no es valida: ${checkPassword(bad.password || "").error}`,
      };
    return {};
  }, [users]);

  const serverOk = Object.keys(serverErrors).length === 0;
  const usersOk = Object.keys(userErrors).length === 0;

  // --- Avisos que no bloquean ----------------------------------------------
  const warnings = useMemo(() => {
    const w = [];
    if (session.publicIp && isValidIp(session.publicIp) && isPrivateIp(session.publicIp))
      w.push(
        `${session.publicIp} es una IP privada. Si el MikroTik esta detras de un modem, tendras que redirigir el puerto ${session.port} hacia el router.`
      );
    if (session.natMode === "srcnat" && session.publicIp && !isValidIp(session.publicIp))
      w.push(
        "Has indicado un dominio, no una IP. RouterOS necesita una IP en to-addresses, asi que el script usara masquerade. Escribe la IP publica fija si la tienes."
      );
    if (session.natMode === "masquerade")
      w.push(
        "Masquerade traduce a la IP de la interfaz de salida. Si tu IP publica esta en la interfaz 'lo' y sales por CGNAT, esa IP no tiene retorno: usa src-nat."
      );
    if (isV6 && session.protocol === "udp")
      w.push("RouterOS 6 solo soporta TCP en OpenVPN: el script forzara TCP.");
    return w;
  }, [session, isV6]);

  // --- Scripts --------------------------------------------------------------
  const scriptOpts = useMemo(
    () => ({
      routerVersion: session.routerVersion,
      vpnName: session.vpnName,
      publicIp: session.publicIp.trim(),
      port: session.port || VPN_DEFAULTS.port,
      proto: isV6 ? "tcp" : session.protocol,
      network: net.valid ? net.network : session.vpnNetwork,
      netmask: net.netmask,
      localAddress: session.localAddress,
      poolRange: session.poolRange,
      dns: session.dns,
      daysValid: validDays,
      natMode: session.natMode,
      keySize: session.keySize,
    }),
    [session, isV6, net, validDays]
  );

  const allUsers = useMemo(
    () => users.map((u) => ({ name: u.name, password: u.password })),
    [users]
  );
  // Los "nuevos" son los que aun no se han incluido en ningun script.
  const pendingUsers = useMemo(() => users.filter((u) => !u.deployed), [users]);

  const fullScript = useMemo(
    () => generateServerScript({ ...scriptOpts, users: allUsers }),
    [scriptOpts, allUsers]
  );

  const addScript = useMemo(
    () =>
      generateAddUsersScript({
        routerVersion: session.routerVersion,
        vpnName: session.vpnName,
        users: pendingUsers.map((u) => ({ name: u.name, password: u.password })),
        daysValid: validDays,
        keySize: session.keySize,
      }),
    [session.routerVersion, session.vpnName, session.keySize, pendingUsers, validDays]
  );

  const diagnosticScript = useMemo(
    () =>
      generateDiagnosticScript({
        routerVersion: session.routerVersion,
        vpnName: session.vpnName,
        port: session.port || VPN_DEFAULTS.port,
        proto: isV6 ? "tcp" : session.protocol,
        network: net.valid ? net.network : session.vpnNetwork,
      }),
    [session, isV6, net]
  );

  /** Script de revocacion para los usuarios indicados. */
  const buildRevokeScript = (targets) =>
    generateRevokeUsersScript({
      routerVersion: session.routerVersion,
      vpnName: session.vpnName,
      users: targets.map((u) => ({ name: u.name })),
    });

  return {
    ...ctx,
    isV6,
    names,
    net,
    todayISO,
    effectiveValidUntil,
    validDays,
    serverErrors,
    userErrors,
    serverOk,
    usersOk,
    warnings,
    fullScript,
    addScript,
    diagnosticScript,
    pendingUsers,
    buildRevokeScript,
  };
}

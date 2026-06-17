// 📁 src/components/CertificateSection.jsx
// Genera el script .rsc COMPLETO para convertir un MikroTik en servidor OpenVPN.
import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { generateServerScript, deriveVpnNetwork, VPN_DEFAULTS } from "../utils/mikrotikGenerator";
import { useSession } from "../context/SessionContext";

// Patrón de una red en notación CIDR válida (ej. 10.10.10.0/24).
const CIDR_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/;

const VERSIONS = [
  {
    id: "v6",
    icon: "📟",
    label: "RouterOS 6",
    desc:
      "RouterOS 6.x. Servidor OVPN singleton con 'set enabled=yes'. Solo TCP, " +
      "cifrados clásicos sin sufijo (aes128, aes192, aes256).",
  },
  {
    id: "v7-legacy",
    icon: "⚙️",
    label: "RouterOS 7.0 – 7.16",
    desc:
      "RouterOS 7 anterior a 7.17 (incluye 7.15 y 7.16). Servidor singleton con " +
      "'set enabled=yes' incluyendo protocol=. Acepta UDP y TCP, cifrados con sufijo -cbc y -gcm.",
  },
  {
    id: "v7",
    icon: "🚀",
    label: "RouterOS 7.17+",
    desc:
      "RouterOS 7.17 o superior. Servidor multi-instancia con 'add name=… disabled=no'. " +
      "El modelo de varios servidores OVPN llegó en 7.17 — NO en 7.15. Si tu router es " +
      "7.15 o 7.16, elige la opción anterior (7.0 – 7.16).",
  },
];

// Para saber qué versión tienes, ejecuta en tu router: /system resource print
// y mira la línea "version".

const CertificateSection = () => {
  // Todos los datos del servidor viven en la SESIÓN, para que se autocompleten
  // en la pestaña del cliente y para poder "terminar la sesión" y empezar otra.
  const { session, updateSession, markCredentialsCreated, endSession } = useSession();
  const {
    routerVersion: selectedVersion,
    clientName,
    clientPassword,
    publicIp: caCrlHost,
    port,
    protocol,
    vpnNetwork,
    localAddress,
    poolRange,
    dns,
    validUntil,
    credentialsCreated,
  } = session;

  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  // Setters que escriben directamente en la sesión.
  const setSelectedVersion = (v) => updateSession({ routerVersion: v });
  const setClientName = (v) => updateSession({ clientName: v });
  const setClientPassword = (v) => updateSession({ clientPassword: v });
  const setCaCrlHost = (v) => updateSession({ publicIp: v });
  const setPort = (v) => updateSession({ port: v });
  const setProtocol = (v) => updateSession({ protocol: v });
  const setLocalAddress = (v) => updateSession({ localAddress: v });
  const setPoolRange = (v) => updateSession({ poolRange: v });
  const setDns = (v) => updateSession({ dns: v });
  const setValidUntil = (v) => updateSession({ validUntil: v });

  const versionInfo = VERSIONS.find((v) => v.id === selectedVersion);
  const isV6 = selectedVersion === "v6";
  // Instancia unica (v6 / 7.0-7.16) -> CA COMPARTIDA (ca-ovpn.crt, igual para todos).
  // Multi-instancia (7.17+) -> una CA por VPN (ca-<cliente>.crt).
  const usesSharedCa = selectedVersion === "v6" || selectedVersion === "v7-legacy";
  const caFileName = usesSharedCa
    ? "ca-ovpn.crt"
    : `ca-${clientName || "cliente1"}.crt`;

  // --- Caducidad de la VPN (fecha de fin de los certificados) ---
  // El usuario elige una fecha; la convertimos a "days-valid" para el script.
  // Cuando el certificado caduca, la conexión OpenVPN deja de funcionar.
  const toISODate = (d) => {
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
  };
  const todayISO = toISODate(new Date());
  const addDaysISO = (n) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return toISODate(d);
  };
  // Por defecto (si el usuario no toca nada): hoy + 10 años, como antes.
  const defaultValidUntil = addDaysISO(3650);
  const effectiveValidUntil = validUntil || defaultValidUntil;
  const daysFromToday = (iso) => {
    const target = new Date(`${iso}T00:00:00`);
    const base = new Date(`${todayISO}T00:00:00`);
    return Math.round((target - base) / 86400000);
  };
  const validDays = daysFromToday(effectiveValidUntil);
  // Presets rápidos de duración.
  const VALID_PRESETS = [
    { label: "30 días", days: 30 },
    { label: "90 días", days: 90 },
    { label: "1 año", days: 365 },
    { label: "5 años", days: 1825 },
    { label: "10 años", days: 3650 },
  ];

  // Al escribir una red CIDR válida, autocompletamos gateway y pool (editables después).
  const handleNetworkChange = (value) => {
    if (CIDR_RE.test(value.trim())) {
      const d = deriveVpnNetwork(value);
      updateSession({ vpnNetwork: value, localAddress: d.localAddress, poolRange: d.poolRange });
    } else {
      updateSession({ vpnNetwork: value });
    }
  };

  // El script se recalcula automaticamente cuando cambia cualquier dato.
  const serverScript = useMemo(() => {
    const net = deriveVpnNetwork(vpnNetwork);
    return generateServerScript({
      routerVersion: selectedVersion,
      publicIp: caCrlHost || "<IP_PUBLICA_DEL_SERVIDOR>",
      port: port || "1194",
      proto: isV6 ? "tcp" : protocol,
      clientName: clientName || "cliente1",
      clientPassword: clientPassword || "<CLAVE_DEL_CLIENTE>",
      network: net.network,
      netmask: net.netmask,
      localAddress: localAddress || net.localAddress,
      poolRange: poolRange || net.poolRange,
      dns: dns || VPN_DEFAULTS.dns,
      daysValid: validDays,
    });
  }, [
    selectedVersion,
    caCrlHost,
    port,
    protocol,
    clientName,
    clientPassword,
    isV6,
    vpnNetwork,
    localAddress,
    poolRange,
    dns,
    validDays,
  ]);

  const showErrorAlert = (text) =>
    Swal.fire({
      title: "⚠️ Datos incompletos",
      text,
      icon: "warning",
      iconColor: "#F59E0B",
      background: "#F9FAFB",
      confirmButtonColor: "#F59E0B",
      confirmButtonText: "Entendido",
      customClass: { popup: "rounded-2xl shadow-xl" },
    });

  const handleGenerate = (e) => {
    e.preventDefault();
    if (!clientName.trim()) return showErrorAlert("Indica el nombre del cliente VPN.");
    if (clientPassword.length < 8)
      return showErrorAlert("La contraseña debe tener al menos 8 caracteres.");
    if (!caCrlHost.trim())
      return showErrorAlert("Indica la IP pública del servidor MikroTik.");
    if (!port) return showErrorAlert("Indica el puerto de OpenVPN.");
    if (!CIDR_RE.test(vpnNetwork.trim()))
      return showErrorAlert(
        "La red VPN debe ir en formato CIDR, por ejemplo: 10.10.10.0/24"
      );
    if (!localAddress.trim())
      return showErrorAlert("Indica la IP del gateway de la VPN (local-address).");
    if (!poolRange.trim())
      return showErrorAlert("Indica el rango del pool de IPs para los clientes.");
    if (validDays < 1)
      return showErrorAlert(
        "La fecha de caducidad de la VPN debe ser posterior a hoy."
      );

    setShowScript(true);
    // Las credenciales ya están creadas: la sesión pasa a su fase final.
    markCredentialsCreated();
    Swal.fire({
      title: "¡Credenciales creadas! 🎉",
      html: `
        <p style="margin-bottom:8px">El script completo del servidor para <strong>${clientName}</strong> está listo abajo.</p>
        <p style="font-size:0.9em;color:#475569">Tus datos (IP, usuario, contraseña y puerto) ya están cargados en la pestaña <strong>Cliente</strong>.</p>
      `,
      icon: "success",
      iconColor: "#10B981",
      background: "#F9FAFB",
      showConfirmButton: false,
      timer: 2200,
      timerProgressBar: true,
      customClass: { popup: "rounded-2xl shadow-2xl", title: "text-xl font-bold" },
    });
  };

  // Termina la sesión actual y deja todo en blanco para una nueva configuración.
  const handleEndSession = () => {
    endSession();
    setShowScript(false);
    setCopied(false);
    Swal.fire({
      title: "Sesión finalizada 👋",
      text: "Puedes empezar una nueva configuración desde cero.",
      icon: "success",
      iconColor: "#0EA5E9",
      background: "#F9FAFB",
      showConfirmButton: false,
      timer: 1600,
      timerProgressBar: true,
      customClass: { popup: "rounded-2xl shadow-xl" },
    });
  };

  // Prepara el formulario para AÑADIR otro usuario al MISMO servidor: conserva
  // IP pública, puerto, protocolo, versión, red VPN, DNS y caducidad; solo limpia
  // el nombre y la contraseña del cliente. El script generado para el nuevo
  // usuario NO afecta a los ya creados (la CA y el servidor se reutilizan; la
  // limpieza del script solo toca el usuario nuevo).
  const handleNewUser = () => {
    updateSession({ clientName: "", clientPassword: "", credentialsCreated: false });
    setShowScript(false);
    setCopied(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    Swal.fire({
      title: "Listo para otro usuario ➕",
      html:
        "Se conservaron los datos del servidor (IP, puerto, red, versión). " +
        "Escribe el <strong>nombre</strong> y la <strong>contraseña</strong> del nuevo usuario y genera su script.",
      icon: "info",
      iconColor: "#0EA5E9",
      background: "#F9FAFB",
      showConfirmButton: false,
      timer: 2600,
      timerProgressBar: true,
      customClass: { popup: "rounded-2xl shadow-xl" },
    });
  };

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(serverScript);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      showErrorAlert("No se pudo copiar. Selecciona el texto y cópialo manualmente.");
    }
  };

  const downloadScript = () => {
    const blob = new Blob([serverScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `servidor-openvpn_${clientName || "mikrotik"}.rsc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-bg pt-24 pb-20">
      <div className="aurora">
        <span className="aurora-blob b1" />
        <span className="aurora-blob b2" />
        <span className="aurora-blob b3" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="eyebrow mb-5">🖥️ Paso 1 · Servidor</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Tu MikroTik como <span className="text-gradient">servidor OpenVPN</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Genera el script completo que lo configura todo: certificados,
            usuario, firewall y NAT — en un solo paso.
          </p>
        </motion.div>

        {/* Banner de sesión activa */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="max-w-4xl mx-auto mb-8"
        >
          <div className="glass rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-emerald-300/40 dark:border-emerald-500/30">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <p className="text-sm text-slate-700 dark:text-slate-200">
                <strong>Sesión activa.</strong> Lo que escribas aquí (IP, usuario,
                contraseña y puerto) se autocompletará en la pestaña{" "}
                <strong>Cliente</strong>.
              </p>
            </div>
            <button
              onClick={handleEndSession}
              className="text-xs font-semibold text-slate-500 dark:text-slate-300 hover:text-rose-500 transition-colors whitespace-nowrap"
            >
              ↺ Reiniciar sesión
            </button>
          </div>
        </motion.div>

        {/* Selector de versión */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-1.5 flex gap-1.5">
            {VERSIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersion(v.id)}
                className={`px-7 md:px-9 py-3.5 rounded-xl font-bold text-sm md:text-base transition-all duration-300 ${
                  selectedVersion === v.id
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-sky-500/10"
                }`}
              >
                <span className="mr-2">{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Formulario */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="max-w-4xl mx-auto mb-10"
        >
          <div className="glass glass-topline rounded-3xl p-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6 text-center">
              Datos del servidor
            </h2>

            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Field
                  label="Nombre del cliente VPN:"
                  hint="Nombre del usuario que se conectará (sin espacios). Se usa como nombre del certificado y del usuario PPP. Ej: usuario01."
                >
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value.replace(/\s/g, ""))}
                    className="input-vpn"
                    placeholder="Ej: usuario01"
                    required
                  />
                </Field>
                <Field
                  label="Contraseña del cliente (mín. 8):"
                  hint="Clave del usuario VPN. También cifra la llave .key exportada, así que la pedirá OpenVPN al conectar. Mínimo 8 caracteres."
                >
                  <input
                    type="text"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="input-vpn"
                    placeholder="Ej: MiClave2024"
                    minLength={8}
                    required
                  />
                </Field>
                <Field
                  label="IP pública del servidor:"
                  hint="IP pública (WAN) o dominio del MikroTik por donde llegan los clientes. Es la que pondrás como 'remote' en el .ovpn. Ej: 181.188.203.190."
                >
                  <input
                    type="text"
                    value={caCrlHost}
                    onChange={(e) => setCaCrlHost(e.target.value)}
                    className="input-vpn"
                    placeholder="Ej: 181.188.203.190"
                    required
                  />
                </Field>
                <Field
                  label="Puerto OpenVPN:"
                  hint="Puerto donde escucha el servidor. El estándar es 1194. Debe estar abierto en el firewall y NAT del MikroTik (el script lo abre)."
                >
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="input-vpn"
                    placeholder="1194"
                    min="1"
                    max="65535"
                    required
                  />
                </Field>
                <Field
                  label="Protocolo:"
                  hint={
                    isV6
                      ? "RouterOS 6 solo soporta TCP en OpenVPN."
                      : "UDP es más rápido (recomendado). Usa TCP solo si UDP está bloqueado en la red."
                  }
                >
                  {isV6 ? (
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400">
                      TCP (único disponible en RouterOS 6)
                    </div>
                  ) : (
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="input-vpn"
                    >
                      <option value="udp">UDP (recomendado)</option>
                      <option value="tcp">TCP</option>
                    </select>
                  )}
                </Field>
              </div>

              {/* --- Red de la VPN: el usuario define el pool de IPs --- */}
              <div className="pt-2">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                  Red de la VPN (pool de IPs)
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                  Define el rango privado que usarán tus clientes. Escribe la red y se
                  autocompletan el gateway y el pool; puedes ajustarlos a tu gusto.
                  No debe chocar con la red LAN de tu MikroTik.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field
                    label="Red VPN (CIDR):"
                    hint="Subred privada para la VPN, en formato red/máscara. Lo normal es un /24. Ej: 10.10.10.0/24 o 10.8.0.0/24."
                  >
                    <input
                      type="text"
                      value={vpnNetwork}
                      onChange={(e) => handleNetworkChange(e.target.value)}
                      className="input-vpn"
                      placeholder="Ej: 10.10.10.0/24"
                      required
                    />
                  </Field>
                  <Field
                    label="Gateway VPN (local-address):"
                    hint="IP del propio MikroTik dentro de la VPN. Suele ser la primera de la red (.1) y NO debe estar dentro del pool. Ej: 10.10.10.1."
                  >
                    <input
                      type="text"
                      value={localAddress}
                      onChange={(e) => setLocalAddress(e.target.value)}
                      className="input-vpn"
                      placeholder="Ej: 10.10.10.1"
                      required
                    />
                  </Field>
                  <Field
                    label="Pool de IPs para clientes:"
                    hint="Rango de IPs que se reparten a los clientes (inicio-fin). No incluyas el gateway. Ej: 10.10.10.10-10.10.10.254."
                  >
                    <input
                      type="text"
                      value={poolRange}
                      onChange={(e) => setPoolRange(e.target.value)}
                      className="input-vpn"
                      placeholder="Ej: 10.10.10.10-10.10.10.254"
                      required
                    />
                  </Field>
                  <Field
                    label="DNS para los clientes:"
                    hint="Servidores DNS que recibirán los clientes al conectar, separados por coma. Ej: 8.8.8.8,1.1.1.1."
                  >
                    <input
                      type="text"
                      value={dns}
                      onChange={(e) => setDns(e.target.value)}
                      className="input-vpn"
                      placeholder="Ej: 8.8.8.8,1.1.1.1"
                    />
                  </Field>
                </div>
              </div>

              {/* Caducidad de la VPN: fija la validez de los certificados */}
              <div className="p-4 bg-amber-50 dark:bg-amber-900/15 rounded-xl border border-amber-200 dark:border-amber-700/60">
                <h4 className="font-semibold text-amber-800 dark:text-amber-300 mb-1 flex items-center gap-2">
                  <span className="text-lg">⏳</span> Caducidad de la VPN
                </h4>
                <p className="text-xs text-amber-700/90 dark:text-amber-300/80 mb-3">
                  Fecha en la que los certificados (y por tanto la conexión VPN) dejarán
                  de funcionar. Úsala para dar accesos temporales. Por defecto: 10 años.
                </p>
                <div className="flex flex-col sm:flex-row sm:items-end gap-3">
                  <Field label="La VPN caduca el:">
                    <input
                      type="date"
                      value={effectiveValidUntil}
                      min={addDaysISO(1)}
                      onChange={(e) => setValidUntil(e.target.value)}
                      className="input-vpn"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2 pb-1">
                    {VALID_PRESETS.map((p) => {
                      const presetDate = addDaysISO(p.days);
                      const active = effectiveValidUntil === presetDate;
                      return (
                        <button
                          key={p.days}
                          type="button"
                          onClick={() => setValidUntil(presetDate)}
                          className={
                            "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors " +
                            (active
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "bg-white/70 dark:bg-slate-800/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30")
                          }
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-300/70">
                  {validDays >= 1
                    ? `Validez: ${validDays} día${validDays === 1 ? "" : "s"} (days-valid=${validDays} en el script).`
                    : "⚠️ La fecha debe ser posterior a hoy."}
                </p>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700 flex items-start gap-3">
                <span className="text-blue-500 text-lg">ℹ️</span>
                <div>
                  <h4 className="font-semibold text-blue-800 dark:text-blue-300">
                    {versionInfo.label}
                  </h4>
                  <p className="text-blue-700 dark:text-blue-400 text-sm">
                    {versionInfo.desc}
                  </p>
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg shadow-cyan-500/30 transition-all duration-300"
              >
                🚀 Generar script del servidor
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Script generado */}
        {showScript && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            <div className="glass glass-topline rounded-3xl p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
                  Script completo · {versionInfo.label}
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyAll}
                    className={`text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      copied
                        ? "bg-emerald-500"
                        : "bg-sky-600 hover:bg-sky-700 hover:-translate-y-0.5"
                    }`}
                  >
                    {copied ? "✓ ¡Copiado!" : "📋 Copiar todo"}
                  </button>
                  <button
                    onClick={downloadScript}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                  >
                    💾 Descargar .rsc
                  </button>
                </div>
              </div>

              <pre className="code-block p-6 overflow-x-auto text-xs md:text-sm leading-relaxed whitespace-pre">
                {serverScript}
              </pre>

              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
                <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                  <span className="text-lg">📁</span> Pasos finales
                </h4>
                <ol className="text-yellow-700 dark:text-yellow-300 space-y-2 text-sm list-decimal list-inside">
                  <li>
                    <strong>Descarga el script</strong> con el botón <em>💾 Descargar .rsc</em> de arriba.
                  </li>
                  <li>
                    Abre <strong>Files</strong> en WinBox/WebFig y <strong>arrastra
                    el <code>.rsc</code></strong> dentro (o súbelo por FTP).
                  </li>
                  <li>
                    En la <strong>New Terminal</strong> ejecuta:
                    <pre className="mt-1 bg-yellow-100 dark:bg-yellow-950/50 rounded px-3 py-2 text-xs overflow-x-auto"><code>/import file-name=servidor-openvpn_{clientName || "cliente1"}.rsc</code></pre>
                    Esto es <strong>mucho más fiable</strong> que pegar el script: el router lee el archivo entero sin riesgo de que se desincronicen las llaves <code>{`{ }`}</code> al pegar.
                  </li>
                  <li>Espera a que termine de firmar los certificados (1-3 min). Al final verá <em>"Certificados firmados correctamente."</em> y <em>"Servidor OpenVPN activado correctamente."</em></li>
                  <li>
                    En <strong>Files</strong> descarga: <code>{caFileName}</code>,{" "}
                    <code>{clientName || "cliente1"}.crt</code> y{" "}
                    <code>{clientName || "cliente1"}.key</code>.
                    {usesSharedCa && (
                      <span className="block mt-1 text-xs">
                        (<code>ca-ovpn.crt</code> es la <strong>misma para todos los
                        usuarios</strong> de este router; el <code>.crt</code> y la{" "}
                        <code>.key</code> son propios de cada usuario.)
                      </span>
                    )}
                  </li>
                  <li>
                    Ve a la pestaña <strong>Cliente</strong> (ya tiene tus datos
                    cargados) y genera el archivo <code>.ovpn</code> con esos 3
                    archivos.
                  </li>
                </ol>
                <p className="mt-3 text-xs text-yellow-800 dark:text-yellow-200/80">
                  <strong>⚠️ Importante:</strong> Si decides pegar el script directamente (no recomendado),
                  hazlo de UNA SOLA VEZ con Ctrl+V — no por trozos — y solo si tu router es accesible por
                  consola estable. Pegar en sesiones SSH lentas o con copy-paste fragmentado puede dejar
                  el terminal atrapado en <code>{`{[{...`}</code> esperando llaves.
                </p>
              </div>

              {/* Credenciales creadas -> opción de terminar sesión */}
              {credentialsCreated && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="mt-6 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-600 rounded-2xl p-6 text-center"
                >
                  <div className="text-3xl mb-2">✅</div>
                  <h4 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-1">
                    Tus credenciales fueron creadas
                  </h4>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-5">
                    Tus datos ya están cargados en la pestaña <strong>Cliente</strong>.
                    Puedes <strong>añadir otro usuario</strong> al mismo servidor (no
                    afecta a los ya creados), ir a generar el <code>.ovpn</code>, o
                    cerrar la sesión.
                  </p>
                  <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
                    <Link
                      to="/configuracion"
                      className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all"
                    >
                      ⚙️ Ir a generar el .ovpn (Cliente)
                    </Link>
                    <button
                      onClick={handleNewUser}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all"
                    >
                      ➕ Crear otro usuario (mismo servidor)
                    </button>
                    <button
                      onClick={handleEndSession}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-500/30 transition-all"
                    >
                      🔚 Terminar sesión y empezar una nueva
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
      {label}
    </label>
    {children}
    {hint && (
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-snug">
        {hint}
      </p>
    )}
  </div>
);

export default CertificateSection;

// 📁 src/components/CertificateSection.jsx
// Genera el script .rsc COMPLETO para convertir un MikroTik en servidor OpenVPN.
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { generateServerScript } from "../utils/mikrotikGenerator";

const VERSIONS = [
  {
    id: "v6",
    icon: "📟",
    label: "RouterOS 6",
    desc: "RouterOS 6.x — solo protocolo TCP y cifrados clásicos (sin sufijo).",
  },
  {
    id: "v7",
    icon: "🚀",
    label: "RouterOS 7",
    desc: "RouterOS 7.x — un único script válido desde la 7.0 hasta la 7.15+ (se autoadapta).",
  },
];

const CertificateSection = () => {
  const [selectedVersion, setSelectedVersion] = useState("v7");
  const [clientName, setClientName] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [caCrlHost, setCaCrlHost] = useState("");
  const [port, setPort] = useState("1194");
  const [protocol, setProtocol] = useState("udp");
  const [showScript, setShowScript] = useState(false);
  const [copied, setCopied] = useState(false);

  const versionInfo = VERSIONS.find((v) => v.id === selectedVersion);
  const isV6 = selectedVersion === "v6";

  // El script se recalcula automaticamente cuando cambia cualquier dato.
  const serverScript = useMemo(
    () =>
      generateServerScript({
        routerVersion: selectedVersion,
        publicIp: caCrlHost || "<IP_PUBLICA_DEL_SERVIDOR>",
        port: port || "1194",
        proto: isV6 ? "tcp" : protocol,
        clientName: clientName || "cliente1",
        clientPassword: clientPassword || "<CLAVE_DEL_CLIENTE>",
      }),
    [selectedVersion, caCrlHost, port, protocol, clientName, clientPassword, isV6]
  );

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

    setShowScript(true);
    Swal.fire({
      title: "¡Script generado! 🎉",
      text: `El script completo del servidor para ${clientName} está listo abajo.`,
      icon: "success",
      iconColor: "#10B981",
      background: "#F9FAFB",
      showConfirmButton: false,
      timer: 1600,
      timerProgressBar: true,
      customClass: { popup: "rounded-2xl shadow-2xl", title: "text-xl font-bold" },
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
                <Field label="Nombre del cliente VPN:">
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value.replace(/\s/g, ""))}
                    className="input-vpn"
                    placeholder="Ej: usuario01"
                    required
                  />
                </Field>
                <Field label="Contraseña del cliente (mín. 8):">
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
                <Field label="IP pública del servidor:">
                  <input
                    type="text"
                    value={caCrlHost}
                    onChange={(e) => setCaCrlHost(e.target.value)}
                    className="input-vpn"
                    placeholder="Ej: 181.188.203.190"
                    required
                  />
                </Field>
                <Field label="Puerto OpenVPN:">
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
                <Field label="Protocolo:">
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
                <ol className="text-yellow-700 dark:text-yellow-300 space-y-1 text-sm list-decimal list-inside">
                  <li>Pega el script en la <strong>New Terminal</strong> del MikroTik.</li>
                  <li>Espera a que termine de firmar los certificados (1-2 min).</li>
                  <li>
                    Abre <strong>Files</strong> y descarga: <code>ca.crt</code>,{" "}
                    <code>{clientName || "cliente1"}.crt</code> y{" "}
                    <code>{clientName || "cliente1"}.key</code>.
                  </li>
                  <li>
                    Ve a la pestaña <strong>Configurar</strong> y genera el archivo{" "}
                    <code>.ovpn</code> con esos 3 archivos.
                  </li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
      {label}
    </label>
    {children}
  </div>
);

export default CertificateSection;

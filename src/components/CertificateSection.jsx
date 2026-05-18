// 📁 src/components/CertificateSection.jsx
// Genera el script .rsc COMPLETO para convertir un MikroTik en servidor OpenVPN.
import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { generateServerScript } from "../utils/mikrotikGenerator";

const VERSIONS = [
  { id: "v6", icon: "📟", label: "v6 (Legacy)", desc: "RouterOS 6 — solo TCP, sintaxis 'set'." },
  { id: "v7", icon: "🚀", label: "v7 (6.15 - 7.14)", desc: "RouterOS 7 — UDP/TCP, sintaxis 'set'." },
  { id: "v7_modern", icon: "🎯", label: "v7.15+", desc: "RouterOS 7.15+ — UDP/TCP, sintaxis 'add'." },
];

const CertificateSection = () => {
  const [selectedVersion, setSelectedVersion] = useState("v7_modern");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>
      <div className="absolute inset-0 overflow-hidden dark:hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-100 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6">
            Servidor{" "}
            <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
              OpenVPN
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-green-200 max-w-3xl mx-auto">
            Genera el script completo que convierte tu MikroTik en servidor VPN:
            certificados, usuario, firewall y NAT — todo en un solo paso.
          </p>
        </motion.div>

        {/* Selector de versión */}
        <motion.div
          className="flex flex-wrap justify-center gap-2 mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-gray-200 dark:border-white/20 flex flex-wrap gap-2 justify-center">
            {VERSIONS.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVersion(v.id)}
                className={`px-5 py-3 rounded-xl font-bold text-sm md:text-base transition-all duration-300 ${
                  selectedVersion === v.id
                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                    : "text-gray-600 dark:text-green-100 hover:bg-green-50 dark:hover:bg-white/10"
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
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="max-w-4xl mx-auto mb-10"
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
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
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-300"
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
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  Script completo — {versionInfo.label}
                </h3>
                <div className="flex gap-3">
                  <button
                    onClick={copyAll}
                    className={`text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                      copied
                        ? "bg-emerald-600 hover:bg-emerald-600"
                        : "bg-blue-600 hover:bg-blue-700"
                    }`}
                  >
                    {copied ? "✓ ¡Copiado!" : "📋 Copiar todo"}
                  </button>
                  <button
                    onClick={downloadScript}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    💾 Descargar .rsc
                  </button>
                </div>
              </div>

              <pre className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-x-auto text-xs md:text-sm border-2 border-gray-700 leading-relaxed whitespace-pre">
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
    <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
      {label}
    </label>
    {children}
  </div>
);

export default CertificateSection;

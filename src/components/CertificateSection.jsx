// 📁src/components/CertificateSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";

const CertificateSection = () => {
  const [selectedVersion, setSelectedVersion] = useState("v7_modern");
  const [clientName, setClientName] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [caCrlHost, setCaCrlHost] = useState("");
  const [port, setPort] = useState("11977");
  const [protocol, setProtocol] = useState("udp");
  const [showCommands, setShowCommands] = useState(false);

  const showSuccessAlert = () => {
    Swal.fire({
      title: "¡Configuración Generada! 🎉",
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">
            Se han generado los comandos para <strong>${clientName}</strong> correctamente.
          </p>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 class="font-semibold text-green-800 mb-2">📋 Archivos que se generarán:</h4>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• <strong>ca.crt</strong> - Certificado de la Autoridad</li>
              <li>• <strong>${clientName}.crt</strong> - Certificado del cliente</li>
              <li>• <strong>${clientName}.key</strong> - Llave privada</li>
            </ul>
          </div>
        </div>
      `,
      icon: "success",
      iconColor: "#10B981",
      background: "#F9FAFB",
      confirmButtonColor: "#10B981",
      confirmButtonText: "¡Entendido!",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-2xl font-bold",
      },
    });
  };

  const showCopyAlert = () => {
    Swal.fire({
      title: "📋 ¡Copiado!",
      text: "Comando copiado al portapapeles",
      icon: "success",
      iconColor: "#3B82F6",
      background: "#F9FAFB",
      confirmButtonColor: "#3B82F6",
      confirmButtonText: "OK",
      timer: 1500,
      timerProgressBar: true,
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    });
  };

  const showErrorAlert = () => {
    Swal.fire({
      title: "⚠️ Datos Incompletos",
      text: "Por favor completa todos los campos requeridos",
      icon: "warning",
      iconColor: "#F59E0B",
      background: "#F9FAFB",
      confirmButtonColor: "#F59E0B",
      confirmButtonText: "Entendido",
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    });
  };

  const handleGenerateCommands = (e) => {
    e.preventDefault();
    if (
      clientName &&
      clientPassword &&
      clientPassword.length >= 8 &&
      caCrlHost &&
      port
    ) {
      setShowCommands(true);
      showSuccessAlert();
    } else {
      showErrorAlert();
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showCopyAlert();
  };

  // Comandos base (iguales para todas las versiones)
  const caCommands = `/certificate
add name=ca common-name=ca key-usage=key-cert-sign,crl-sign days-valid=3065
add name=server common-name=server`;

  const signCommands = `/certificate
sign ca ca-crl-host=${caCrlHost} name=ca
sign server ca=ca name=server`;

  const trustCommands = `/certificate
set ca trusted=yes
set server trusted=yes`;

  const clientCertCommands = `/certificate
add name=${clientName} common-name=${clientName}`;

  const signClientCommands = `sign ${clientName} ca=ca name=${clientName}`;

  const exportCommands = `/certificate export-certificate ca
/certificate export-certificate ${clientName} export-passphrase=${clientPassword}`;

  // ✅ COMANDOS OPENVPN CORREGIDOS SEGÚN VERSIÓN REAL
  const getOvpnServerCommands = () => {
    if (selectedVersion === "v6") {
      // RouterOS v6 - Solo TCP, configuración extendida (sin parámetro protocol)
      return `/interface ovpn-server server
set auth=sha1,md5 certificate=server \\
cipher=blowfish128,aes128,aes192,aes256 default-profile=default \\
enabled=yes keepalive-timeout=disabled max-mtu=1500 mode=ip netmask=29 \\
port=${port} require-client-certificate=yes`;
    } else if (selectedVersion === "v7") {
      // RouterOS v7 (6.15-7.14) - Protocolo configurable
      return `/interface ovpn-server server
set certificate=server cipher=blowfish128,aes128-cbc,aes192-cbc,aes256-cbc,aes128-gcm,aes192-gcm,aes256-gcm enabled=yes protocol=${protocol} require-client-certificate=yes port=${port}`;
    } else {
      // RouterOS v7.15+ - Sintaxis moderna con "add"
      return `/interface ovpn-server server
add certificate=server disabled=no name=ovpn-server1 port=${port} protocol=${protocol} require-client-certificate=yes`;
    }
  };

  const ovpnServerCommands = getOvpnServerCommands();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 transition-colors duration-300">
      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
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
          className="text-center mb-16"
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6">
            Gestión de{" "}
            <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text">
              Certificados
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-green-200 max-w-3xl mx-auto">
            Configuración correcta para cada versión de RouterOS
          </p>
        </motion.div>

        {/* Selector de Versión Mejorado */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-gray-200 dark:border-white/20">
            <button
              onClick={() => setSelectedVersion("v6")}
              className={`px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 ${
                selectedVersion === "v6"
                  ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-amber-100 hover:bg-amber-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="flex items-center">
                <span className="mr-2">📟</span>
                v6 (Legacy)
              </span>
            </button>
            <button
              onClick={() => setSelectedVersion("v7")}
              className={`px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 ${
                selectedVersion === "v7"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-blue-100 hover:bg-blue-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="flex items-center">
                <span className="mr-2">🚀</span>
                v7 (6.15-7.14)
              </span>
            </button>
            <button
              onClick={() => setSelectedVersion("v7_modern")}
              className={`px-6 py-3 rounded-xl font-bold text-base transition-all duration-300 ${
                selectedVersion === "v7_modern"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-green-100 hover:bg-green-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="flex items-center">
                <span className="mr-2">🎯</span>
                v7.15+
              </span>
            </button>
          </div>
        </motion.div>

        {/* Formulario Mejorado */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
              Configuración OpenVPN
            </h2>

            <form onSubmit={handleGenerateCommands} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
                    Nombre del Cliente:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="Ej: usuario01"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
                    Contraseña (min. 8 chars):
                  </label>
                  <input
                    type="password"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="Ej: MiClave123"
                    minLength="8"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
                    Puerto OpenVPN:
                  </label>
                  <input
                    type="number"
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="11977"
                    min="1024"
                    max="65535"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
                    Protocolo:
                  </label>
                  {selectedVersion === "v6" ? (
                    <div className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400">
                      TCP (Único disponible en v6)
                    </div>
                  ) : (
                    <select
                      value={protocol}
                      onChange={(e) => setProtocol(e.target.value)}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
                    >
                      <option value="udp">UDP (Recomendado)</option>
                      <option value="tcp">TCP</option>
                    </select>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-2">
                    Host CRL (IP Pública):
                  </label>
                  <input
                    type="text"
                    value={caCrlHost}
                    onChange={(e) => setCaCrlHost(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:ring-2 focus:ring-green-500 dark:text-white"
                    placeholder="181.188.203.190"
                    required
                  />
                </div>
              </div>

              {/* Información de Versión */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="flex items-start">
                  <div className="text-blue-500 text-lg mr-3">ℹ️</div>
                  <div>
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 mb-1">
                      {selectedVersion === "v6"
                        ? "RouterOS v6 (Legacy)"
                        : selectedVersion === "v7"
                        ? "RouterOS v7 (6.15-7.14)"
                        : "RouterOS v7.15+"}
                    </h4>
                    <p className="text-blue-700 dark:text-blue-400 text-sm">
                      {selectedVersion === "v6"
                        ? "Versión legacy - Solo TCP, configuración extendida con todos los parámetros."
                        : selectedVersion === "v7"
                        ? "Versión intermedia - Protocolo configurable (UDP/TCP), sintaxis con 'set'."
                        : "Versión moderna - Protocolo configurable (UDP/TCP), sintaxis con 'add'."}
                    </p>
                  </div>
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-300"
              >
                🚀 Generar Configuración
              </motion.button>
            </form>
          </div>
        </motion.div>

        {/* Comandos Generados */}
        {showCommands && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-4xl mx-auto space-y-8"
          >
            {/* Servidor */}
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                Configuración del Servidor -{" "}
                {selectedVersion === "v6"
                  ? "v6 (Legacy)"
                  : selectedVersion === "v7"
                  ? "v7 (6.15-7.14)"
                  : "v7.15+ (Moderno)"}
              </h3>

              <div className="space-y-6">
                {[
                  {
                    title: "1. Certificados CA y Server",
                    commands: caCommands,
                  },
                  {
                    title: "2. Sellado de Certificados",
                    commands: signCommands,
                  },
                  {
                    title: "3. Marcado como Confiables",
                    commands: trustCommands,
                  },
                  {
                    title: "4. Servidor OpenVPN",
                    commands: ovpnServerCommands,
                    note:
                      selectedVersion === "v6"
                        ? "v6: Solo TCP, configuración extendida"
                        : selectedVersion === "v7"
                        ? "v7: Sintaxis con 'set', protocolo " +
                          protocol.toUpperCase()
                        : "v7.15+: Sintaxis con 'add', protocolo " +
                          protocol.toUpperCase(),
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-700 dark:text-green-200">
                        {item.title}
                      </h4>
                      {item.note && (
                        <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                          {item.note}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <pre className="bg-gray-800 text-green-400 p-6 rounded-xl overflow-x-auto text-sm border-2 border-gray-700">
                        {item.commands}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(item.commands)}
                        className="absolute top-3 right-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300"
                      >
                        📋 Copiar
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Cliente */}
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
                Cliente: <span className="text-green-500">{clientName}</span>
              </h3>

              <div className="space-y-6">
                {[
                  {
                    title: "1. Certificado del Cliente",
                    commands: clientCertCommands,
                  },
                  {
                    title: "2. Sellado del Cliente",
                    commands: signClientCommands,
                  },
                  { title: "3. Exportación", commands: exportCommands },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h4 className="font-semibold text-gray-700 dark:text-green-200 mb-3">
                      {item.title}
                    </h4>
                    <div className="relative">
                      <pre className="bg-gray-800 text-green-400 p-6 rounded-xl overflow-x-auto text-sm border-2 border-gray-700">
                        {item.commands}
                      </pre>
                      <button
                        onClick={() => copyToClipboard(item.commands)}
                        className="absolute top-3 right-3 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors duration-300"
                      >
                        📋 Copiar
                      </button>
                    </div>
                  </motion.div>
                ))}

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
                    <span className="text-lg mr-2">📁</span>
                    Archivos Exportados:
                  </h4>
                  <ul className="text-yellow-700 dark:text-yellow-300 space-y-1">
                    <li>
                      • <strong>ca.crt</strong> - Certificado de la CA
                    </li>
                    <li>
                      • <strong>{clientName}.crt</strong> - Certificado del
                      cliente
                    </li>
                    <li>
                      • <strong>{clientName}.key</strong> - Llave privada
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CertificateSection;

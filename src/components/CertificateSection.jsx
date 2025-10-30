// 📁src/components/CertificateSection.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";

const CertificateSection = () => {
  const [selectedVersion, setSelectedVersion] = useState("v7");
  const [clientName, setClientName] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [caCrlHost, setCaCrlHost] = useState(""); // Valor por defecto
  const [showCommands, setShowCommands] = useState(false);

  const handleGenerateCommands = (e) => {
    e.preventDefault();
    if (
      clientName &&
      clientPassword &&
      clientPassword.length >= 8 &&
      caCrlHost
    ) {
      setShowCommands(true);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Puedes agregar un toast aquí si quieres
  };

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

  const ovpnServerCommands =
    selectedVersion === "v6"
      ? `/interface ovpn-server server
set auth=sha1,md5 certificate=server \\
cipher=blowfish128,aes128,aes192,aes256 default-profile=default \\
enabled=yes keepalive-timeout=disabled max-mtu=1500 mode=ip netmask=29 \\
port=11977 require-client-certificate=yes`
      : `/interface ovpn-server server
set certificate=server cipher=blowfish128,aes128-cbc,aes192-cbc,aes256-cbc,aes128-gcm,aes192-gcm,aes256-gcm enabled=yes protocol=udp require-client-certificate=yes port=11977`;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 transition-colors duration-300">
      {/* Elementos decorativos de fondo - Solo en modo oscuro */}
      <div className="absolute inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Elementos decorativos para modo claro */}
      <div className="absolute inset-0 overflow-hidden dark:hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-100 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-100 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-12 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
            className="inline-block mb-6"
          >
            <div className="bg-gradient-to-r from-green-500 to-emerald-400 dark:from-green-600 dark:to-emerald-500 p-4 rounded-2xl shadow-2xl">
              <div className="text-4xl">🔐</div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6 transition-colors duration-300">
            Gestión de{" "}
            <span className="text-transparent bg-gradient-to-r from-green-400 to-emerald-400 dark:from-green-300 dark:to-emerald-300 bg-clip-text">
              Certificados
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-green-200 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
            Genera y gestiona certificados SSL/TLS para tu servidor OpenVPN de
            forma segura y profesional
          </p>
        </motion.div>

        {/* Selector de Versión */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-gray-200 dark:border-white/20 transition-colors duration-300">
            <button
              onClick={() => setSelectedVersion("v6")}
              className={`px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden group ${
                selectedVersion === "v6"
                  ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-green-100 hover:text-green-600 dark:hover:text-white hover:bg-green-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="relative z-10 flex items-center">
                <span className="mr-3">🚀</span>
                RouterOS v6
              </span>
              {selectedVersion === "v6" && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>
            <button
              onClick={() => setSelectedVersion("v7")}
              className={`px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden group ${
                selectedVersion === "v7"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-emerald-100 hover:text-emerald-600 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="relative z-10 flex items-center">
                <span className="mr-3">⚡</span>
                RouterOS v7
              </span>
              {selectedVersion === "v7" && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>
          </div>
        </motion.div>

        {/* Formulario para Generar Certificados */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="max-w-4xl mx-auto mb-12"
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-white/20 transition-colors duration-300">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center transition-colors duration-300">
              Generar Certificado para{" "}
              <span className="text-transparent bg-gradient-to-r from-emerald-400 to-green-400 dark:from-emerald-300 dark:to-green-300 bg-clip-text">
                Cliente
              </span>
            </h2>

            <form onSubmit={handleGenerateCommands} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-3 transition-colors duration-300">
                    Nombre del Cliente:
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white transition-all duration-300"
                    placeholder="Ej: User1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-3 transition-colors duration-300">
                    Contraseña (mínimo 8 caracteres):
                  </label>
                  <input
                    type="password"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white transition-all duration-300"
                    placeholder="Ej: user123"
                    minLength="8"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-green-200 mb-3 transition-colors duration-300">
                    Host CRL (IP o Dominio):
                  </label>
                  <input
                    type="text"
                    value={caCrlHost}
                    onChange={(e) => setCaCrlHost(e.target.value)}
                    className="w-full px-4 py-3 bg-white/50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent dark:text-white transition-all duration-300"
                    placeholder="Ej: 181.188.203.190"
                    required
                  />
                </div>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg transition-all duration-300"
              >
                🚀 Generar Comandos de Certificado
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
            className="space-y-8 max-w-6xl mx-auto"
          >
            {/* Comandos del Servidor */}
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20 transition-colors duration-300">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors duration-300">
                Configuración del Servidor - RouterOS{" "}
                {selectedVersion.toUpperCase()}
              </h3>

              <div className="space-y-6">
                {[
                  {
                    title: "1. Creación de Certificados CA y Servidor",
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
                    title: "4. Configuración Servidor OpenVPN",
                    commands: ovpnServerCommands,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h4 className="font-semibold text-gray-700 dark:text-green-200 mb-3 transition-colors duration-300">
                      {item.title}
                    </h4>
                    <div className="relative">
                      <pre className="bg-gray-800 text-green-400 p-6 rounded-xl overflow-x-auto text-sm border-2 border-gray-700 dark:border-green-900/50">
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

            {/* Comandos del Cliente */}
            <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-white/20 transition-colors duration-300">
              <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors duration-300">
                Configuración para Cliente:{" "}
                <span className="text-green-500">{clientName}</span>
              </h3>

              <div className="space-y-6">
                {[
                  {
                    title: "1. Creación de Certificado del Cliente",
                    commands: clientCertCommands,
                  },
                  {
                    title: "2. Sellado del Certificado del Cliente",
                    commands: signClientCommands,
                  },
                  {
                    title: "3. Exportación de Certificados",
                    commands: exportCommands,
                  },
                ].map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <h4 className="font-semibold text-gray-700 dark:text-green-200 mb-3 transition-colors duration-300">
                      {item.title}
                    </h4>
                    <div className="relative">
                      <pre className="bg-gray-800 text-green-400 p-6 rounded-xl overflow-x-auto text-sm border-2 border-gray-700 dark:border-green-900/50">
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

                {/* Archivos Generados */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6"
                >
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3 flex items-center">
                    <span className="text-lg mr-2">📁</span>
                    Archivos Generados:
                  </h4>
                  <ul className="list-disc list-inside space-y-2 text-yellow-700 dark:text-yellow-300">
                    <li>
                      <strong>ca.crt</strong> - Certificado de la Autoridad
                      Certificadora
                    </li>
                    <li>
                      <strong>{clientName}.crt</strong> - Certificado del
                      cliente
                    </li>
                    <li>
                      <strong>{clientName}.key</strong> - Llave privada del
                      cliente
                    </li>
                  </ul>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Información Adicional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-white/20 max-w-4xl mx-auto transition-colors duration-300"
        >
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center transition-colors duration-300">
            Información{" "}
            <span className="text-transparent bg-gradient-to-r from-emerald-400 to-green-400 dark:from-emerald-300 dark:to-green-300 bg-clip-text">
              Importante
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              className="text-center bg-white/50 dark:bg-white/5 rounded-2xl p-8 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 border border-gray-100 dark:border-white/10 hover:border-green-400/30 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🌐
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 group-hover:text-green-600 dark:group-hover:text-green-300 transition-colors duration-300">
                Host CRL
              </h3>
              <p className="text-gray-600 dark:text-green-200 leading-relaxed transition-colors duration-300">
                El <strong>ca-crl-host</strong> es la IP o dominio donde se
                publicará la lista de revocación de certificados. Usualmente es
                la IP pública de tu MikroTik.
              </p>
            </motion.div>
            <motion.div
              className="text-center bg-white/50 dark:bg-white/5 rounded-2xl p-8 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 border border-gray-100 dark:border-white/10 hover:border-emerald-400/30 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                🔒
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors duration-300">
                Seguridad
              </h3>
              <p className="text-gray-600 dark:text-green-200 leading-relaxed transition-colors duration-300">
                Los certificados CA y Server solo se crean una vez por servidor.
                Mantén las claves privadas en un lugar seguro.
              </p>
            </motion.div>
          </div>

          {/* Línea decorativa */}
          <div className="flex justify-center mt-8">
            <div className="h-1 w-20 bg-gradient-to-r from-green-400 to-emerald-500 dark:from-green-300 dark:to-emerald-400 rounded-full"></div>
          </div>
        </motion.div>

        {/* Footer decorativo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 dark:text-green-300/70 text-sm transition-colors duration-300">
            Certificados Seguros • Encriptación TLS • Gestión Profesional
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default CertificateSection;

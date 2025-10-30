import React, { useState } from "react";
import { motion } from "framer-motion";

const Mikrotik7Form = () => {
  const [formData, setFormData] = useState({
    remote: "",
    username: "",
    password: "",
    port: "1194",
    proto: "TCP",
    auth: "SHA1",
    cipher: "AES-128-CBC",
    caCert: null,
    clientCert: null,
    clientKey: null,
  });

  const [downloadUrl, setDownloadUrl] = useState("");
  const [showDownload, setShowDownload] = useState(false);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id.replace("7", "")]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { id, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id.replace("7", "")]: files[0],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.caCert || !formData.clientCert || !formData.clientKey) {
      alert("Por favor, selecciona todos los archivos requeridos.");
      return;
    }

    try {
      const caCertText = await formData.caCert.text();
      const clientCertText = await formData.clientCert.text();
      const clientKeyText = await formData.clientKey.text();

      const outputOvpn = `client
dev tun
proto ${formData.proto.toLowerCase()}-client
persist-key
persist-tun
tls-client
remote-cert-tls server
verb 4
auth-nocache
mute 10
remote ${formData.remote}
port ${formData.port}
auth ${formData.auth}
cipher ${formData.cipher}
<auth-user-pass>
${formData.username}
${formData.password}
</auth-user-pass>
redirect-gateway def1
<ca>
${caCertText}
</ca>
<cert>
${clientCertText}
</cert>
<key>
${clientKeyText}
</key>
`;

      const blob = new Blob([outputOvpn], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setShowDownload(true);

      alert("¡Archivo OVPN generado exitosamente! Ya puedes descargarlo.");
    } catch (error) {
      console.error("Error:", error);
      alert(
        "Ocurrió un error al generar el archivo. Por favor, verifica los archivos."
      );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-600/30 overflow-hidden transition-colors duration-300"
    >
      <div className="bg-gradient-to-r from-purple-600 to-pink-500 p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent transform -skew-x-12"></div>
        <h2 className="text-2xl font-bold text-white text-center relative z-10">
          ⚡ Configuración OVPN Mikrotik 7
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna 1: Configuración básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-pink-500 rounded-full mr-2"></span>
              Configuración Básica
            </h3>

            <FormField
              id="remote7"
              label="IP del Servidor:"
              type="text"
              placeholder="192.168.1.1"
              value={formData.remote}
              onChange={handleInputChange}
              required
            />

            <FormField
              id="username7"
              label="Usuario:"
              type="text"
              placeholder="nombre_usuario"
              value={formData.username}
              onChange={handleInputChange}
              required
            />

            <FormField
              id="password7"
              label="Contraseña:"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="port7"
                label="Puerto:"
                type="number"
                placeholder="1194"
                value={formData.port}
                onChange={handleInputChange}
                min="1"
                max="65535"
                required
              />

              <SelectField
                id="proto7"
                label="Protocolo:"
                value={formData.proto}
                onChange={handleInputChange}
                options={[
                  { value: "TCP", label: "TCP" },
                  { value: "UDP", label: "UDP" },
                ]}
                required
              />
            </div>
          </div>

          {/* Columna 2: Seguridad y archivos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>
              Seguridad y Certificados
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="auth7"
                label="Autenticación:"
                value={formData.auth}
                onChange={handleInputChange}
                options={[
                  { value: "SHA1", label: "SHA-1" },
                  { value: "MD5", label: "MD5" },
                  { value: "SHA256", label: "SHA-256" },
                  { value: "None", label: "None" },
                ]}
                required
              />

              <SelectField
                id="cipher7"
                label="Cifrado:"
                value={formData.cipher}
                onChange={handleInputChange}
                options={[
                  { value: "AES-128-CBC", label: "AES-128-CBC" },
                  { value: "AES-192-CBC", label: "AES-192-CBC" },
                  { value: "AES-256-CBC", label: "AES-256-CBC" },
                ]}
                required
              />
            </div>

            <div className="space-y-3">
              <FileField
                id="caCert7"
                label="Certificado CA"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
              />

              <FileField
                id="clientCert7"
                label="Certificado Cliente"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
              />

              <FileField
                id="clientKey7"
                label="Llave Cliente"
                accept=".key"
                onChange={handleFileChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="submit"
              className="group relative bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center min-w-[200px] justify-center"
            >
              <span className="relative z-10 flex items-center">
                🚀 Generar OVPN
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            {showDownload && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 max-w-md"
              >
                <a
                  href={downloadUrl}
                  download={`${formData.username}_mikrotik7_config.ovpn`}
                  className="group relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center w-full"
                  onClick={() => {
                    setTimeout(() => {
                      setShowDownload(false);
                      setFormData({
                        remote: "",
                        username: "",
                        password: "",
                        port: "1194",
                        proto: "TCP",
                        auth: "SHA1",
                        cipher: "AES-128-CBC",
                        caCert: null,
                        clientCert: null,
                        clientKey: null,
                      });
                    }, 1000);
                  }}
                >
                  <span className="relative z-10 flex items-center">
                    📥 Descargar Configuración
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </a>
              </motion.div>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
};

// Componentes auxiliares reutilizables
const FormField = ({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  required,
  min,
  max,
}) => (
  <div className="flex flex-col space-y-2">
    <label
      htmlFor={id}
      className="font-semibold text-gray-700 dark:text-white text-sm transition-colors duration-300"
    >
      {label}
    </label>
    <input
      type={type}
      id={id}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      min={min}
      max={max}
      className="w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 backdrop-blur-sm"
    />
  </div>
);

const SelectField = ({ id, label, value, onChange, options, required }) => (
  <div className="flex flex-col space-y-2">
    <label
      htmlFor={id}
      className="font-semibold text-gray-700 dark:text-white text-sm transition-colors duration-300"
    >
      {label}
    </label>
    <select
      id={id}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 text-gray-800 dark:text-white backdrop-blur-sm"
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
        >
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const FileField = ({ id, label, accept, onChange, required }) => (
  <div className="flex flex-col space-y-2">
    <label
      htmlFor={id}
      className="font-semibold text-gray-700 dark:text-white text-sm transition-colors duration-300"
    >
      {label}
    </label>
    <input
      type="file"
      id={id}
      accept={accept}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-3 bg-white dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300 text-gray-800 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-pink-500/20 file:text-pink-700 dark:file:bg-pink-500/30 dark:file:text-pink-300 hover:file:bg-pink-500/30 backdrop-blur-sm"
    />
  </div>
);

export default Mikrotik7Form;

import React, { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { generateOvpnFile, generateClientRouterScript } from "../utils/mikrotikGenerator";

const Mikrotik6Form = () => {
  const [formData, setFormData] = useState({
    remote: "",
    username: "",
    password: "",
    port: "1194",
    auth: "SHA1",
    cipher: "AES-128-CBC",
    caCert: null,
    clientCert: null,
    clientKey: null,
  });

  const [downloadUrl, setDownloadUrl] = useState("");
  const [showDownload, setShowDownload] = useState(false);
  const [rscUrl, setRscUrl] = useState("");

  const showSuccessAlert = () => {
    Swal.fire({
      title: "¡Archivo OVPN Generado! 🎉",
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">
            La configuración para <strong>${formData.username}</strong> se ha generado exitosamente.
          </p>
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 class="font-semibold text-green-800 mb-2">📋 Configuración:</h4>
            <ul class="text-green-700 text-sm space-y-1">
              <li>• Servidor: <strong>${formData.remote}</strong></li>
              <li>• Puerto: <strong>${formData.port}</strong></li>
              <li>• Protocolo: <strong>TCP</strong> (v6 solo TCP)</li>
              <li>• Cifrado: <strong>${formData.cipher}</strong></li>
            </ul>
          </div>
        </div>
      `,
      icon: "success",
      iconColor: "#10B981",
      background: "#F9FAFB",
      showConfirmButton: false,
      timer: 1800,
      timerProgressBar: true,
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-2xl font-bold",
      },
    });
  };

  const showErrorAlert = (message) => {
    Swal.fire({
      title: "⚠️ Error",
      text: message,
      icon: "error",
      iconColor: "#EF4444",
      background: "#F9FAFB",
      confirmButtonColor: "#EF4444",
      confirmButtonText: "Entendido",
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    });
  };

  const showMissingFilesAlert = () => {
    Swal.fire({
      title: "📁 Archivos Requeridos",
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-4">
            Por favor, selecciona todos los archivos de certificados requeridos:
          </p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <ul class="text-yellow-700 text-sm space-y-2">
              <li>• 📄 <strong>Certificado CA</strong> (.crt)</li>
              <li>• 📄 <strong>Certificado Cliente</strong> (.crt)</li>
              <li>• 🔑 <strong>Llave Cliente</strong> (.key)</li>
            </ul>
          </div>
        </div>
      `,
      icon: "warning",
      iconColor: "#F59E0B",
      background: "#F9FAFB",
      confirmButtonColor: "#F59E0B",
      confirmButtonText: "Seleccionar Archivos",
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    });
  };

  const showDownloadSuccessAlert = () => {
    Swal.fire({
      title: "📥 ¡Descarga Exitosa!",
      text: "La configuración OVPN se ha descargado correctamente",
      icon: "success",
      iconColor: "#3B82F6",
      background: "#F9FAFB",
      confirmButtonColor: "#3B82F6",
      confirmButtonText: "OK",
      timer: 2000,
      timerProgressBar: true,
      customClass: {
        popup: "rounded-2xl shadow-xl",
      },
    });
  };

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleFileChange = (e) => {
    const { id, files } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: files[0],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.caCert || !formData.clientCert || !formData.clientKey) {
      showMissingFilesAlert();
      return;
    }

    try {
      const caCertText = await formData.caCert.text();
      const clientCertText = await formData.clientCert.text();
      const clientKeyText = await formData.clientKey.text();

      const outputOvpn = generateOvpnFile({
        version: 6,
        remote: formData.remote,
        port: formData.port,
        proto: "tcp", // RouterOS 6 solo soporta TCP
        username: formData.username,
        password: formData.password,
        auth: formData.auth,
        cipher: formData.cipher,
        caCert: caCertText,
        clientCert: clientCertText,
        clientKey: clientKeyText,
      });

      const blob = new Blob([outputOvpn], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      // Script .rsc para usar otro MikroTik como cliente (site-to-site)
      const rscText = generateClientRouterScript({
        version: 6,
        remote: formData.remote,
        port: formData.port,
        proto: "tcp",
        username: formData.username,
        password: formData.password,
        auth: formData.auth,
        cipher: formData.cipher,
      });

      setShowDownload(true);
      setRscUrl(URL.createObjectURL(new Blob([rscText], { type: "text/plain" })));

      showSuccessAlert();
    } catch (error) {
      console.error("Error:", error);
      showErrorAlert(
        "Ocurrió un error al generar el archivo. Por favor, verifica los archivos."
      );
    }
  };

  const handleDownload = () => {
    showDownloadSuccessAlert();

    // Limpiar el formulario después de un breve delay
    setTimeout(() => {
      setShowDownload(false);
      setFormData({
        remote: "",
        username: "",
        password: "",
        port: "1194",
        auth: "SHA1",
        cipher: "AES-128-CBC",
        caCert: null,
        clientCert: null,
        clientKey: null,
      });

      // También limpiar los inputs de archivos
      const fileInputs = document.querySelectorAll('input[type="file"]');
      fileInputs.forEach((input) => {
        input.value = "";
      });
    }, 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass rounded-3xl overflow-hidden"
    >
      <div className="bg-gradient-to-r from-sky-600 to-cyan-500 p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent -skew-x-12"></div>
        <h2 className="text-2xl font-bold text-white text-center relative z-10">
          📟 Configuración OVPN · MikroTik 6
        </h2>
        <p className="text-center text-sky-100 text-sm mt-1 relative z-10">
          RouterOS 6 · protocolo TCP
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna 1: Configuración básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-cyan-500 rounded-full mr-2"></span>
              Configuración Básica
            </h3>

            <FormField
              id="remote"
              label="IP del Servidor Mikrotik:"
              type="text"
              placeholder="192.168.1.1"
              value={formData.remote}
              onChange={handleInputChange}
              required
            />

            <FormField
              id="username"
              label="Usuario PPP:"
              type="text"
              placeholder="nombre_usuario"
              value={formData.username}
              onChange={handleInputChange}
              required
            />

            <FormField
              id="password"
              label="Contraseña PPP:"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                id="port"
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
                id="auth"
                label="Autenticación:"
                value={formData.auth}
                onChange={handleInputChange}
                options={[
                  { value: "SHA1", label: "SHA-1" },
                  { value: "MD5", label: "MD5" },
                  { value: "None", label: "None" },
                ]}
                required
              />
            </div>
          </div>

          {/* Columna 2: Seguridad y archivos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Seguridad y Certificados
            </h3>

            <SelectField
              id="cipher"
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

            <div className="space-y-3">
              <FileField
                id="caCert"
                label="Certificado CA"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
              />

              <FileField
                id="clientCert"
                label="Certificado Cliente"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
              />

              <FileField
                id="clientKey"
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
              className="group relative bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center min-w-[200px] justify-center"
            >
              <span className="relative z-10 flex items-center">
                ⚡ Generar OVPN
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
            </button>

            {showDownload && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 max-w-md"
              >
                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={downloadUrl}
                    download={`${formData.username}_mikrotik6_config.ovpn`}
                    className="group relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center w-full"
                    onClick={handleDownload}
                  >
                    <span className="relative z-10 flex items-center">📥 Descargar OVPN</span>
                  </a>

                  <a
                    href={rscUrl}
                    download={`${formData.username}_mikrotik6_router-cliente.rsc`}
                    className="group relative bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center w-full"
                    title="Script para conectar otro MikroTik como cliente VPN (site-to-site)"
                  >
                    <span className="relative z-10 flex items-center">🛠️ Script Router Cliente (.rsc)</span>
                  </a>
                </div>
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
      className="input-vpn"
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
      className="input-vpn"
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
      className="input-vpn cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-sky-500/15 file:text-sky-700 dark:file:text-sky-300 file:cursor-pointer hover:file:bg-sky-500/25"
    />
  </div>
);

export default Mikrotik6Form;

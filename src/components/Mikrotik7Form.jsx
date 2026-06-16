import React, { useState } from "react";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { generateOvpnFile } from "../utils/mikrotikGenerator";
import { useSession } from "../context/SessionContext";

const Mikrotik7Form = () => {
  const { session, endSession } = useSession();

  // Precargamos los campos con los datos de la sesión (los que se rellenaron al
  // crear el servidor): IP pública, usuario, contraseña, puerto y protocolo.
  const [formData, setFormData] = useState({
    remote: session.publicIp || "",
    username: session.clientName || "",
    password: session.clientPassword || "",
    port: session.port || "1194",
    proto: (session.protocol || "udp").toUpperCase(),
    auth: "SHA256",
    // CBC por defecto: RouterOS 7.17+ tiene un bug con AES-256-GCM que rompe el
    // handshake ("cipher final failed"). CBC funciona en TCP y UDP de forma fiable.
    cipher: "AES-256-CBC",
    caCert: null,
    clientCert: null,
    clientKey: null,
  });

  const [downloadUrl, setDownloadUrl] = useState("");
  const [showDownload, setShowDownload] = useState(false);

  const showSuccessAlert = () => {
    Swal.fire({
      icon: "success",
      title: `OVPN listo para ${formData.username}`,
      text: "Descárgalo con el botón verde. La sesión sigue activa.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 3000,
      timerProgressBar: true,
      background: "#F9FAFB",
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
      icon: "success",
      title: "Descarga iniciada",
      text: "Cuando termines, pulsa 'Terminar sesión' para empezar otra.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
      background: "#F9FAFB",
    });
  };

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
      showMissingFilesAlert();
      return;
    }

    try {
      const caCertText = await formData.caCert.text();
      const clientCertText = await formData.clientCert.text();
      const clientKeyText = await formData.clientKey.text();

      const outputOvpn = generateOvpnFile({
        version: 7,
        remote: formData.remote,
        port: formData.port,
        proto: formData.proto,
        username: formData.username,
        password: formData.password,
        auth: formData.auth,
        cipher: formData.cipher,
        caCert: caCertText,
        clientCert: clientCertText,
        clientKey: clientKeyText,
        // DNS que usara el cliente al tunelizar todo el trafico (el servidor
        // MikroTik no envia DNS por su cuenta). Viene de la sesion del servidor.
        dns: session.dns || undefined,
      });

      const blob = new Blob([outputOvpn], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);

      setShowDownload(true);

      showSuccessAlert();
    } catch (error) {
      console.error("Error:", error);
      showErrorAlert(
        "Ocurrió un error al generar el archivo. Por favor, verifica los archivos."
      );
    }
  };

  const handleDownload = () => {
    // Solo confirmamos la descarga con un toast discreto.
    // NO reseteamos nada: la sesión termina cuando el usuario lo decida.
    showDownloadSuccessAlert();
  };

  // El usuario decide cuándo cerrar la sesión: aquí limpiamos todo y dejamos
  // el formulario listo para una nueva configuración desde cero.
  const handleEndSession = () => {
    endSession();
    setShowDownload(false);
    setDownloadUrl("");
    setFormData({
      remote: "",
      username: "",
      password: "",
      port: "1194",
      proto: "UDP",
      auth: "SHA256",
      cipher: "AES-256-GCM",
      caCert: null,
      clientCert: null,
      clientKey: null,
    });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    fileInputs.forEach((input) => {
      input.value = "";
    });
    Swal.fire({
      icon: "success",
      title: "Sesión finalizada",
      text: "Puedes empezar una nueva configuración cuando quieras.",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 2000,
      timerProgressBar: true,
      background: "#F9FAFB",
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="glass rounded-3xl overflow-hidden"
    >
      <div className="bg-gradient-to-r from-indigo-600 to-sky-500 p-7 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-white/15 to-transparent -skew-x-12"></div>
        <h2 className="text-2xl font-bold text-white text-center relative z-10">
          🚀 Configuración OVPN · MikroTik 7
        </h2>
        <p className="text-center text-indigo-100 text-sm mt-1 relative z-10">
          RouterOS 7 · UDP/TCP · cifrado GCM
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Columna 1: Configuración básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-indigo-500 rounded-full mr-2"></span>
              Configuración Básica
            </h3>

            <FormField
              id="remote7"
              label="IP del Servidor Mikrotik:"
              type="text"
              placeholder="192.168.1.1"
              value={formData.remote}
              onChange={handleInputChange}
              required
              hint="IP pública o dominio del MikroTik servidor (la misma que pusiste al generar el script del servidor). Es el destino al que se conecta el cliente."
            />

            <FormField
              id="username7"
              label="Usuario PPP:"
              type="text"
              placeholder="nombre_usuario"
              value={formData.username}
              onChange={handleInputChange}
              required
              hint="Nombre del usuario VPN creado en el servidor (/ppp secret). Debe coincidir exactamente con el del script del servidor."
            />

            <FormField
              id="password7"
              label="Contraseña PPP:"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
              hint="Contraseña de ese usuario VPN. Debe ser idéntica a la definida en el servidor."
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
                hint="Mismo puerto del servidor (por defecto 1194)."
              />

              <SelectField
                id="proto7"
                label="Protocolo:"
                value={formData.proto}
                onChange={handleInputChange}
                options={[
                  { value: "UDP", label: "UDP" },
                  { value: "TCP", label: "TCP" },
                ]}
                required
                hint="El mismo que elegiste en el servidor. UDP es lo recomendado."
              />
            </div>
          </div>

          {/* Columna 2: Seguridad y archivos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center transition-colors duration-300">
              <span className="w-2 h-2 bg-sky-500 rounded-full mr-2"></span>
              Seguridad y Certificados
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <SelectField
                id="auth7"
                label="Autenticación:"
                value={formData.auth}
                onChange={handleInputChange}
                options={[
                  { value: "SHA256", label: "SHA-256 (recomendado)" },
                  { value: "SHA1", label: "SHA-1" },
                  { value: "MD5", label: "MD5" },
                ]}
                required
                hint="Algoritmo de autenticación HMAC. SHA-256 es lo recomendado en RouterOS 7."
              />

              <SelectField
                id="cipher7"
                label="Cifrado:"
                value={formData.cipher}
                onChange={handleInputChange}
                options={[
                  { value: "AES-256-GCM", label: "AES-256-GCM (recomendado)" },
                  { value: "AES-128-GCM", label: "AES-128-GCM" },
                  { value: "AES-256-CBC", label: "AES-256-CBC" },
                  { value: "AES-192-CBC", label: "AES-192-CBC" },
                  { value: "AES-128-CBC", label: "AES-128-CBC" },
                ]}
                required
                hint="Algoritmo de cifrado de los datos. GCM es más rápido y seguro (recomendado en RouterOS 7)."
              />
            </div>

            <div className="space-y-3">
              <FileField
                id="caCert7"
                label="Certificado CA"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
                hint="Archivo ca.crt descargado desde Files del MikroTik servidor."
              />

              <FileField
                id="clientCert7"
                label="Certificado Cliente"
                accept=".crt,.cer"
                onChange={handleFileChange}
                required
                hint="Archivo NOMBRE.crt del cliente (ej: usuario01.crt), exportado por el script del servidor."
              />

              <FileField
                id="clientKey7"
                label="Llave Cliente"
                accept=".key"
                onChange={handleFileChange}
                required
                hint="Archivo NOMBRE.key del cliente. Va cifrado con la contraseña del cliente; OpenVPN la pedirá al conectar."
              />
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10 transition-colors duration-300">
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              type="submit"
              className="group relative bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center min-w-[200px] justify-center"
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
                <div className="grid grid-cols-1 gap-3">
                  <a
                    href={downloadUrl}
                    download={`${formData.username}_mikrotik7_config.ovpn`}
                    className="group relative bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center w-full"
                    onClick={handleDownload}
                  >
                    <span className="relative z-10 flex items-center">📥 Descargar OVPN</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleEndSession}
                    className="bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 w-full"
                    title="Limpia el formulario y empieza una nueva configuración"
                  >
                    🔚 Terminar sesión y empezar otra
                  </button>
                </div>
              </motion.div>
            )}
          </div>
          {showDownload && (
            <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
              Puedes descargar el OVPN tantas veces como quieras. La sesión NO se
              cierra sola — solo se cierra cuando pulses "Terminar sesión".
            </p>
          )}
        </div>
      </form>
    </motion.div>
  );
};

// Componentes auxiliares reutilizables
const Hint = ({ children }) =>
  children ? (
    <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{children}</p>
  ) : null;

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
  hint,
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
    <Hint>{hint}</Hint>
  </div>
);

const SelectField = ({ id, label, value, onChange, options, required, hint }) => (
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
    <Hint>{hint}</Hint>
  </div>
);

const FileField = ({ id, label, accept, onChange, required, hint }) => (
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
      className="input-vpn cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/15 file:text-indigo-700 dark:file:text-indigo-300 file:cursor-pointer hover:file:bg-indigo-500/25"
    />
    <Hint>{hint}</Hint>
  </div>
);

export default Mikrotik7Form;

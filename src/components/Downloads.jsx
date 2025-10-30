import React from "react";
import { motion } from "framer-motion";

const Downloads = () => {
  const downloads = [
    {
      image: "/img/icon/windows.png",
      title: "WINDOWS",
      description: "Descargar OpenVPN para Windows",
      link: "https://openvpn.net/downloads/openvpn-connect-v3-windows.msi",
    },
    {
      image: "/img/icon/mac.png",
      title: "MAC",
      description: "Descargar OpenVPN para Mac",
      link: "https://openvpn.net/downloads/openvpn-connect-v3-macos.dmg",
    },
    {
      image: "/img/icon/android.png",
      title: "ANDROID",
      description: "Descargar OpenVPN para Android",
      link: "https://play.google.com/store/apps/details?id=net.openvpn.openvpn",
    },
    {
      image: "/img/icon/ios.png",
      title: "iOS",
      description: "Descargar OpenVPN para iOS",
      link: "https://apps.apple.com/app/openvpn-connect/id590379981",
    },
    {
      image: "/img/icon/linux.png",
      title: "LINUX",
      description: "Descargar OpenVPN para Linux",
      link: "https://openvpn.net/downloads/openvpn-connect-v3-linux.tar.gz",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 pt-20 transition-colors duration-300">
      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/4 right-1/4 w-40 h-40 bg-orange-200 dark:bg-orange-500/10 rounded-full blur-3xl opacity-60"></div>
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
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-600 dark:to-cyan-500 p-4 rounded-2xl shadow-2xl border-2 border-orange-400/30">
              <div className="text-4xl">📥</div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6 transition-colors duration-300">
            Zona de{" "}
            <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-300 dark:to-cyan-300 bg-clip-text">
              Descarga
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
            Descarga OpenVPN Connect para tu sistema operativo y comienza a
            disfrutar de una conexión segura
          </p>
        </motion.div>

        {/* Cards de descarga */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {downloads.map((download, index) => (
            <motion.div
              key={download.title}
              className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-3xl p-6 shadow-2xl border border-gray-200 dark:border-gray-600/30 transition-all duration-300 hover:scale-105 group cursor-pointer"
              whileHover={{ scale: 1.05, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <div className="text-center">
                <div className="mb-4 flex justify-center">
                  <img
                    src={download.image}
                    alt={download.title}
                    className="w-20 h-20 object-contain group-hover:scale-110 transition-transform duration-300"
                  />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 transition-colors duration-300">
                  {download.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 transition-colors duration-300">
                  {download.description}
                </p>
                <a
                  href={download.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Descargar
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-white/20 max-w-4xl mx-auto transition-colors duration-300"
        >
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-6 text-center transition-colors duration-300">
            Instrucciones de Instalación
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white transition-colors duration-300">
                🪟 Windows & Mac
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2 transition-colors duration-300">
                <li>1. Ejecuta el archivo descargado</li>
                <li>2. Sigue el asistente de instalación</li>
                <li>3. Reinicia si es necesario</li>
                <li>4. Importa tu archivo .ovpn</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white transition-colors duration-300">
                📱 Móviles
              </h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2 transition-colors duration-300">
                <li>1. Instala desde la store</li>
                <li>2. Abre la aplicación</li>
                <li>3. Importa tu perfil .ovpn</li>
                <li>4. Conéctate y disfruta</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Downloads;

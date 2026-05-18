import React from "react";
import { motion } from "framer-motion";

const DOWNLOADS = [
  { image: "/img/icon/windows.png", title: "Windows", link: "https://openvpn.net/downloads/openvpn-connect-v3-windows.msi" },
  { image: "/img/icon/mac.png", title: "macOS", link: "https://openvpn.net/downloads/openvpn-connect-v3-macos.dmg" },
  { image: "/img/icon/android.png", title: "Android", link: "https://play.google.com/store/apps/details?id=net.openvpn.openvpn" },
  { image: "/img/icon/ios.png", title: "iOS", link: "https://apps.apple.com/app/openvpn-connect/id590379981" },
  { image: "/img/icon/linux.png", title: "Linux", link: "https://openvpn.net/downloads/openvpn-connect-v3-linux.tar.gz" },
];

const Downloads = () => {
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
          className="text-center mb-14"
        >
          <span className="eyebrow mb-5">📥 Apps OpenVPN Connect</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Zona de <span className="text-gradient">descargas</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Descarga el cliente OpenVPN para tu sistema operativo e importa el
            archivo <span className="font-semibold text-sky-600 dark:text-cyan-300">.ovpn</span>{" "}
            que generaste.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-5xl mx-auto">
          {DOWNLOADS.map((d, i) => (
            <motion.a
              key={d.title}
              href={d.link}
              target="_blank"
              rel="noopener noreferrer"
              className="glass glass-hover rounded-2xl p-6 flex flex-col items-center text-center group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <img
                src={d.image}
                alt={d.title}
                className="w-16 h-16 object-contain mb-3 group-hover:scale-110 transition-transform duration-300"
              />
              <h3 className="font-bold text-slate-800 dark:text-white mb-3">
                {d.title}
              </h3>
              <span className="mt-auto text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-cyan-500 px-4 py-2 rounded-lg shadow-md shadow-cyan-500/30">
                Descargar
              </span>
            </motion.a>
          ))}
        </div>

        {/* Instrucciones */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 glass glass-topline rounded-3xl p-8 md:p-10 max-w-4xl mx-auto"
        >
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-6 text-center">
            Cómo instalar
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                icon: "🖥️",
                title: "Windows y macOS",
                steps: [
                  "Ejecuta el archivo descargado",
                  "Sigue el asistente de instalación",
                  "Abre OpenVPN Connect",
                  "Importa tu archivo .ovpn",
                ],
              },
              {
                icon: "📱",
                title: "Android e iOS",
                steps: [
                  "Instala la app desde la store",
                  "Abre OpenVPN Connect",
                  "Pulsa Importar → desde archivo",
                  "Selecciona tu perfil .ovpn",
                ],
              },
            ].map((g) => (
              <div key={g.title} className="glass-soft rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-3">
                  {g.icon} {g.title}
                </h3>
                <ul className="space-y-2">
                  {g.steps.map((s, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <span className="flex items-center justify-center shrink-0 w-5 h-5 rounded-full bg-sky-500 text-white text-xs font-bold">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Downloads;

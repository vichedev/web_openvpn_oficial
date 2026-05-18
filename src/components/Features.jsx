import React from "react";
import { motion } from "framer-motion";

const FEATURES = [
  { icon: "⚡", title: "Alta Velocidad", description: "Conexiones ultrarrápidas con latencia mínima para una navegación fluida." },
  { icon: "🛡️", title: "Seguridad Máxima", description: "Cifrado AES y protocolos TLS que protegen tus datos y tu privacidad." },
  { icon: "🔧", title: "Fácil Configuración", description: "Interfaz intuitiva y generación automática: conectado en minutos." },
  { icon: "🌐", title: "Multiplataforma", description: "Compatible con Windows, Mac, Linux, Android, iOS y routers MikroTik." },
  { icon: "📊", title: "Monitoreo Real", description: "Comprueba el estado de la conexión y los clientes activos en todo momento." },
  { icon: "🚀", title: "Rendimiento", description: "Optimizado para el mejor desempeño en cualquier condición de red." },
  { icon: "🔒", title: "Conexión Estable", description: "Reconexión automática que mantiene tu VPN activa sin interrupciones." },
  { icon: "💾", title: "Configuración Reutilizable", description: "Genera y descarga tus archivos .ovpn y scripts cuando los necesites." },
  { icon: "👥", title: "Soporte 24/7", description: "Equipo técnico disponible para resolver cualquier incidencia." },
];

const STATS = [
  { number: "99.9%", label: "Disponibilidad" },
  { number: "AES-256", label: "Cifrado" },
  { number: "2", label: "Versiones RouterOS" },
  { number: "24/7", label: "Soporte" },
];

const Features = () => {
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
          <span className="eyebrow mb-5">🌟 Por qué elegirnos</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Características <span className="text-gradient">principales</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Todas las ventajas de usar OpenVPN con MikroTik para tus conexiones
            seguras.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="glass glass-hover rounded-2xl p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 3) * 0.08 }}
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-500 text-2xl shadow-lg shadow-cyan-500/30 mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">
                {f.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 glass glass-topline rounded-3xl p-8 md:p-10 max-w-5xl mx-auto"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-3">
                La VPN más confiable para{" "}
                <span className="text-gradient">tu MikroTik</span>
              </h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                OpenVPN combina seguridad, velocidad y facilidad de uso. Con más
                de 20 años de desarrollo, es el estándar de las VPN profesionales.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="glass-soft rounded-2xl p-5 text-center"
                >
                  <div className="text-2xl font-extrabold text-gradient">
                    {s.number}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Features;

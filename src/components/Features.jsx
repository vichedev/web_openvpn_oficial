import React from "react";
import { motion } from "framer-motion";

const Features = () => {
  const features = [
    {
      icon: "⚡",
      title: "Alta Velocidad",
      description:
        "Disfruta de conexiones ultrarrápidas con latencia mínima para una experiencia de navegación fluida.",
    },
    {
      icon: "🛡️",
      title: "Seguridad Máxima",
      description:
        "Encriptación militar AES-256 y protocolos seguros que protegen tus datos y privacidad.",
    },
    {
      icon: "🔧",
      title: "Fácil Configuración",
      description:
        "Interfaz intuitiva y configuración automática para que estés conectado en minutos.",
    },
    {
      icon: "🌐",
      title: "Multiplataforma",
      description:
        "Compatible con Windows, Mac, Linux, Android, iOS y dispositivos Mikrotik.",
    },
    {
      icon: "📊",
      title: "Monitoreo en Tiempo Real",
      description:
        "Sistema de monitoreo avanzado que te permite ver el estado de tu conexión en todo momento.",
    },
    {
      icon: "🚀",
      title: "Rendimiento Optimizado",
      description:
        "Algoritmos optimizados para garantizar el mejor rendimiento en cualquier condición de red.",
    },
    {
      icon: "🔒",
      title: "Conexiones Estables",
      description:
        "Tecnología de reconexión automática que mantiene tu VPN activa sin interrupciones.",
    },
    {
      icon: "💾",
      title: "Backup Automático",
      description:
        "Sistema automático de backup de configuraciones para mayor tranquilidad y seguridad.",
    },
    {
      icon: "👥",
      title: "Soporte 24/7",
      description:
        "Equipo de soporte técnico disponible las 24 horas para resolver cualquier incidencia.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:via-blue-900 dark:to-slate-900 pt-20 transition-colors duration-300">
      

      {/* Elementos decorativos */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 dark:bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/3 left-1/4 w-32 h-32 bg-orange-200 dark:bg-orange-500/10 rounded-full blur-3xl opacity-60"></div>
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
              <div className="text-4xl">🌟</div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6 transition-colors duration-300">
            Características{" "}
            <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-300 dark:to-cyan-300 bg-clip-text">
              Principales
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
            Descubre todas las ventajas de utilizar OpenVPN con Mikrotik para
            tus conexiones seguras
          </p>
        </motion.div>

        {/* Grid de características */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="bg-white/80 dark:bg-gray-800/50 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-gray-200 dark:border-gray-600/30 transition-all duration-300 group cursor-pointer"
              whileHover={{ scale: 1.03, y: -5 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1 }}
            >
              <div className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed transition-colors duration-300">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Sección adicional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-white/20 max-w-5xl mx-auto transition-colors duration-300"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-4 transition-colors duration-300">
                ¿Por qué elegir{" "}
                <span className="text-transparent bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text">
                  OpenVPN?
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed transition-colors duration-300">
                OpenVPN es la solución de VPN más confiable y segura del
                mercado. Con más de 20 años de desarrollo continuo, ofrece una
                combinación perfecta entre seguridad, velocidad y facilidad de
                uso.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { number: "99.9%", label: "Uptime" },
                { number: "256-bit", label: "Encriptación" },
                { number: "50ms", label: "Latencia" },
                { number: "24/7", label: "Soporte" },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  className="text-center p-4 bg-blue-500/10 dark:bg-blue-500/5 rounded-xl border border-blue-200 dark:border-blue-500/20"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.4 + index * 0.1 }}
                >
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {stat.number}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Features;

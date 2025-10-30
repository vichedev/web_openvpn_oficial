import React, { useState } from "react";
import { motion } from "framer-motion";
import Mikrotik6Form from "./Mikrotik6Form";
import Mikrotik7Form from "./Mikrotik7Form";

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState("mikrotik6");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-20 transition-colors duration-300">
      {/* Elementos decorativos de fondo - Solo en modo oscuro */}
      <div className="absolute inset-0 overflow-hidden dark:block hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl"></div>
      </div>

      {/* Elementos decorativos para modo claro */}
      <div className="absolute inset-0 overflow-hidden dark:hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-100 rounded-full blur-3xl"></div>
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
            <div className="bg-gradient-to-r from-blue-500 to-cyan-400 dark:from-blue-600 dark:to-cyan-500 p-4 rounded-2xl shadow-2xl">
              <div className="text-4xl">🔒</div>
            </div>
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 dark:text-white mb-6 transition-colors duration-300">
            Configuración{" "}
            <span className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 dark:from-blue-300 dark:to-cyan-300 bg-clip-text">
              OpenVPN
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-blue-200 max-w-3xl mx-auto leading-relaxed transition-colors duration-300">
            Selecciona tu versión de Mikrotik y genera tu archivo de
            configuración .ovpn de forma segura y rápida
          </p>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div
          className="flex justify-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
        >
          <div className="bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-2xl p-2 shadow-2xl border border-gray-200 dark:border-white/20 transition-colors duration-300">
            <button
              onClick={() => setActiveTab("mikrotik6")}
              className={`px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden group ${
                activeTab === "mikrotik6"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-blue-100 hover:text-blue-600 dark:hover:text-white hover:bg-blue-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="relative z-10 flex items-center">
                <span className="mr-3">🚀</span>
                Mikrotik 6
              </span>
              {activeTab === "mikrotik6" && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("mikrotik7")}
              className={`px-10 py-5 rounded-xl font-bold text-lg transition-all duration-300 relative overflow-hidden group ${
                activeTab === "mikrotik7"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                  : "text-gray-600 dark:text-purple-100 hover:text-purple-600 dark:hover:text-white hover:bg-purple-50 dark:hover:bg-white/10"
              }`}
            >
              <span className="relative z-10 flex items-center">
                <span className="mr-3">⚡</span>
                Mikrotik 7
              </span>
              {activeTab === "mikrotik7" && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              )}
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div
          className="max-w-5xl mx-auto"
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          {activeTab === "mikrotik6" && <Mikrotik6Form />}
          {activeTab === "mikrotik7" && <Mikrotik7Form />}
        </motion.div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mt-16 bg-white/80 dark:bg-white/10 backdrop-blur-lg rounded-3xl p-10 shadow-2xl border border-gray-200 dark:border-white/20 max-w-5xl mx-auto transition-colors duration-300"
        >
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-8 text-center transition-colors duration-300">
            ¿Necesitas{" "}
            <span className="text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 dark:from-cyan-300 dark:to-blue-300 bg-clip-text">
              ayuda
            </span>
            ?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              className="text-center bg-white/50 dark:bg-white/5 rounded-2xl p-8 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 border border-gray-100 dark:border-white/10 hover:border-cyan-400/30 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                📚
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 group-hover:text-cyan-600 dark:group-hover:text-cyan-300 transition-colors duration-300">
                Documentación Completa
              </h3>
              <p className="text-gray-600 dark:text-blue-200 leading-relaxed transition-colors duration-300">
                Consulta nuestra guía completa de configuración paso a paso con
                ejemplos prácticos y soluciones a problemas comunes.
              </p>
            </motion.div>
            <motion.div
              className="text-center bg-white/50 dark:bg-white/5 rounded-2xl p-8 hover:bg-white/70 dark:hover:bg-white/10 transition-all duration-300 border border-gray-100 dark:border-white/10 hover:border-blue-400/30 group cursor-pointer"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                💬
              </div>
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors duration-300">
                Soporte Técnico
              </h3>
              <p className="text-gray-600 dark:text-blue-200 leading-relaxed transition-colors duration-300">
                Nuestro equipo de expertos está disponible para ayudarte con
                cualquier problema de configuración o implementación.
              </p>
            </motion.div>
          </div>

          {/* Línea decorativa */}
          <div className="flex justify-center mt-8">
            <div className="h-1 w-20 bg-gradient-to-r from-cyan-400 to-blue-500 dark:from-cyan-300 dark:to-blue-400 rounded-full"></div>
          </div>
        </motion.div>

        {/* Footer decorativo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center mt-12"
        >
          <p className="text-gray-500 dark:text-blue-300/70 text-sm transition-colors duration-300">
            Configuración segura • Encriptación avanzada • Soporte 24/7
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Configuracion;

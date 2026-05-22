import React, { useState } from "react";
import { motion } from "framer-motion";
import Mikrotik6Form from "./Mikrotik6Form";
import Mikrotik7Form from "./Mikrotik7Form";
import { useSession } from "../context/SessionContext";

const Configuracion = () => {
  const { session } = useSession();
  // Abrimos por defecto la pestaña que coincide con la versión elegida en el
  // servidor (v6 -> MikroTik 6, v7 -> MikroTik 7).
  const [activeTab, setActiveTab] = useState(
    session.routerVersion === "v6" ? "mikrotik6" : "mikrotik7"
  );

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
          className="text-center mb-12"
        >
          <span className="eyebrow mb-5">⚙️ Paso 2 · Cliente</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Genera tu <span className="text-gradient">archivo .ovpn</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Elige tu versión de MikroTik, sube los certificados y descarga la
            configuración lista para tu dispositivo.
          </p>
        </motion.div>

        {/* Tabs */}
        <motion.div
          className="flex justify-center mb-10"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="glass rounded-2xl p-1.5 flex gap-1.5">
            {[
              { id: "mikrotik6", icon: "📟", label: "MikroTik 6" },
              { id: "mikrotik7", icon: "🚀", label: "MikroTik 7" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-7 md:px-10 py-3.5 rounded-xl font-bold text-base transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-cyan-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:bg-sky-500/10"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Contenido */}
        <motion.div
          className="max-w-5xl mx-auto"
          key={activeTab}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {activeTab === "mikrotik6" ? <Mikrotik6Form /> : <Mikrotik7Form />}
        </motion.div>

        {/* Ayuda */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto"
        >
          {[
            {
              icon: "🖥️",
              title: "¿Aún no tienes el servidor?",
              desc: "Crea primero el servidor OpenVPN en la sección «Servidor».",
            },
            {
              icon: "📖",
              title: "Guía paso a paso",
              desc: "Consulta el «Manual» para no perderte en ningún detalle.",
            },
            {
              icon: "💬",
              title: "Soporte técnico",
              desc: "Nuestro equipo te ayuda con cualquier problema de configuración.",
            },
          ].map((c) => (
            <div
              key={c.title}
              className="glass glass-hover rounded-2xl p-6 text-center"
            >
              <div className="text-4xl mb-3">{c.icon}</div>
              <h3 className="font-bold text-slate-800 dark:text-white mb-1.5">
                {c.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {c.desc}
              </p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
};

export default Configuracion;

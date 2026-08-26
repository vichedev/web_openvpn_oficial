import React from "react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "👥",
    title: "Un servidor, muchos usuarios",
    description:
      "El MikroTik levanta un único servidor OpenVPN y todos los usuarios se conectan a él, cada uno con su propio certificado.",
  },
  {
    icon: "➕",
    title: "Añadir sin interrumpir",
    description:
      "El script de alta reutiliza la CA y el perfil existentes: los usuarios ya conectados no se enteran de nada.",
  },
  {
    icon: "🚫",
    title: "Revocación de accesos",
    description:
      "Genera el script que borra credenciales, corta la sesión activa y elimina el certificado de un usuario concreto.",
  },
  {
    icon: "🔒",
    title: "Sin servidor detrás",
    description:
      "Todo se genera en tu navegador. Los certificados que subes y las contraseñas nunca salen de tu equipo.",
  },
  {
    icon: "🛡️",
    title: "Scripts a prueba de inyección",
    description:
      "Cada dato se escapa antes de entrar al .rsc: una comilla en una contraseña no puede convertirse en un comando del router.",
  },
  {
    icon: "🧮",
    title: "Red validada de verdad",
    description:
      "Comprueba el CIDR, el pool y el gateway antes de generar nada, para que no acabes con rangos imposibles.",
  },
  {
    icon: "🔧",
    title: "RouterOS 6, 7 y 7.17+",
    description:
      "Tres ramas explícitas: servidor único en 6 y 7.0–7.16, multi-instancia a partir de 7.17.",
  },
  {
    icon: "🌐",
    title: "Multiplataforma",
    description:
      "Archivos .ovpn para Windows, macOS, Linux, Android e iOS, y script listo para enlazar otro MikroTik.",
  },
  {
    icon: "⏳",
    title: "Accesos temporales",
    description:
      "Elige la fecha de caducidad de los certificados: al vencer, la conexión deja de funcionar sola.",
  },
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

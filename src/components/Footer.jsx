import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaHeadset,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
} from "react-icons/fa";

// El asistente vive en /asistente/<paso>; el resto son paginas sueltas.
const WIZARD_LINKS = [
  { to: "/asistente/servidor", text: "1 · Servidor" },
  { to: "/asistente/usuarios", text: "2 · Usuarios" },
  { to: "/asistente/scripts", text: "3 · Scripts" },
  { to: "/asistente/perfiles", text: "4 · Perfiles .ovpn" },
];

const SITE_LINKS = [
  { to: "/", text: "Inicio" },
  { to: "/manual", text: "Manual" },
  { to: "/caracteristicas", text: "Características" },
  { to: "/descargas", text: "Descargas" },
];

const Footer = () => {
  return (
    <footer className="relative overflow-hidden bg-[#070b16] text-slate-300">
      {/* Glow superior */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[40rem] h-64 bg-sky-500/20 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-sky-400/60 to-transparent" />

      <div className="container mx-auto px-4 py-14 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Marca + soporte */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <div className="flex items-center gap-3 mb-4">
              <img src="/img/ico.png" alt="Logo" className="w-11 h-11 object-contain" />
              <span className="text-2xl font-extrabold text-white">
                Open<span className="text-gradient">VPN</span>
              </span>
            </div>
            <p className="text-slate-400 mb-6 leading-relaxed max-w-md">
              Monta un servidor OpenVPN en tu MikroTik y da de alta todos los
              usuarios que necesites. Los scripts y los perfiles se generan en
              tu propio navegador: ni los certificados ni las contraseñas salen
              de tu equipo.
            </p>

          </motion.div>

          {/* Enlaces rápidos */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15 }}
          >
            <h3 className="text-lg font-semibold text-white mb-5">Asistente</h3>
            <ul className="space-y-3 mb-8">
              {WIZARD_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-500 group-hover:scale-150 transition-transform" />
                    {l.text}
                  </Link>
                </li>
              ))}
            </ul>

            <h3 className="text-lg font-semibold text-white mb-5">Navegación</h3>
            <ul className="space-y-3">
              {SITE_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-slate-400 hover:text-cyan-300 transition-colors flex items-center gap-2 group"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 group-hover:scale-150 transition-transform" />
                    {l.text}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Patrocinador */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h3 className="text-lg font-semibold text-white mb-5">
              Patrocinador
            </h3>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5">
              <img
                src="/img/maat.png"
                alt="Patrocinador"
                className="h-20 w-auto mx-auto opacity-90 hover:opacity-100 transition-opacity"
              />
            </div>
          </motion.div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/10 mt-12 pt-8 text-center text-sm text-slate-500">
          <p className="flex flex-col md:flex-row items-center justify-center gap-2">
            <span>&copy; 2026 JhonnVic Tech. Todos los derechos reservados.</span>
            <span className="hidden md:inline">•</span>
            <span>Compatible con RouterOS 6, 7.0–7.16 y 7.17+</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

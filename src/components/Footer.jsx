import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaHeadset,
  FaEnvelope,
  FaPhone,
  FaWhatsapp,
  FaShieldAlt,
  FaDownload,
  FaHome,
  FaStar,
} from "react-icons/fa";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white py-16 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="md:col-span-2"
          >
            <div className="flex items-center mb-6">
              <img
                src="/img/ico.png"
                alt="Logo del Sitio"
                className="w-12 h-12 mr-4"
              />
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Open VPN
              </span>
            </div>
            <p className="text-gray-300 mb-6 leading-relaxed">
              Soluciones profesionales de VPN para Mikrotik. Conecta de forma
              segura y confiable con la mejor tecnología OpenVPN.
            </p>

            {/* Soporte Contact */}
            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
              <h4 className="text-lg font-semibold mb-4 flex items-center">
                <FaHeadset className="text-orange-400 mr-2" />
                Soporte Técnico
              </h4>
              <div className="space-y-3">
                <a
                  href="https://wa.link/9jq3j9"
                  target="_blank"
                  className="flex items-center text-gray-300 hover:text-white transition-colors group"
                >
                  <FaWhatsapp className="text-green-400 mr-3 text-lg group-hover:scale-110 transition-transform" />
                  <span>WhatsApp</span>
                </a>
                <a
                  href="mailto:soporte@maat.ec"
                  className="flex items-center text-gray-300 hover:text-white transition-colors group"
                >
                  <FaEnvelope className="text-blue-400 mr-3 text-lg group-hover:scale-110 transition-transform" />
                  <span>soporte@maat.ec</span>
                </a>
                <a
                  href="https://wa.link/9jq3j9"
                  target="_blank"
                  className="flex items-center text-gray-300 hover:text-white transition-colors group"
                >
                  <FaPhone className="text-purple-400 mr-3 text-lg group-hover:scale-110 transition-transform" />
                  <span>+593 99 103 1784</span>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <FaHome className="text-orange-400 mr-2" />
              Enlaces Rápidos
            </h3>
            <ul className="space-y-3">
              <li>
                <FooterLink to="/" text="Inicio" icon={<FaHome />} />
              </li>
              <li>
                <FooterLink
                  to="/caracteristicas"
                  text="Características"
                  icon={<FaStar />}
                />
              </li>
              <li>
                <FooterLink
                  to="/descargas"
                  text="Descargas"
                  icon={<FaDownload />}
                />
              </li>
              <li>
                <FooterLink
                  to="/configuracion"
                  text="Configuración"
                  icon={<FaShieldAlt />}
                />
              </li>
            </ul>
          </motion.div>

          {/* Sponsors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <FaStar className="text-orange-400 mr-2" />
              Nuestros Patrocinadores
            </h3>
            <div className="space-y-4">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-orange-400/30 transition-all duration-300"
              >
                <img
                  src="/img/maat.png"
                  alt="Patrocinador"
                  className="h-50 w-auto mx-auto grayscale hover:grayscale-0 transition-all duration-300"
                />
              </motion.div>
              <p className="text-gray-300 text-sm text-center">
                Gracias a nuestros patrocinadores por hacer posible este
                proyecto
              </p>
            </div>
          </motion.div>
        </div>

        {/* Copyright */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="border-t border-gray-700 mt-12 pt-8 text-center"
        >
          <p className="text-gray-400 flex flex-col md:flex-row items-center justify-center space-y-2 md:space-y-0 md:space-x-4">
            <span>
              &copy; 2025 InigualitySoft. Todos los derechos reservados.
            </span>
            <span className="hidden md:inline">•</span>
            <span>Soluciones VPN profesionales</span>
          </p>
        </motion.div>
      </div>
    </footer>
  );
};

const FooterLink = ({ to, text, icon }) => (
  <Link
    to={to}
    className="text-gray-300 hover:text-orange-400 transition-all duration-300 flex items-center group py-2"
  >
    <span className="text-orange-400 mr-3 group-hover:scale-110 transition-transform">
      {icon}
    </span>
    {text}
  </Link>
);

export default Footer;

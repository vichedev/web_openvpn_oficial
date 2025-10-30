import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";

const Nav = () => {
  const location = useLocation();
  const { isDarkMode } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-lg fixed w-full top-0 z-50 border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3"
            onClick={closeMobileMenu}
          >
            <img
              src="/img/ico.png"
              alt="Logo"
              className="h-10 w-10 object-contain"
            />
            <span className="text-xl font-bold text-gray-800 dark:text-white">
              OpenVPN
            </span>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/"
              className={`font-semibold transition-colors duration-300 ${
                location.pathname === "/"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Inicio
            </Link>
            <Link
              to="/certificados"
              className={`font-semibold transition-colors duration-300 ${
                location.pathname === "/certificados"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Certificados
            </Link>
            <Link
              to="/configuracion"
              className={`font-semibold transition-colors duration-300 ${
                location.pathname === "/configuracion"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Configurar
            </Link>
            <Link
              to="/caracteristicas"
              className={`font-semibold transition-colors duration-300 ${
                location.pathname === "/caracteristicas"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Características
            </Link>
            <Link
              to="/descargas"
              className={`font-semibold transition-colors duration-300 ${
                location.pathname === "/descargas"
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
              }`}
            >
              Descargas
            </Link>

            {/* Toggle del Tema */}
            <div className="flex items-center">
              <ThemeToggle />
            </div>

            {/* Botón Contacto */}
            <a
              href="https://wa.link/l9kksa"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors duration-300"
            >
              Contacto
            </a>
          </div>

          {/* Mobile menu */}
          <div className="flex items-center space-x-4 md:hidden">
            {/* Toggle del Tema en móvil */}
            <ThemeToggle />

            {/* Botón menú móvil */}
            <button
              onClick={toggleMobileMenu}
              className="text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300"
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Menú móvil expandido */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 animate-fadeIn">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link
                to="/"
                className={`block font-semibold transition-colors duration-300 ${
                  location.pathname === "/"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={closeMobileMenu}
              >
                Inicio
              </Link>

              <Link
                to="/certificados"
                className={`block font-semibold transition-colors duration-300 ${
                  location.pathname === "/certificados"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={closeMobileMenu}
              >
                Certificados
              </Link>
              <Link
                to="/configuracion"
                className={`block font-semibold transition-colors duration-300 ${
                  location.pathname === "/configuracion"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={closeMobileMenu}
              >
                Configurar
              </Link>
              <Link
                to="/caracteristicas"
                className={`block font-semibold transition-colors duration-300 ${
                  location.pathname === "/caracteristicas"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={closeMobileMenu}
              >
                Características
              </Link>
              <Link
                to="/descargas"
                className={`block font-semibold transition-colors duration-300 ${
                  location.pathname === "/descargas"
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                }`}
                onClick={closeMobileMenu}
              >
                Descargas
              </Link>
              <a
                href="https://wa.link/l9kksa"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-300 text-center"
                onClick={closeMobileMenu}
              >
                Contacto
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Nav;
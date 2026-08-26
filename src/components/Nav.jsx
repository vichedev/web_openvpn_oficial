import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/asistente/servidor", label: "Asistente" },
  { to: "/manual", label: "Manual" },
  { to: "/caracteristicas", label: "Características" },
  { to: "/descargas", label: "Descargas" },
];

const Nav = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  const isActive = (to) => location.pathname === to;

  return (
    <nav
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/75 dark:bg-[#070b16]/80 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(2,8,23,0.25)] border-b border-white/40 dark:border-white/10"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3.5">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group" onClick={closeMobileMenu}>
            <div className="relative">
              <div className="absolute inset-0 bg-cyan-400/40 blur-lg rounded-full group-hover:bg-cyan-400/60 transition-colors" />
              <img
                src="/img/ico.png"
                alt="Logo"
                className="relative h-10 w-10 object-contain"
              />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-slate-800 dark:text-white">
              Open<span className="text-gradient">VPN</span>
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden lg:flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3.5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  isActive(l.to)
                    ? "text-white bg-gradient-to-r from-sky-500 to-cyan-500 shadow-md shadow-cyan-500/30"
                    : "text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-cyan-300 hover:bg-sky-500/10"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mx-2">
              <ThemeToggle />
            </div>
            <a
              href="https://wa.link/l9kksa"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-emerald-500/30 transition-all duration-300 hover:-translate-y-0.5"
            >
              💬 Contacto
            </a>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-3 lg:hidden">
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-sky-500/10 transition-colors"
              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden pb-4 animate-fadeIn">
            <div className="glass rounded-2xl p-3 space-y-1">
              {LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={closeMobileMenu}
                  className={`block px-4 py-3 rounded-xl font-semibold transition-colors ${
                    isActive(l.to)
                      ? "text-white bg-gradient-to-r from-sky-500 to-cyan-500"
                      : "text-slate-600 dark:text-slate-300 hover:bg-sky-500/10"
                  }`}
                >
                  {l.label}
                </Link>
              ))}
              <a
                href="https://wa.link/l9kksa"
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeMobileMenu}
                className="block text-center bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-semibold transition-colors"
              >
                💬 Contacto
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Nav;

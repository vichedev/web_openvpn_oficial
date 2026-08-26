import React from "react";
import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="page-bg pt-32 pb-24">
    <div className="aurora">
      <span className="aurora-blob b1" />
      <span className="aurora-blob b2" />
    </div>
    <div className="container mx-auto px-4 relative z-10 text-center max-w-xl">
      <div className="text-7xl mb-4">🧭</div>
      <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 dark:text-white mb-3">
        Esta pagina no existe
      </h1>
      <p className="text-slate-600 dark:text-slate-300 mb-8">
        La direccion que abriste no corresponde a ninguna seccion de la herramienta.
      </p>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          to="/"
          className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-cyan-500/30 transition-all"
        >
          Ir al inicio
        </Link>
        <Link
          to="/asistente/servidor"
          className="glass glass-hover px-6 py-3 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200"
        >
          Crear un servidor VPN
        </Link>
      </div>
    </div>
  </div>
);

export default NotFound;

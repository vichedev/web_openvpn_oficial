import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { SessionProvider } from "./context/SessionContext";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Footer from "./components/Footer";
import "./App.css";

// Cada seccion se carga cuando se visita: el generador arrastra SweetAlert2 y
// no tiene sentido descargarlo para quien solo abre la portada.
const StepServer = lazy(() => import("./components/wizard/StepServer"));
const StepUsers = lazy(() => import("./components/wizard/StepUsers"));
const StepScripts = lazy(() => import("./components/wizard/StepScripts"));
const StepProfiles = lazy(() => import("./components/wizard/StepProfiles"));
const Features = lazy(() => import("./components/Features"));
const Downloads = lazy(() => import("./components/Downloads"));
const Manual = lazy(() => import("./components/Manual"));
const NotFound = lazy(() => import("./components/NotFound"));

const Loading = () => (
  <div className="page-bg pt-32 pb-24 flex items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <span className="w-10 h-10 rounded-full border-4 border-sky-500/30 border-t-sky-500 animate-spin" />
      <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
    </div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <SessionProvider>
        <Router>
          <div className="App min-h-screen flex flex-col">
            <Nav />
            <main className="flex-grow">
              <Suspense fallback={<Loading />}>
                <Routes>
                  <Route path="/" element={<Hero />} />
                  {/* Asistente paso a paso */}
                  <Route path="/asistente" element={<Navigate to="/asistente/servidor" replace />} />
                  <Route path="/asistente/servidor" element={<StepServer />} />
                  <Route path="/asistente/usuarios" element={<StepUsers />} />
                  <Route path="/asistente/scripts" element={<StepScripts />} />
                  <Route path="/asistente/perfiles" element={<StepProfiles />} />
                  {/* Rutas antiguas: se mantienen como enlaces permanentes */}
                  <Route path="/certificados" element={<Navigate to="/asistente/servidor" replace />} />
                  <Route path="/configuracion" element={<Navigate to="/asistente/perfiles" replace />} />
                  <Route path="/caracteristicas" element={<Features />} />
                  <Route path="/descargas" element={<Downloads />} />
                  <Route path="/manual" element={<Manual />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;

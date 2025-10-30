import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Nav from "./components/Nav";
import Hero from "./components/Hero";
import Configuracion from "./components/Configuracion";
import Features from "./components/Features";
import Downloads from "./components/Downloads";
import Footer from "./components/Footer";
import CertificateSection from "./components/CertificateSection"; // Importa el nuevo componente
import "./App.css";

function App() {
  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen flex flex-col bg-white dark:bg-gray-900">
          <Nav />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Hero />} />
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/caracteristicas" element={<Features />} />
              <Route path="/descargas" element={<Downloads />} />
              <Route
                path="/certificados"
                element={<CertificateSection />}
              />{" "}
              {/* Nueva ruta */}
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;

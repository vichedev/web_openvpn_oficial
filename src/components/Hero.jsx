import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";

const Hero = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [showContent, setShowContent] = useState(false);
  const [logoAnimationStage, setLogoAnimationStage] = useState("initial");
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef(null);

  // Detectar si es móvil y tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animación del logo mejorada
  useEffect(() => {
    if (isMobile) {
      // Timeline para móvil más rápido
      setLogoAnimationStage("center");
      setTimeout(() => {
        setLogoAnimationStage("background");
        setTimeout(() => {
          setShowContent(true);
        }, 600);
      }, 1200);
      return;
    }

    // Timeline para desktop
    const timeline = setTimeout(() => {
      setLogoAnimationStage("center");

      setTimeout(() => {
        setLogoAnimationStage("background");

        setTimeout(() => {
          setShowContent(true);
        }, 800);
      }, 1800);
    }, 500);

    return () => clearTimeout(timeline);
  }, [isMobile]);

  // Efecto de partículas mejorado
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let particles = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.reset();
        this.alpha = 0;
        this.targetAlpha = Math.random() * 0.4 + 0.2;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 1.5;
        this.speedX = (Math.random() - 0.5) * 0.6;
        this.speedY = (Math.random() - 0.5) * 0.6;
        this.color = isDarkMode
          ? `rgba(249, 115, 22, ${Math.random() * 0.7 + 0.3})`
          : `rgba(234, 88, 12, ${Math.random() * 0.6 + 0.4})`;
        this.oscillation = Math.random() * Math.PI * 2;
        this.oscillationSpeed = Math.random() * 0.02 + 0.01;
      }

      update() {
        if (this.alpha < this.targetAlpha) {
          this.alpha += 0.015;
        }

        this.x += this.speedX + Math.cos(this.oscillation) * 0.1;
        this.y += this.speedY + Math.sin(this.oscillation) * 0.1;
        this.oscillation += this.oscillationSpeed;

        if (this.x > canvas.width || this.x < 0) this.speedX *= -0.95;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -0.95;
      }

      draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(
        70,
        Math.floor((canvas.width * canvas.height) / 18000)
      );

      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const bgColor = isDarkMode
        ? "rgba(15, 23, 42, 0.4)"
        : "rgba(248, 250, 252, 0.4)";
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Conexiones entre partículas
      ctx.strokeStyle = isDarkMode
        ? "rgba(249, 115, 22, 0.2)"
        : "rgba(234, 88, 12, 0.15)";
      ctx.lineWidth = 0.7;

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 120) {
            const opacity = 1 - distance / 120;
            ctx.globalAlpha = opacity * 0.4;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    const setup = () => {
      resizeCanvas();
      initParticles();
      animate();
    };

    setup();

    const handleResize = () => {
      resizeCanvas();
      initParticles();
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isDarkMode]);

  const handleConfigurarClick = () => {
    navigate("/configuracion");
  };

  return (
    <div
      className={`min-h-screen transition-colors duration-1000 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900"
          : "bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100"
      }`}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />

      <AnimatePresence mode="wait">
        {!showContent ? (
          <LogoAnimation
            stage={logoAnimationStage}
            isMobile={isMobile}
            isDarkMode={isDarkMode}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
            }}
            className="relative z-10"
          >
            <HeroContent
              onConfigurarClick={handleConfigurarClick}
              isDarkMode={isDarkMode}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LogoAnimation = ({ stage, isMobile, isDarkMode }) => (
  <motion.div
    className="min-h-screen flex items-center justify-center relative overflow-hidden"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 1, ease: "easeOut" }}
  >
    {/* Fondo difuminado */}
    <motion.div
      className={`absolute inset-0 z-10 transition-colors duration-1000 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900/95 via-blue-900/85 to-slate-900/95"
          : "bg-gradient-to-br from-slate-50/95 via-blue-50/90 to-slate-100/95"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: stage === "background" ? 1 : 0 }}
      transition={{ duration: 0.8 }}
    />

    {/* Contenedor principal del logo */}
    <motion.div
      className={`relative z-20 text-center ${
        stage === "center"
          ? "scale-100 opacity-100"
          : stage === "background"
          ? "scale-125 opacity-5"
          : "scale-50 opacity-0"
      } transition-all duration-1200 ease-out`}
    >
      <motion.div
        initial={{
          scale: 0.3,
          opacity: 0,
          rotateY: 180,
          z: -1000,
        }}
        animate={{
          scale: stage === "initial" ? 0.3 : stage === "center" ? 1 : 1.2,
          opacity: stage === "initial" ? 0 : stage === "center" ? 1 : 0.05,
          rotateY: stage === "initial" ? 180 : 0,
          z: stage === "initial" ? -1000 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 80,
          damping: 20,
          duration: 1.8,
        }}
        className="flex flex-col items-center justify-center"
      >
        {/* Logo con tamaño responsive mejorado - Más ancho y menos alto */}
        <motion.img
          src="/img/logo.png"
          alt="OpenVPN Logo"
          className={`mx-auto transition-all duration-1000 ${
            isMobile
              ? "w-40 h-16 md:w-48 md:h-20" // Más ancho, menos alto
              : "w-56 h-20 lg:w-64 lg:h-24 xl:w-72 xl:h-28" // Más ancho, menos alto
          } ${stage === "background" ? "blur-sm" : ""} object-contain`}
        />

        {/* Texto del logo */}
        <AnimatePresence>
          {stage === "center" && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.9 }}
              transition={{
                delay: 0.3,
                duration: 0.8,
                ease: "easeOut",
              }}
              className="mt-6"
            >
              <motion.h1
                className={`font-bold mb-3 transition-colors duration-1000 ${
                  isMobile ? "text-2xl" : "text-3xl md:text-4xl"
                }`}
                style={{ color: isDarkMode ? "#ffffff" : "#1f2937" }}
              >
                OpenVPN Mikrotik
              </motion.h1>
              <motion.p
                className={`transition-colors duration-1000 ${
                  isMobile ? "text-base" : "text-lg"
                }`}
                style={{ color: isDarkMode ? "#bfdbfe" : "#4b5563" }}
              >
                Configuración segura en progreso...
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  </motion.div>
);

const HeroContent = ({ onConfigurarClick, isDarkMode }) => {
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1200
  );

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const getLogoSize = () => {
    if (windowWidth < 640) return { width: 120, height: 120 };
    if (windowWidth < 768) return { width: 140, height: 140 };
    if (windowWidth < 1024) return { width: 160, height: 160 };
    return { width: 180, height: 180 };
  };

  const logoSize = getLogoSize();

  return (
    <section className="min-h-screen flex items-center justify-center pt-30 pb-8">
      <div className="container mx-auto px-4 text-center">
        {/* Título principal - AHORA PRIMERO */}
        <motion.h1
          className="font-bold mb-6 leading-tight transition-colors duration-1000"
          style={{ color: isDarkMode ? "#ffffff" : "#1f2937" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.2,
            duration: 0.8,
            ease: "easeOut",
          }}
        >
          <span
            className={`block ${
              windowWidth < 640
                ? "text-2xl"
                : windowWidth < 768
                ? "text-3xl"
                : windowWidth < 1024
                ? "text-4xl"
                : "text-5xl"
            }`}
          >
            Conecta de forma segura tu red utilizando{" "}
          </span>
          <span
            className={`block bg-gradient-to-r from-blue-500 to-blue-600 bg-clip-text text-transparent ${
              windowWidth < 640
                ? "text-2xl"
                : windowWidth < 768
                ? "text-3xl"
                : windowWidth < 1024
                ? "text-4xl"
                : "text-5xl"
            } font-bold mt-2`}
          >
            OpenVPN en Mikrotik
          </span>
        </motion.h1>

        {/* Logo en el contenido principal - AHORA DESPUÉS DEL TÍTULO */}
        <motion.div
          className="mx-auto mb-6 md:mb-8"
          initial={{ scale: 0, opacity: 0, y: -30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 100,
            damping: 15,
            duration: 1.2,
          }}
        >
          <motion.img
            src="/img/logo.png"
            alt="OpenVPN"
            className="mx-auto object-contain"
            style={{
              width:
                windowWidth < 640
                  ? "140px"
                  : windowWidth < 768
                  ? "160px"
                  : windowWidth < 1024
                  ? "180px"
                  : "200px",
              height:
                windowWidth < 640
                  ? "50px"
                  : windowWidth < 768
                  ? "60px"
                  : windowWidth < 1024
                  ? "70px"
                  : "80px",
              maxWidth: "100%",
            }}
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.3 },
            }}
          />
        </motion.div>

        {/* Descripción */}
        <motion.p
          className={`mb-8 max-w-3xl mx-auto leading-relaxed transition-colors duration-1000 ${
            windowWidth < 640 ? "text-base" : "text-lg md:text-xl"
          }`}
          style={{ color: isDarkMode ? "#bfdbfe" : "#4b5563" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.6,
            duration: 0.8,
            ease: "easeOut",
          }}
        >
          Configuración automática y segura para tus dispositivos Mikrotik.
          Genera archivos de configuración .ovpn en segundos.
        </motion.p>

        {/* Botón CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.8,
            duration: 0.8,
            ease: "easeOut",
          }}
          className="mb-12 md:mb-16"
        >
          <motion.button
            onClick={onConfigurarClick}
            className="group relative px-6 py-3 md:px-8 md:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold shadow-2xl overflow-hidden"
            whileHover={{
              scale: 1.05,
              transition: { duration: 0.3 },
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span
              className={`relative z-10 flex items-center justify-center ${
                windowWidth < 640 ? "text-base" : "text-lg"
              }`}
            >
              Configurar aquí!
              <motion.svg
                className="w-4 h-4 md:w-5 md:h-5 ml-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                initial={{ x: 0 }}
                whileHover={{ x: 5 }}
                transition={{ duration: 0.3 }}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </motion.svg>
            </span>
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent transform -skew-x-12 -translate-x-full"
              whileHover={{ translateX: "400%" }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </motion.button>
        </motion.div>

        {/* Características */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 1.0,
            duration: 0.8,
            ease: "easeOut",
          }}
        >
          {[
            { icon: "⚡", title: "Rápido", desc: "Configuración en segundos" },
            { icon: "🛡️", title: "Seguro", desc: "Encriptación avanzada" },
            { icon: "🔧", title: "Fácil", desc: "Interfaz intuitiva" },
          ].map((feature, index) => (
            <motion.div
              key={index}
              className={`backdrop-blur-md border rounded-xl p-4 md:p-6 transition-all duration-500 ${
                isDarkMode
                  ? "bg-white/10 border-white/20 text-white hover:border-blue-400/50"
                  : "bg-white/80 border-gray-200 text-gray-800 hover:border-blue-400/50"
              }`}
              whileHover={{
                scale: 1.03,
                y: -5,
                transition: { duration: 0.3 },
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
            >
              <div
                className={`${
                  windowWidth < 640 ? "text-2xl" : "text-3xl"
                } mb-2 md:mb-3`}
              >
                {feature.icon}
              </div>
              <h3
                className={`font-semibold mb-1 md:mb-2 ${
                  windowWidth < 640 ? "text-lg" : "text-xl"
                }`}
              >
                {feature.title}
              </h3>
              <p
                className={`
          ${isDarkMode ? "text-blue-200" : "text-gray-600"} 
          ${windowWidth < 640 ? "text-sm" : "text-base"}
        `}
              >
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

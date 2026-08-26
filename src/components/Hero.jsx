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
          ? `rgba(56, 189, 248, ${Math.random() * 0.7 + 0.3})`
          : `rgba(14, 165, 233, ${Math.random() * 0.55 + 0.35})`;
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
        ? "rgba(56, 189, 248, 0.22)"
        : "rgba(14, 165, 233, 0.16)";
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
    navigate("/asistente/servidor");
  };

  return (
    <div className="page-bg min-h-screen">
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

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.7, ease: "easeOut" },
});

const HeroContent = ({ onConfigurarClick }) => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex items-center justify-center pt-28 pb-16">
      <div className="container mx-auto px-4 text-center">
        {/* Etiqueta */}
        <motion.div {...fadeUp(0.1)} className="flex justify-center mb-7">
          <span className="eyebrow">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Compatible con RouterOS 6 y 7
          </span>
        </motion.div>

        {/* Logo */}
        <motion.img
          src="/img/logo.png"
          alt="OpenVPN"
          className="mx-auto object-contain w-44 md:w-56 mb-8 floating-img drop-shadow-[0_8px_30px_rgba(14,165,233,0.35)]"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 90, damping: 14 }}
        />

        {/* Título */}
        <motion.h1
          {...fadeUp(0.3)}
          className="font-extrabold leading-[1.1] tracking-tight text-slate-800 dark:text-white text-3xl md:text-5xl lg:text-6xl mb-6"
        >
          Conecta tu red de forma segura con
          <span className="block text-gradient mt-2">OpenVPN en MikroTik</span>
        </motion.h1>

        {/* Descripción */}
        <motion.p
          {...fadeUp(0.45)}
          className="mb-9 max-w-2xl mx-auto text-base md:text-xl leading-relaxed text-slate-600 dark:text-slate-300"
        >
          Monta el servidor una vez y da de alta{" "}
          <span className="font-semibold text-sky-600 dark:text-cyan-300">
            todos los usuarios que necesites
          </span>
          : cada uno con su certificado y su archivo .ovpn. Sin comandos complicados.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.6)}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
        >
          <button onClick={onConfigurarClick} className="btn-vpn text-lg">
            🚀 Crear mi VPN
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </button>
          <button onClick={() => navigate("/manual")} className="btn-ghost text-lg">
            📖 Ver el manual
          </button>
        </motion.div>

        {/* Tarjetas de características */}
        <motion.div
          {...fadeUp(0.75)}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-4xl mx-auto"
        >
          {[
            { icon: "👥", title: "Multiusuario", desc: "Un solo servidor en el router y tantos usuarios como quieras, cada uno con su certificado." },
            { icon: "🔒", title: "Todo en tu navegador", desc: "Certificados y contraseñas nunca se envían a ningún servidor: no hay backend." },
            { icon: "🧩", title: "Sin comandos", desc: "Importa un script en el MikroTik y descarga el .ovpn. La web hace el trabajo difícil." },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              className="glass glass-hover rounded-2xl p-6 text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.12 }}
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1.5">
                {f.title}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {f.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;

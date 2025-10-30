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

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Animación del logo en tres etapas con transiciones suaves
  useEffect(() => {
    if (isMobile) {
      setLogoAnimationStage("center");
      setTimeout(() => {
        setLogoAnimationStage("background");
        setTimeout(() => {
          setShowContent(true);
        }, 800);
      }, 1800);
      return;
    }

    const timeline = setTimeout(() => {
      setLogoAnimationStage("center");

      setTimeout(() => {
        setLogoAnimationStage("background");

        setTimeout(() => {
          setShowContent(true);
        }, 1000);
      }, 2500);
    }, 800);

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
        this.targetAlpha = Math.random() * 0.3 + 0.1;
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 2.5 + 1.2; // Partículas más grandes
        this.speedX = (Math.random() - 0.5) * 0.8;
        this.speedY = (Math.random() - 0.5) * 0.8;
        this.color = isDarkMode
          ? `rgba(249, 115, 22, ${Math.random() * 0.6 + 0.3})` // Más opacas en oscuro
          : `rgba(234, 88, 12, ${Math.random() * 0.5 + 0.4})`; // Más opacas en claro
        this.oscillation = Math.random() * Math.PI * 2;
        this.oscillationSpeed = Math.random() * 0.03 + 0.01;
      }

      update() {
        // Suavizar la aparición
        if (this.alpha < this.targetAlpha) {
          this.alpha += 0.01;
        }

        this.x += this.speedX + Math.cos(this.oscillation) * 0.15;
        this.y += this.speedY + Math.sin(this.oscillation) * 0.15;
        this.oscillation += this.oscillationSpeed;

        // Rebote suave en los bordes
        if (this.x > canvas.width || this.x < 0) this.speedX *= -0.98;
        if (this.y > canvas.height || this.y < 0) this.speedY *= -0.98;
      }

      draw() {
        ctx.fillStyle = this.color.replace("0.1", this.alpha.toString());
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.min(
        80, // Más partículas
        Math.floor((canvas.width * canvas.height) / 15000)
      );

      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fondo más transparente para que se vean las partículas
      const bgColor = isDarkMode
        ? "rgba(15, 23, 42, 0.6)" // Más transparente
        : "rgba(248, 250, 252, 0.5)"; // Más transparente
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.update();
        particle.draw();
      });

      // Conexiones más visibles
      ctx.strokeStyle = isDarkMode
        ? "rgba(249, 115, 22, 0.15)" // Más visibles
        : "rgba(234, 88, 12, 0.12)"; // Más visibles
      ctx.lineWidth = 0.8; // Líneas más gruesas

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            // Rango de conexión más amplio
            const opacity = 1 - distance / 150;
            ctx.globalAlpha = opacity * 0.5; // Más opacas
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 1.2,
              ease: [0.25, 0.46, 0.45, 0.94],
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
    className="min-h-screen flex items-center justify-center relative"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 1.5, ease: "easeOut" }}
  >
    <motion.div
      className={`absolute inset-0 z-10 transition-colors duration-1000 ${
        isDarkMode
          ? "bg-gradient-to-br from-slate-900/90 via-blue-900/70 to-slate-900/90"
          : "bg-gradient-to-br from-slate-50/90 via-blue-50/80 to-slate-100/90"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: stage === "background" ? 1 : 0 }}
      transition={{ duration: 1.2 }}
    />

    <motion.div
      className={`relative z-20 text-center ${
        stage === "center"
          ? "scale-100 opacity-100"
          : stage === "background"
          ? "scale-110 opacity-10"
          : "scale-75 opacity-0"
      } transition-all duration-1500 ease-out`}
    >
      <motion.img
        src="/img/logo.png"
        alt="OpenVPN Logo"
        className={`mx-auto mb-8 ${
          stage === "center" ? "w-48 h-48 md:w-200 md:h-64" : "w-32 h-32"
        } transition-all duration-1500 ease-out`}
        initial={{ scale: 0, rotate: -180, opacity: 0 }}
        animate={{
          scale: stage === "initial" ? 0 : 1,
          rotate: stage === "initial" ? -180 : 0,
          opacity: stage === "initial" ? 0 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 100,
          damping: 15,
          duration: 2.5,
        }}
      />

      <AnimatePresence>
        {stage === "center" && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{
              delay: 0.8,
              duration: 1.2,
              ease: "easeOut",
            }}
          >
            <motion.h1
              className="text-3xl md:text-4xl font-bold mb-4 transition-colors duration-1000"
              style={{ color: isDarkMode ? "#ffffff" : "#1f2937" }}
            >
              OpenVPN Mikrotik
            </motion.h1>
            <motion.p
              className="text-lg transition-colors duration-1000"
              style={{ color: isDarkMode ? "#bfdbfe" : "#4b5563" }}
            >
              Configuración segura en progreso...
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  </motion.div>
);

const HeroContent = ({ onConfigurarClick, isDarkMode }) => (
  <section className="min-h-screen flex items-center justify-center pt-20">
    <div className="container mx-auto px-4 text-center">
      <motion.img
        src="/img/logo.png"
        alt="OpenVPN"
        className="floating-img mx-auto w-50 h-22 md:w-48 md:h-8 mb-10"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          delay: 0.3,
          type: "spring",
          stiffness: 100,
          damping: 15,
          duration: 1.5,
        }}
      />

      <motion.h1
        className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-6 leading-tight transition-colors duration-1000"
        style={{ color: isDarkMode ? "#ffffff" : "#1f2937" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.5,
          duration: 1,
          ease: "easeOut",
        }}
      >
        Conecta de forma segura tu red utilizando{" "}
        <span className="text-blue-500">OpenVPN</span> en Mikrotik.
      </motion.h1>

      <motion.p
        className="text-lg md:text-xl mb-8 max-w-3xl mx-auto leading-relaxed transition-colors duration-1000"
        style={{ color: isDarkMode ? "#bfdbfe" : "#4b5563" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.7,
          duration: 1,
          ease: "easeOut",
        }}
      >
        Configuración automática y segura para tus dispositivos Mikrotik. Genera
        archivos de configuración .ovpn en segundos.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.9,
          duration: 1,
          ease: "easeOut",
        }}
      >
        <motion.button
          onClick={onConfigurarClick}
          className="group relative px-8 py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold text-lg shadow-2xl overflow-hidden"
          whileHover={{
            scale: 1.05,
            transition: { duration: 0.3 },
          }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10 flex items-center">
            Configurar aquí!
            <motion.svg
              className="w-5 h-5 ml-2"
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

      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 1.1,
          duration: 1,
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
            className={`backdrop-blur-md border rounded-xl p-6 transition-all duration-500 ${
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
            transition={{ delay: 1.3 + index * 0.1 }}
          >
            <div className="text-3xl mb-3">{feature.icon}</div>
            <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
            <p className={isDarkMode ? "text-blue-200" : "text-gray-600"}>
              {feature.desc}
            </p>
          </motion.div>
        ))}
      </motion.div>
    </div>
  </section>
);

export default Hero;

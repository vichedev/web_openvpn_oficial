// 📁 src/components/Manual.jsx
// Manual de usuario: cómo crear una VPN OpenVPN desde un MikroTik, paso a paso.
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
//  Contenido del manual
// ---------------------------------------------------------------------------
const STEPS = [
  {
    icon: "🧭",
    title: "1. Qué vas a construir",
    body: [
      "Vas a montar un servidor OpenVPN dentro de tu MikroTik y a generar un archivo .ovpn para que tus dispositivos (Windows, Android, iOS, Linux, Mac u otro MikroTik) se conecten de forma segura.",
      "El proceso tiene 3 fases: (1) preparar el servidor con el script que genera esta web, (2) descargar los certificados del router, y (3) generar el archivo .ovpn del cliente.",
    ],
    list: [
      "Necesitas acceso al MikroTik por Winbox o WebFig.",
      "Necesitas la IP pública del MikroTik (la que ven desde Internet).",
      "El puerto de OpenVPN (por defecto 1194) debe estar abierto/redirigido hacia el router.",
    ],
  },
  {
    icon: "🖥️",
    title: "2. Generar el script del servidor",
    body: [
      "Entra en la sección «Servidor» de esta web. Selecciona la versión de tu RouterOS y completa los datos.",
    ],
    list: [
      "Versión: RouterOS 6 o RouterOS 7 (compruébalo en Winbox → System → Resources). El script de RouterOS 7 se autoadapta a cualquier versión 7.x, de la 7.0 a la 7.15+.",
      "Nombre del cliente VPN: el usuario que usará la persona (ej: usuario01).",
      "Contraseña del cliente: mínimo 8 caracteres. También protege la exportación de la llave.",
      "IP pública del servidor: la IP por la que se llega al MikroTik desde Internet.",
      "Puerto y protocolo: 1194/UDP es lo recomendado (en RouterOS 6 solo hay TCP).",
    ],
    note: "Pulsa «Generar script del servidor». La web crea un único script con TODO: certificados, pool de IP, perfil PPP, usuario, servidor OpenVPN, firewall y NAT.",
  },
  {
    icon: "⌨️",
    title: "3. Ejecutar el script en el MikroTik",
    body: [
      "Copia el script completo (botón «Copiar todo») o descárgalo como archivo .rsc.",
      "En Winbox abre «New Terminal», pega el script y pulsa Enter. Si descargaste el .rsc, súbelo a Files y ejecútalo con: /import file-name=servidor-openvpn.rsc",
    ],
    list: [
      "El paso de firmado de certificados puede tardar 1 a 2 minutos: es normal, espera.",
      "Si el router muestra avisos de líneas ya existentes, es seguro: significa que ese recurso ya estaba creado.",
    ],
    note: "Al terminar tendrás el servidor OpenVPN activo y un usuario VPN listo para usarse.",
  },
  {
    icon: "📁",
    title: "4. Descargar los certificados",
    body: [
      "El script exporta automáticamente los certificados. Ábrelos desde Winbox → Files.",
    ],
    list: [
      "ca.crt — certificado de la Autoridad Certificadora.",
      "NOMBRE.crt — certificado del cliente (NOMBRE = el cliente que pusiste).",
      "NOMBRE.key — llave privada del cliente.",
    ],
    note: "Arrastra esos 3 archivos desde Files hasta tu computadora. Los necesitarás en el paso siguiente.",
  },
  {
    icon: "⚙️",
    title: "5. Generar el archivo .ovpn",
    body: [
      "Entra en la sección «Configurar» y elige la pestaña según tu router (Mikrotik 6 o Mikrotik 7).",
      "Rellena la IP del servidor, el usuario y la contraseña (los mismos que pusiste en el paso 2), el puerto, protocolo y cifrado.",
    ],
    list: [
      "Sube los 3 archivos: Certificado CA (ca.crt), Certificado Cliente (NOMBRE.crt) y Llave Cliente (NOMBRE.key).",
      "Pulsa «Generar OVPN» y luego «Descargar OVPN».",
      "El cifrado y la autenticación deben coincidir con los que admite el servidor (el script ya los habilita todos los habituales).",
    ],
    note: "El archivo .ovpn incluye los certificados embebidos: es lo único que necesita el cliente.",
  },
  {
    icon: "📲",
    title: "6. Conectar el dispositivo",
    body: [
      "Instala la app OpenVPN en el dispositivo e importa el archivo .ovpn.",
    ],
    list: [
      "Windows / Mac / Linux: app «OpenVPN Connect» o «OpenVPN GUI» → Import file.",
      "Android / iOS: app «OpenVPN Connect» → Import → desde archivo.",
      "Otro MikroTik (site-to-site): usa el botón «Script Router Cliente (.rsc)» de la sección Configurar.",
    ],
    note: "Si pide usuario y contraseña, son los del paso 2. ¡Conectado!",
  },
];

const TROUBLESHOOT = [
  {
    q: "La conexión no llega al servidor (timeout).",
    a: "Verifica que la IP pública sea correcta y que el puerto (1194) esté abierto y redirigido al MikroTik. Comprueba la regla de firewall que creó el script (/ip firewall filter).",
  },
  {
    q: "Conecta pero se cae enseguida o falla la autenticación.",
    a: "Usuario o contraseña incorrectos. Revisa /ppp secret en el router y que coincidan con los del archivo .ovpn.",
  },
  {
    q: "Error de certificado / TLS handshake failed.",
    a: "Asegúrate de subir los 3 archivos correctos y de la misma exportación. Vuelve a exportarlos si los regeneraste. El certificado del servidor debe estar marcado como trusted=yes.",
  },
  {
    q: "Conecta pero no hay Internet.",
    a: "Falta el NAT. Confirma la regla masquerade que creó el script en /ip firewall nat para la red de la VPN.",
  },
  {
    q: "RouterOS 6 no acepta UDP.",
    a: "Es correcto: RouterOS 6 solo soporta OpenVPN sobre TCP. Usa la pestaña Mikrotik 6 y protocolo TCP.",
  },
];

// ---------------------------------------------------------------------------
//  Componente
// ---------------------------------------------------------------------------
const Manual = () => {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="page-bg pt-24 pb-20">
      <div className="aurora">
        <span className="aurora-blob b1" />
        <span className="aurora-blob b2" />
        <span className="aurora-blob b3" />
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <span className="eyebrow mb-5">📖 Guía completa</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Manual de <span className="text-gradient">usuario</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Cómo crear una VPN OpenVPN desde tu MikroTik, paso a paso.
          </p>
        </motion.div>

        {/* Resumen rápido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-6 mb-10 text-white shadow-xl"
        >
          <h2 className="font-bold text-xl mb-3">⚡ Resumen en 3 pasos</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="bg-white/15 rounded-xl p-4">
              <div className="font-bold mb-1">1. Servidor</div>
              Genera y ejecuta el script en el MikroTik.
            </div>
            <div className="bg-white/15 rounded-xl p-4">
              <div className="font-bold mb-1">2. Certificados</div>
              Descarga ca.crt, .crt y .key desde Files.
            </div>
            <div className="bg-white/15 rounded-xl p-4">
              <div className="font-bold mb-1">3. Cliente</div>
              Genera el .ovpn e impórtalo en tu dispositivo.
            </div>
          </div>
        </motion.div>

        {/* Pasos */}
        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-xl shadow-lg shadow-cyan-500/30">
                  {step.icon}
                </span>
                {step.title}
              </h3>
              {step.body.map((p, j) => (
                <p
                  key={j}
                  className="text-slate-600 dark:text-slate-300 mb-2 leading-relaxed"
                >
                  {p}
                </p>
              ))}
              {step.list && (
                <ul className="mt-3 space-y-1.5">
                  {step.list.map((li, j) => (
                    <li
                      key={j}
                      className="text-slate-600 dark:text-slate-300 text-sm flex gap-2"
                    >
                      <span className="text-cyan-500 font-bold">›</span>
                      <span>{li}</span>
                    </li>
                  ))}
                </ul>
              )}
              {step.note && (
                <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-3 text-sm text-blue-800 dark:text-blue-300">
                  💡 {step.note}
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Solución de problemas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12"
        >
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 dark:text-white mb-6 text-center">
            🛠️ Solución de problemas
          </h2>
          <div className="space-y-3">
            {TROUBLESHOOT.map((item, i) => (
              <div key={i} className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-800 dark:text-white hover:bg-sky-500/5 transition-colors"
                >
                  <span>{item.q}</span>
                  <span
                    className={`text-cyan-500 ml-3 text-xl transition-transform duration-300 ${
                      openFaq === i ? "rotate-45" : ""
                    }`}
                  >
                    +
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-slate-600 dark:text-slate-300 text-sm animate-fadeIn">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-12 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Link
            to="/certificados"
            className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3.5 px-7 rounded-xl text-center shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
          >
            🖥️ Empezar: crear el servidor
          </Link>
          <Link to="/configuracion" className="btn-ghost py-3.5 px-7">
            ⚙️ Generar archivo .ovpn
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Manual;

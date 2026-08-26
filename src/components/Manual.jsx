// 📁 src/components/Manual.jsx
// Manual de usuario, alineado con el asistente de 4 pasos.
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// ---------------------------------------------------------------------------
//  Contenido del manual
// ---------------------------------------------------------------------------
const RESUMEN = [
  { n: 1, title: "Servidor", desc: "Datos del MikroTik. Se define una sola vez." },
  { n: 2, title: "Usuarios", desc: "Todas las personas que se conectarán." },
  { n: 3, title: "Scripts", desc: "Se importan en el router y crean los certificados." },
  { n: 4, title: "Perfiles", desc: "Un .ovpn por persona, listo para repartir." },
];

const STEPS = [
  {
    icon: "🧭",
    title: "Antes de empezar",
    body: [
      "Vas a montar UN servidor OpenVPN dentro de tu MikroTik y a darle de alta tantos usuarios como necesites. Todos se conectan al mismo servidor y al mismo puerto: lo único propio de cada persona es su certificado y su contraseña.",
      "Todo el proceso está en la sección «Asistente», dividido en 4 pasos. Puedes ir y volver entre ellos cuando quieras: la barra lateral marca en verde los que ya están completos y el panel de resumen muestra siempre la configuración actual.",
    ],
    list: [
      "Necesitas acceso al MikroTik por Winbox o WebFig.",
      "Necesitas la IP pública del MikroTik (o un dominio DDNS que apunte a él).",
      "El puerto de OpenVPN debe estar abierto o redirigido hacia el router.",
      "Todo se genera en tu navegador: los certificados y las contraseñas no viajan a ningún servidor.",
    ],
  },
  {
    icon: "🖥️",
    title: "Paso 1 · Servidor",
    body: [
      "Elige la versión de tu RouterOS y completa los datos. Compruébala en Winbox con /system resource print y mira la línea «version»: elegir la rama equivocada da error de sintaxis al importar el script.",
    ],
    list: [
      "RouterOS 6 — solo TCP, cifrados clásicos, un único servidor OVPN.",
      "RouterOS 7.0 – 7.16 — UDP/TCP, un único servidor (incluye 7.15 y 7.16).",
      "RouterOS 7.17+ — multi-instancia: varias VPN independientes por router.",
      "IP pública o dominio, puerto y protocolo. El botón 🎲 del puerto sortea uno entre 10000 y 49151, fuera de los puertos conocidos y del rango que usa el propio router.",
      "Red VPN: el rango privado que se repartirá entre los usuarios. El botón 🎲 sortea una red /24 privada evitando las típicas de casa (192.168.0/1/88), que chocarían con la LAN de quien se conecte.",
      "Caducidad de los certificados: útil para dar accesos temporales.",
    ],
    note: "El gateway y el pool se calculan solos a partir de la red. El pool arranca en la primera dirección utilizable, justo detrás del gateway (red 10.10.10.0/24 → gateway 10.10.10.1, pool 10.10.10.2-10.10.10.254).",
  },
  {
    icon: "👥",
    title: "Paso 2 · Usuarios",
    body: [
      "Añade a cada persona con su nombre y su contraseña. El botón 🎲 genera contraseñas seguras y el medidor avisa si la que escribiste es débil.",
    ],
    list: [
      "El nombre no admite espacios ni acentos: se limpia solo (Juan Pérez → JuanPerez).",
      "La contraseña hace dos cosas: autentica al usuario contra el router Y cifra su llave privada exportada. Mínimo 8 caracteres.",
      "Cada usuario genera dos archivos en el router: NOMBRE.crt y NOMBRE.key.",
      "El certificado CA es el mismo para todos: es lo que permite que un único servidor los valide a todos.",
    ],
    note: "Los contadores de arriba indican cuántos usuarios ya están en el router y cuántos quedan pendientes de aplicar.",
  },
  {
    icon: "⌨️",
    title: "Paso 3 · Scripts",
    body: [
      "Aquí obtienes cuatro scripts distintos, cada uno con su momento. Descarga el .rsc, súbelo a Files en WinBox/WebFig y ejecútalo desde New Terminal con /import file-name=<archivo>.rsc",
    ],
    list: [
      "Servidor + usuarios — la primera vez, o si cambiaste la configuración. Es reejecutable: la CA y el servidor no se recrean.",
      "Añadir usuarios — para altas posteriores. Reutiliza la CA y el perfil existentes: quien esté conectado no se entera.",
      "Comprobar la VPN — diagnóstico de solo lectura. Revisa certificados, pool, perfil, servidor, usuarios, sesiones activas, firewall y NAT, y escribe un informe en la terminal.",
      "Revocar acceso — corta el acceso de una persona: borra su /ppp secret, cierra su sesión y elimina su certificado.",
    ],
    note: "Importar es mucho más fiable que pegar: el script lleva bloques condicionales :if y al pegarlo el terminal puede quedarse esperando llaves. El firmado tarda de 1 a 3 minutos por usuario en routers pequeños.",
  },
  {
    icon: "📁",
    title: "Entre el paso 3 y el 4 · Descargar del router",
    body: [
      "El script exporta los certificados automáticamente. En Winbox → Files encontrarás el archivo de la CA y, por cada usuario, su .crt y su .key. Arrástralos a tu computadora.",
    ],
    list: [
      "ca-….crt — la Autoridad Certificadora, la MISMA para todos los usuarios.",
      "NOMBRE.crt — el certificado de ese usuario.",
      "NOMBRE.key — su llave privada, cifrada con su contraseña.",
    ],
  },
  {
    icon: "📱",
    title: "Paso 4 · Perfiles .ovpn",
    body: [
      "Arrastra de golpe TODOS los archivos que descargaste. La web los reparte sola entre tus usuarios por el nombre del archivo, y cada fila indica si esa persona ya está lista o qué le falta.",
      "Pulsa «Generar perfiles» y descárgalos: uno suelto desde su fila, o todos juntos en un ZIP.",
    ],
    list: [
      "Puedes soltar los archivos en varias tandas: se van acumulando.",
      "«Incluir usuario y contraseña dentro del .ovpn»: cómodo, pero quien abra el archivo las verá. Desactívalo si vas a repartirlos por correo o mensajería; OpenVPN las pedirá al conectar y la VPN funciona igual.",
      "«Enviar todo el tráfico por la VPN»: desactívalo para túnel dividido e indica qué redes deben ir por el túnel.",
      "El ZIP incluye además credenciales.csv (tabla de usuarios y contraseñas) y LEEME.txt (instrucciones para quien recibe el perfil).",
    ],
    note: "credenciales.csv lleva las contraseñas en texto plano: ese paquete es para el administrador. A cada persona se le entrega únicamente su archivo .ovpn.",
  },
  {
    icon: "🔌",
    title: "Conectar los dispositivos",
    body: [
      "Instala OpenVPN Connect desde la sección «Descargas» e importa el archivo .ovpn.",
    ],
    list: [
      "Windows / macOS / Linux: OpenVPN Connect u OpenVPN GUI → Import file.",
      "Android / iOS: OpenVPN Connect → Import → desde archivo.",
      "«Private Key Password» es la contraseña de esa MISMA persona: MikroTik exporta la llave privada cifrada y esa clave es la que la abre.",
    ],
    note: "Cada usuario tiene SU propia llave privada, cifrada con SU propia contraseña. La clave de un usuario no abre la llave de otro. Lo único común a todos es el certificado de la CA, que ya va embebido dentro de cada .ovpn.",
  },
  {
    icon: "🔗",
    title: "Extra · Enlazar otra sucursal",
    body: [
      "En el paso 3 hay un bloque plegable «Enlazar otro MikroTik (site-to-site)». El router remoto se conecta como un usuario más del mismo servidor.",
    ],
    list: [
      "Crea un usuario dedicado en el paso 2 (por ejemplo, sucursal-norte).",
      "Elige las redes del lado central que la sucursal debe alcanzar: se crean las rutas por el túnel.",
      "Sube los 3 archivos de ese usuario al router remoto y ejecuta el .rsc.",
    ],
  },
];

const TROUBLESHOOT = [
  {
    q: "No conecta: se queda en timeout.",
    a: "La IP pública es incorrecta o el puerto está cerrado. Comprueba el reenvío de puertos hacia el MikroTik y que exista una regla en /ip firewall filter (chain=input) que abra ese puerto con el protocolo correcto: si el servidor es UDP, una regla TCP no sirve.",
  },
  {
    q: "Conecta pero se cae enseguida o falla la autenticación.",
    a: "Usuario o contraseña incorrectos. Revisa /ppp secret en el router. Si cambiaste la contraseña de alguien, hay que regenerar su script (para actualizar el /ppp secret y volver a exportar su .key) y su .ovpn: el .key antiguo sigue cifrado con la clave vieja.",
  },
  {
    q: "Me pide «Private Key Password» y no sé cuál es.",
    a: "Es la contraseña de ese usuario, la misma que aparece en la tabla de entrega del paso 4 y en credenciales.csv. Cada usuario tiene la suya: la de una persona no abre la llave de otra.",
  },
  {
    q: "Error de certificado / TLS handshake failed.",
    a: "Sube los 3 archivos de la MISMA exportación y del usuario correcto: el CA es común, pero el .crt y el .key son de cada persona. La web avisa si el nombre del archivo no coincide con el usuario al que se asignó.",
  },
  {
    q: "Conecta pero no hay Internet.",
    a: "Suele ser el NAT. Ejecuta el script «Comprobar la VPN» del paso 3: lista las reglas de srcnat con sus contadores. Si la que cubre la red VPN marca 0 paquetes mientras hay clientes conectados, no está haciendo match. Ojo con los routers que tienen la IP pública en la interfaz «lo» y salen por CGNAT: ahí la regla correcta es src-nat a esa IP pública, no masquerade.",
  },
  {
    q: "Conecta pero no resuelve nombres (no abre páginas).",
    a: "Falta el DNS en el cliente: MikroTik no envía servidores DNS por su cuenta. Rellena «DNS para los clientes» en el paso 1 y vuelve a generar el .ovpn, que los incluye como dhcp-option DNS.",
  },
  {
    q: "En RouterOS 7.17+ falla el handshake con AES-GCM.",
    a: "Es un fallo conocido de RouterOS con AES-*-GCM («cipher final failed»). Genera el .ovpn con un cifrado CBC, que es la opción por defecto de la web.",
  },
  {
    q: "RouterOS 6 no acepta UDP.",
    a: "Es correcto: RouterOS 6 solo soporta OpenVPN sobre TCP. Al elegir esa versión, el script y el .ovpn fuerzan TCP automáticamente.",
  },
  {
    q: "Elegí RouterOS 7.17+ y da error de sintaxis al importar.",
    a: "Tu router es anterior a 7.17: el modelo de varios servidores OVPN llegó en esa versión. Selecciona «RouterOS 7.0 – 7.16» y vuelve a generar el script.",
  },
  {
    q: "La VPN funcionaba y de pronto dejó de conectar.",
    a: "Comprueba la caducidad de los certificados: si elegiste un plazo corto en el paso 1, al vencer dejan de validar. El script «Comprobar la VPN» indica si los certificados siguen presentes y son de confianza.",
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
          <span className="eyebrow mb-5">Guía completa</span>
          <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight text-slate-800 dark:text-white">
            Manual de <span className="text-gradient">usuario</span>
          </h1>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Un servidor OpenVPN en tu MikroTik y todos los usuarios que necesites, paso a paso.
          </p>
        </motion.div>

        {/* Resumen del asistente */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass glass-topline rounded-2xl p-6 mb-10"
        >
          <h2 className="font-bold text-lg text-slate-800 dark:text-white mb-4">
            El asistente en 4 pasos
          </h2>
          <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {RESUMEN.map((p) => (
              <li key={p.n} className="flex gap-3">
                <span className="shrink-0 grid place-items-center w-8 h-8 rounded-full bg-sky-500 text-white text-sm font-bold">
                  {p.n}
                </span>
                <span className="min-w-0">
                  <span className="block font-bold text-slate-800 dark:text-white text-sm">
                    {p.title}
                  </span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">
                    {p.desc}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </motion.div>

        {/* Pasos */}
        <div className="space-y-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 * i }}
              className="glass glass-hover rounded-2xl p-6"
            >
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-3">
                <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-500 text-xl shadow-lg shadow-cyan-500/30">
                  {step.icon}
                </span>
                {step.title}
              </h3>
              {step.body.map((p) => (
                <p key={p} className="text-slate-600 dark:text-slate-300 mb-2 leading-relaxed">
                  {p}
                </p>
              ))}
              {step.list && (
                <ul className="mt-3 space-y-1.5">
                  {step.list.map((li) => (
                    <li key={li} className="text-slate-600 dark:text-slate-300 text-sm flex gap-2">
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
            Solución de problemas
          </h2>
          <div className="space-y-3">
            {TROUBLESHOOT.map((item, i) => (
              <div key={item.q} className="glass rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
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
            to="/asistente/servidor"
            className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-600 hover:to-cyan-600 text-white font-bold py-3.5 px-7 rounded-xl text-center shadow-lg shadow-cyan-500/30 transition-all hover:-translate-y-0.5"
          >
            Empezar el asistente
          </Link>
          <Link to="/descargas" className="btn-ghost py-3.5 px-7">
            Descargar OpenVPN Connect
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default Manual;

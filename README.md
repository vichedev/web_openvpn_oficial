# Web OpenVPN — Generador de VPN para MikroTik

Aplicación web que monta **un servidor OpenVPN en un router MikroTik** y le da de
alta **todos los usuarios que necesites**. Genera los scripts de RouterOS y los
archivos `.ovpn` de cada cliente en unos clics.

**Todo ocurre en el navegador**: no hay backend, y ni los certificados que subes
ni las contraseñas salen de tu equipo.

## Modelo: un servidor, N usuarios

El MikroTik levanta **un único servidor OpenVPN** (una CA, un certificado de
servidor, un pool, un perfil PPP y un puerto). Cada usuario es solo:

```
certificado de cliente firmado por esa MISMA CA   +   /ppp secret
```

Todos se conectan al mismo servidor y al mismo puerto. Añadir o revocar un
usuario no toca la infraestructura ni afecta a los que ya están conectados.

> Compartir la CA es lo que evita el clásico `peer certificate verification
> failure`: el servidor solo puede presentar un certificado, así que todos los
> clientes deben estar firmados por la misma autoridad.

## Qué genera

| Sección | Artefacto |
|---------|-----------|
| **Servidor** (`/certificados`) | `.rsc` con el servidor completo (certificados, pool, perfil PPP, servidor OVPN, firewall, NAT) **+ los usuarios** seleccionados. Es idempotente: reejecutarlo no recrea la CA. |
| | `.rsc` de **solo añadir usuarios**: reutiliza la CA y el perfil existentes, sin tocar el servidor. |
| | `.rsc` de **revocación**: borra credenciales, corta la sesión activa y elimina el certificado de un usuario. |
| | `.rsc` de **diagnóstico**: revisa la VPN y escribe un informe (no modifica nada). |
| | `.rsc` para usar **otro MikroTik como cliente** (site-to-site). |
| **Configurar** (`/configuracion`) | Los `.ovpn` de **todos** los usuarios de una vez: se sueltan los certificados juntos, se reparten solos y se descargan en un ZIP. |
| **Manual** (`/manual`) | Manual de usuario completo dentro de la web. |

## Versiones de RouterOS

Tres ramas explícitas, porque la sintaxis del servidor OVPN cambia:

| Rama | Versiones | Servidor OVPN |
|------|-----------|---------------|
| `v6` | RouterOS 6.x | Único, `set enabled=yes`. Solo TCP, cifrados sin sufijo. |
| `v7-legacy` | RouterOS 7.0 – 7.16 | Único, `set enabled=yes` con `protocol=`. UDP/TCP. |
| `v7` | RouterOS 7.17+ | Multi-instancia, `add name=… disabled=no`. Varias VPN por router. |

El modelo multi-instancia llegó en **7.17**, no en 7.15: elegir la rama
equivocada da error de sintaxis al importar.

## Seguridad

- **Escapado de RouterOS**: todo valor que entra en un `.rsc` pasa por
  `escapeRos()` ([src/utils/rosSafe.js](src/utils/rosSafe.js)). Una comilla en
  una contraseña no puede cerrar la cadena y convertirse en un comando.
- **Nombres saneados**: los identificadores se limitan a `[A-Za-z0-9._-]`.
- **Contraseñas**: generador con `crypto.getRandomValues`, medidor de robustez y
  opción de no persistirlas en `sessionStorage`.
- **`.ovpn` sin credenciales**: opción para no embeber usuario y contraseña, útil
  si el archivo se envía por correo o mensajería.
- **Validación de certificados**: se comprueba que cada archivo subido es del
  tipo que dice ser antes de generar nada.
- **Firewall completo**: el script abre el puerto (`chain=input`) **y** permite
  el tránsito (`chain=forward`), que es lo que suele faltar cuando la VPN
  conecta pero no navega.
- **NAT en modo automático**: si el router ya tiene reglas de salida, el script
  las respeta y no crea ninguna; solo añade `masquerade` cuando no hay ninguna, y
  siempre al final de la cadena. Imponer una regla por delante puede dejar la VPN
  sin retorno en routers con la IP pública en loopback y salida por CGNAT.

## Desarrollo

Proyecto **React 19 + Vite 7 + Tailwind CSS 4**.

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm test         # tests del generador (node:test, sin dependencias)
npm run lint     # análisis estático
npm run build    # build de producción
npm run check    # lint + tests + build
```

## Estructura

```
src/
├── components/
│   ├── CertificateSection.jsx  # paso 1: servidor + gestor de usuarios
│   ├── UserManager.jsx         # alta, edición y revocación de usuarios
│   ├── ClientForm.jsx          # paso 2: .ovpn de todos los usuarios (por lotes)
│   ├── SiteToSiteForm.jsx      # otro MikroTik como cliente (dentro del paso 1)
│   ├── Manual.jsx              # manual de usuario
│   └── ui/FormBits.jsx         # campos, toggles, visor de scripts
├── context/
│   └── SessionContext.jsx      # servidor + lista de usuarios (sessionStorage)
└── utils/
    ├── mikrotikGenerator.js    # generadores de .rsc y .ovpn
    ├── rosSafe.js              # escapado y validación (IP, CIDR, nombres)
    ├── password.js             # generación y evaluación de contraseñas
    ├── certMatcher.js          # reparte los certificados subidos entre los usuarios
    └── zip.js                  # empaquetado ZIP sin dependencias
tests/
├── generator.test.js           # generador de scripts y .ovpn
├── batch.test.js               # reparto de certificados y ZIP
└── password.test.js            # generación y validación de contraseñas
```

## Despliegue

Incluye `Dockerfile` multi-etapa, `docker-compose.yml` y configuración de nginx
(usuario sin privilegios, gzip, cabeceras de seguridad y caché de assets).

```bash
docker compose up -d --build   # publica en http://localhost:8584
```

Dentro del contenedor nginx escucha en el **8080** (un usuario sin privilegios no
puede abrir el 80); el compose lo publica en el 8584.

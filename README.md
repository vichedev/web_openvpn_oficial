# Web OpenVPN — Generador de VPN para MikroTik

Aplicación web que hace **fácil crear una VPN OpenVPN en routers MikroTik**.
Genera todo lo necesario en pocos clics: el script completo del servidor, el
archivo `.ovpn` del cliente y el script para enlazar dos routers (site-to-site).

## ¿Qué hace?

| Sección | Función |
|---------|---------|
| **Servidor** (`/certificados`) | Genera un único script `.rsc` que monta el servidor OpenVPN completo: certificados, pool de IP, perfil PPP, usuario, servidor OVPN, firewall y NAT. |
| **Configurar** (`/configuracion`) | Genera el archivo `.ovpn` del cliente (con certificados embebidos) y un script `.rsc` para usar otro MikroTik como cliente. |
| **Manual** (`/manual`) | Manual de usuario paso a paso, dentro de la propia web. |

Compatible con **RouterOS 6** y **RouterOS 7** (un único script de RouterOS 7
sirve para cualquier versión 7.x, de la 7.0 a la 7.15+).

## Cómo crear una VPN (resumen)

1. **Servidor** → completa los datos → genera y pega el script en el MikroTik.
2. Descarga `ca.crt`, `NOMBRE.crt` y `NOMBRE.key` desde **Files** del router.
3. **Configurar** → sube esos 3 archivos → descarga el `.ovpn`.
4. Importa el `.ovpn` en la app OpenVPN del dispositivo.

Guía detallada en [MANUAL.md](MANUAL.md) o en la sección **Manual** de la web.

## Desarrollo

Proyecto **React 19 + Vite 7 + Tailwind CSS 4**.

```bash
npm install      # instalar dependencias
npm run dev      # servidor de desarrollo
npm run build    # build de producción
npm run preview  # previsualizar el build
npm run lint     # análisis estático
```

## Estructura

```
src/
├── components/
│   ├── CertificateSection.jsx  # sección "Servidor"
│   ├── Mikrotik6Form.jsx       # formulario cliente RouterOS 6
│   ├── Mikrotik7Form.jsx       # formulario cliente RouterOS 7
│   ├── Configuracion.jsx       # pestañas de configuración del cliente
│   ├── Manual.jsx              # manual de usuario
│   └── ...
└── utils/
    └── mikrotikGenerator.js    # generadores: .ovpn, script servidor, script cliente-router
```

## Despliegue

Incluye `Dockerfile`, `docker-compose.yml` y configuración de `nginx` para
servir el build de producción.

```bash
docker compose up -d --build
```

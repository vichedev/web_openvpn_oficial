# Manual de usuario — Un servidor OpenVPN en tu MikroTik, con todos tus usuarios

Esta guía explica, paso a paso, cómo montar un servidor OpenVPN en un router
MikroTik y dar de alta a todas las personas que lo van a usar. La aplicación web
automatiza casi todo: tú solo importas un archivo en el router.

> El mismo manual está disponible dentro de la web, en la sección **Manual**.

---

## Antes de empezar

Necesitas:

- Acceso al MikroTik mediante **Winbox** o **WebFig**.
- La **IP pública** del MikroTik (o un dominio DDNS que apunte a él).
- El **puerto** de OpenVPN abierto/redirigido hacia el router.
- Saber tu versión de RouterOS: Winbox → **System → Resources**.

### Cómo funciona el modelo

El router levanta **un único servidor OpenVPN**: una CA, un certificado de
servidor, un pool de IPs, un perfil PPP y un puerto. Cada usuario añade solo su
certificado (firmado por esa misma CA) y sus credenciales PPP.

```text
        ┌──────────────── MikroTik ────────────────┐
        │  servidor OVPN  ·  CA  ·  perfil  ·  pool │
        └───┬─────────────┬─────────────┬───────────┘
       usuario1      usuario2      usuario3   ← cert + ppp secret propios
```

Añadir o revocar a alguien **no toca el servidor** ni a los demás: quien esté
conectado en ese momento no se entera.

### El asistente

Todo el proceso vive en la sección **Asistente**, dividida en cuatro pasos. Se
puede ir y volver libremente: la barra lateral marca en verde los completados y
el panel de resumen muestra siempre la configuración actual.

| Paso | Dónde | Qué haces |
|------|-------|-----------|
| 1. Servidor | `/asistente/servidor` | Datos del MikroTik. Se define una sola vez. |
| 2. Usuarios | `/asistente/usuarios` | Añades a todas las personas que se conectarán. |
| 3. Scripts  | `/asistente/scripts`  | Descargas el `.rsc` y lo importas en el router. |
| 4. Perfiles | `/asistente/perfiles` | Generas un `.ovpn` por persona. |

---

## Paso 1 — Servidor

1. Selecciona la versión de RouterOS:
   - **RouterOS 6** — solo TCP, cifrados clásicos, servidor único.
   - **RouterOS 7.0 – 7.16** — UDP/TCP, servidor único (incluye 7.15 y 7.16).
   - **RouterOS 7.17+** — multi-instancia: varias VPN independientes por router.
2. Completa cómo llegan los clientes:
   - **IP pública o dominio** del MikroTik.
   - **Puerto** — 1194 es el estándar, pero vale cualquiera. El botón 🎲 sortea
     uno entre 10000 y 49151, fuera de los puertos conocidos y del rango efímero
     que usa el propio router. Un puerto alto recibe muchos menos escaneos.
   - **Protocolo** — UDP recomendado; en RouterOS 6 se fuerza TCP.
3. **Red VPN** — el rango privado que se reparte entre los usuarios. El botón 🎲
   sortea una red `/24` privada evitando las típicas de casa (`192.168.0/1/88`),
   que chocarían con la LAN de quien se conecta.
4. **Caducidad** de los certificados, con presets de 30 días a 10 años.

En **Ajustes avanzados** (plegado) están el nombre de la VPN, el gateway, el
pool, el modo de NAT y el tamaño de clave. Los valores por defecto sirven.

> **El gateway y el pool se calculan solos.** El pool arranca en la primera
> dirección utilizable, justo detrás del gateway:
> `10.10.10.0/24` → gateway `10.10.10.1`, pool `10.10.10.2-10.10.10.254`.

> **Elegir mal la versión da error de sintaxis.** El modelo multi-instancia
> (`add name=…`) llegó en 7.17, **no** en 7.15.

### Sobre el NAT

El modo por defecto es **Automático**: el script mira si el router ya tiene
reglas en `srcnat` y, si las hay, **las respeta y no crea ninguna**. Solo añade
`masquerade` cuando no existe ninguna, y siempre al final de la cadena.

Esto evita un fallo real: en un router con la IP pública en la interfaz `lo` y
salida por CGNAT, una regla `masquerade` colocada por delante traduce a la IP del
enganche en vez de a la pública, y los clientes salen sin retorno — la VPN
conecta pero no hay Internet.

---

## Paso 2 — Usuarios

1. Escribe el **nombre** (sin espacios ni acentos; se limpia solo) y la
   **contraseña**. El botón 🎲 genera una contraseña aleatoria segura y el
   medidor avisa si la escrita es débil.
2. Pulsa **Añadir usuario**. Repite para cada persona.

La contraseña hace dos cosas: **autentica al usuario** contra el router **y
cifra su llave privada** exportada. Mínimo 8 caracteres (lo exige MikroTik).

Los contadores indican cuántos usuarios ya están en el router y cuántos quedan
pendientes de aplicar.

---

## Paso 3 — Scripts

Cuatro scripts, cada uno con su momento:

| Script | Cuándo |
|--------|--------|
| **Servidor + usuarios** | La primera vez, o si cambiaste la configuración. Reejecutable: la CA y el servidor no se recrean. |
| **Añadir usuarios** | Altas posteriores. Reutiliza la CA y el perfil existentes; quien esté conectado no se entera. |
| **Comprobar la VPN** | Diagnóstico de **solo lectura**: certificados, pool, perfil, servidor, usuarios, sesiones activas, firewall y NAT con contadores. |
| **Revocar acceso** | Corta el acceso de una persona concreta. |

Para aplicarlo:

1. Descarga el `.rsc`.
2. Súbelo a **Files** en WinBox/WebFig.
3. En **New Terminal**:

   ```text
   /import file-name=servidor-openvpn_NOMBRE.rsc
   ```

> **Importar, no pegar.** El script tiene bloques condicionales `:if`; al pegarlo
> en una consola lenta el terminal puede quedarse esperando llaves `{[{...`.
>
> El firmado tarda **1–3 minutos por usuario** en routers pequeños. Si aparecen
> avisos de recursos ya existentes, ignóralos: está pensado para reejecutarse.

En este paso también está, plegado, **Enlazar otro MikroTik (site-to-site)**.

---

## Entre el paso 3 y el 4 — Descargar del router

El script exporta los certificados automáticamente. En Winbox → **Files**:

- `ca-….crt` — la Autoridad Certificadora, **la misma para todos**.
- `NOMBRE.crt` — el certificado de cada usuario.
- `NOMBRE.key` — su llave privada, cifrada con su contraseña.

Arrastra los archivos a tu computadora.

---

## Paso 4 — Perfiles `.ovpn`

1. **Arrastra de golpe todos los archivos** que descargaste. Se reparten
   automáticamente entre tus usuarios por el nombre del archivo, y puedes
   soltarlos en varias tandas.
2. Cada fila indica si esa persona está lista o qué le falta.
3. Ajusta las opciones (se aplican a todos los perfiles):
   - **Incluir usuario y contraseña dentro del .ovpn** — cómodo, pero quien abra
     el archivo las verá. Desactivado, OpenVPN las pide al conectar y la VPN
     funciona exactamente igual.
   - **Enviar todo el tráfico por la VPN** — desactívalo para túnel dividido e
     indica qué redes deben ir por el túnel.
4. Pulsa **Generar perfiles**.

### Descarga y entrega

- Un perfil suelto, desde la fila de cada usuario.
- **Todos en un ZIP**, que incluye:

```text
vpn_NOMBRE_N-usuarios.zip
├── usuario1.ovpn
├── usuario2.ovpn
├── credenciales.csv     ← usuario;contraseña;servidor;puerto;protocolo;archivo
└── LEEME.txt            ← instrucciones para quien recibe el perfil
```

La tabla de **Entrega a los usuarios** muestra cada contraseña (ocultable y
copiable con un clic), porque es también su *Private Key Password*.

> `credenciales.csv` lleva las contraseñas en texto plano. **Ese paquete es para
> el administrador**: a cada persona se le entrega únicamente su `.ovpn`.
> El CSV se puede excluir del ZIP con un interruptor.

---

## Conectar los dispositivos

| Dispositivo | App | Cómo |
|-------------|-----|------|
| Windows / Mac / Linux | OpenVPN Connect / OpenVPN GUI | Import file → seleccionar `.ovpn` |
| Android / iOS | OpenVPN Connect | Import → desde archivo |
| Otro MikroTik | — | Bloque **Enlazar otro MikroTik** del paso 3 |

### Las dos contraseñas del diálogo de conexión

Al conectar, OpenVPN puede pedir hasta tres campos:

- **Username / Password** — las credenciales PPP. Viajan al router, que decide
  si te deja entrar. Si las embebiste en el `.ovpn`, no las pide.
- **Private Key Password** — descifra la llave privada. **Se usa solo en tu
  equipo**, nunca sale de él.

En esta herramienta **ambas son la misma contraseña**, la que pusiste al usuario.

> **Cada usuario tiene su propia llave privada**, cifrada con **su propia**
> contraseña. La clave de una persona no abre la llave de otra. Lo único común a
> todos es el certificado de la CA, que ya va embebido dentro de cada `.ovpn`.

---

## Añadir o quitar usuarios más adelante

**Añadir:** paso 2 → añade los nuevos → paso 3, pestaña **Añadir usuarios**. Ese
script comprueba que la CA y el perfil existen y solo da de alta a los nuevos.

**Revocar:** paso 3, pestaña **Revocar acceso**. El script generado:

1. Borra su `/ppp secret` — esto es lo que corta el acceso de verdad.
2. Cierra su sesión activa (`/ppp active remove`).
3. Revoca y elimina su certificado y sus archivos exportados.

> MikroTik no publica CRL a los clientes OpenVPN, así que **eliminar el
> `/ppp secret` es lo que realmente bloquea al usuario**. El `.ovpn` que ya tenga
> esa persona seguirá en su equipo, pero dejará de autenticar.

---

## Enlazar dos sucursales (site-to-site)

1. Crea en el paso 2 un usuario dedicado, por ejemplo `sucursal-norte`.
2. En el paso 3, abre **Enlazar otro MikroTik**, selecciónalo y elige las redes
   del lado central que la sucursal debe alcanzar.
3. Sube los 3 archivos de ese usuario al router remoto y ejecuta el `.rsc`.

---

## Solución de problemas

Antes que nada: ejecuta el script **Comprobar la VPN** del paso 3. Revisa los
puntos habituales y escribe un informe sin modificar nada.

| Síntoma | Causa probable / solución |
|---------|---------------------------|
| Timeout, no conecta | IP pública incorrecta o puerto cerrado. Revisa el reenvío de puertos y que la regla de `chain=input` use el **protocolo correcto** (si el servidor es UDP, una regla TCP no sirve). |
| Conecta y se cae / falla autenticación | Usuario o contraseña incorrectos. Si cambiaste la contraseña, regenera el script **y** el `.ovpn`: el `.key` antiguo sigue cifrado con la clave vieja. |
| Pide *Private Key Password* y no la sé | Es la contraseña de ese usuario: está en la tabla de entrega del paso 4 y en `credenciales.csv`. |
| TLS handshake failed | Sube los 3 archivos de la **misma** exportación y del usuario correcto. La web avisa si el nombre no coincide. |
| Conecta pero no hay Internet | Casi siempre el NAT. Mira los contadores de `srcnat` en el diagnóstico: si la regla que cubre la red VPN marca 0 paquetes, no hace match. |
| Conecta pero no abre páginas | Falta DNS: MikroTik no lo envía. Rellena «DNS para los clientes» y regenera el `.ovpn`. |
| `cipher final failed` en 7.17+ | Fallo conocido con AES-*-GCM. Usa un cifrado **CBC** (es el predeterminado). |
| RouterOS 6 no acepta UDP | Correcto: v6 solo soporta TCP; se fuerza automáticamente. |
| Error de sintaxis al importar en 7.15/7.16 | Elegiste la rama 7.17+. Usa «RouterOS 7.0 – 7.16». |
| Funcionaba y dejó de conectar | Revisa la caducidad de los certificados. El diagnóstico dice si siguen presentes y son de confianza. |

---

## Comandos útiles de verificación (en el MikroTik)

```text
/interface ovpn-server server print      # estado del servidor
/ppp secret print                        # usuarios dados de alta
/ppp active print                        # clientes conectados ahora
/certificate print                       # certificados y su estado
/ip pool print                           # IPs disponibles para los clientes
/ip firewall nat print stats             # contadores del NAT (clave si no navegan)
/log print where topics~"ovpn"           # registro de OpenVPN
```

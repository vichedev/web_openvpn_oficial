# Manual de usuario — Crear una VPN OpenVPN desde un MikroTik

Esta guía explica, paso a paso, cómo montar un servidor OpenVPN en un router
MikroTik y conectar tus dispositivos. La aplicación web automatiza casi todo:
solo tienes que copiar y pegar.

> El mismo manual está disponible dentro de la web, en la sección **Manual**.

---

## Antes de empezar

Necesitas:

- Acceso al MikroTik mediante **Winbox** o **WebFig**.
- La **IP pública** del MikroTik (la IP por la que se le ve desde Internet).
- El **puerto** de OpenVPN (por defecto `1194`) abierto/redirigido hacia el router.
- Saber tu versión de RouterOS: Winbox → **System → Resources**.

Resumen del flujo:

| Fase | Dónde | Qué haces |
|------|-------|-----------|
| 1. Servidor   | Sección **Servidor**    | Generas y ejecutas el script en el MikroTik. |
| 2. Certificados | Winbox → **Files**    | Descargas `ca.crt`, `NOMBRE.crt` y `NOMBRE.key`. |
| 3. Cliente    | Sección **Configurar**  | Generas el archivo `.ovpn` e importas en el dispositivo. |

---

## Paso 1 — Generar el script del servidor

1. Abre la sección **Servidor**.
2. Selecciona la versión de RouterOS:
   - **v6 (Legacy)** — RouterOS 6. Solo TCP.
   - **v7 (6.15–7.14)** — RouterOS 7, sintaxis con `set`.
   - **v7.15+** — RouterOS 7.15 o superior, sintaxis con `add`.
3. Completa los datos:
   - **Nombre del cliente VPN** — el usuario (ej. `usuario01`).
   - **Contraseña del cliente** — mínimo 8 caracteres.
   - **IP pública del servidor**.
   - **Puerto** y **protocolo** (`1194/UDP` recomendado; en v6 solo TCP).
4. Pulsa **Generar script del servidor**.

El script generado incluye **todo** lo necesario:

1. Certificados CA, servidor y cliente.
2. Firmado y marcado como confiables.
3. Pool de direcciones IP para los clientes VPN.
4. Perfil PPP.
5. Usuario VPN (`/ppp secret`).
6. Servidor OpenVPN activado.
7. Regla de firewall que abre el puerto.
8. Regla de NAT (masquerade) para dar salida a Internet.
9. Exportación automática de los certificados.

---

## Paso 2 — Ejecutar el script en el MikroTik

- **Opción A (terminal):** copia el script con **Copiar todo**, abre Winbox →
  **New Terminal**, pégalo y pulsa Enter.
- **Opción B (archivo):** descarga el `.rsc`, súbelo a **Files** y ejecútalo:

  ```
  /import file-name=servidor-openvpn.rsc
  ```

> El firmado de certificados tarda **1–2 minutos**. Es normal, espera a que termine.
> Si aparecen avisos de recursos ya existentes, es seguro ignorarlos.

---

## Paso 3 — Descargar los certificados

El script exporta los certificados automáticamente. En Winbox → **Files**
encontrarás:

- `ca.crt` — certificado de la Autoridad Certificadora.
- `NOMBRE.crt` — certificado del cliente.
- `NOMBRE.key` — llave privada del cliente.

Arrastra esos 3 archivos a tu computadora.

---

## Paso 4 — Generar el archivo `.ovpn`

1. Abre la sección **Configurar**.
2. Elige la pestaña **Mikrotik 6** o **Mikrotik 7** según tu router.
3. Rellena: IP del servidor, usuario y contraseña (los del paso 1), puerto,
   protocolo y cifrado.
4. Sube los 3 archivos: **Certificado CA**, **Certificado Cliente** y
   **Llave Cliente**.
5. Pulsa **Generar OVPN** y luego **Descargar OVPN**.

El archivo `.ovpn` lleva los certificados embebidos: es lo único que necesita
el dispositivo cliente.

---

## Paso 5 — Conectar el dispositivo

| Dispositivo | App | Cómo |
|-------------|-----|------|
| Windows / Mac / Linux | OpenVPN Connect / OpenVPN GUI | Import file → seleccionar `.ovpn` |
| Android / iOS | OpenVPN Connect | Import → desde archivo |
| Otro MikroTik | — | Usa el botón **Script Router Cliente (.rsc)** de la sección Configurar |

Si pide usuario y contraseña, son los del paso 1.

---

## Solución de problemas

| Síntoma | Causa probable / solución |
|---------|---------------------------|
| Timeout, no conecta | IP pública incorrecta o puerto cerrado. Revisa el reenvío de puertos y la regla de `/ip firewall filter`. |
| Conecta y se cae / falla autenticación | Usuario o contraseña incorrectos. Revisa `/ppp secret` en el router. |
| TLS handshake failed / error de certificado | Sube los 3 archivos de la **misma** exportación. El certificado del servidor debe tener `trusted=yes`. |
| Conecta pero no hay Internet | Falta el NAT. Revisa la regla `masquerade` en `/ip firewall nat`. |
| RouterOS 6 no acepta UDP | Correcto: v6 solo soporta TCP. Usa la pestaña Mikrotik 6. |

---

## Comandos útiles de verificación (en el MikroTik)

```
/interface ovpn-server server print      # estado del servidor
/ppp active print                        # clientes conectados
/certificate print                       # certificados y su estado
/log print where topics~"ovpn"           # registro de OpenVPN
```

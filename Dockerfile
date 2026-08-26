# ---------- Etapa de build ----------
FROM node:20-alpine AS build

WORKDIR /app

# Instalacion reproducible: npm ci respeta package-lock.json exactamente.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Etapa de produccion ----------
FROM nginx:alpine

# Usuario sin privilegios. Como no es root, nginx NO puede abrir el puerto 80:
# por eso escucha en el 8080 (ver nginx/conf.d/default.conf). El compose lo
# publica hacia fuera en el 8584.
RUN addgroup -g 1001 web-openvpn \
    && adduser -D -u 1001 -G web-openvpn -s /bin/sh -h /home/web-openvpn web-openvpn \
    && mkdir -p /var/cache/nginx/client_temp \
                /var/cache/nginx/proxy_temp \
                /var/cache/nginx/fastcgi_temp \
                /var/cache/nginx/uwsgi_temp \
                /var/cache/nginx/scgi_temp \
    && touch /run/nginx.pid \
    && chown -R web-openvpn:web-openvpn /var/cache/nginx /run/nginx.pid /usr/share/nginx/html

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER web-openvpn

# Puerto INTERNO del contenedor. El mapeo al host se define en docker-compose.
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1:8080/ > /dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]

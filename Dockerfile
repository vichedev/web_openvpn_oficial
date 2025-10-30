# Etapa de build - CAMBIAR A NODE 20
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install

# Copiar código fuente
COPY . .


# Compilar con Vite
RUN npx vite build

# Etapa de producción
FROM nginx:alpine

# Crear usuario no-root
RUN addgroup -g 1001 web-openvpn-rediseño && \
    adduser -D -u 1001 -G web-openvpn-rediseño -s /bin/sh -h /home/web-openvpn-rediseño web-openvpn-rediseño

# Crear carpetas necesarias y asignar permisos
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /run && \
    touch /run/nginx.pid && \
    chown -R web-openvpn-rediseño:web-openvpn-rediseño /var/cache/nginx /run /usr/share/nginx/html

# Copiar configuraciones
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copiar build del frontend
COPY --from=build /app/dist /usr/share/nginx/html

USER web-rnc-oficial
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
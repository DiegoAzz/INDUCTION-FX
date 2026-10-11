FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el código de la aplicación
COPY . .

# Puerto expuesto por defecto
EXPOSE 3000

# Variables de entorno
ENV PORT=3000
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

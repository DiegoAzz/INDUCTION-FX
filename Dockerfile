FROM node:20-alpine

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm install --omit=dev

# Copiar el código de la aplicación
COPY . .

# Generar cliente de Prisma para PostgreSQL
RUN npx prisma generate || true

# Puerto expuesto por defecto
EXPOSE 3000

# Variables de entorno
ENV PORT=3000
ENV NODE_ENV=production

# Comando para iniciar la aplicación (ejecuta migración de BD si DATABASE_URL está activa)
CMD ["sh", "-c", "npx prisma db push --skip-generate || true; node server.js"]

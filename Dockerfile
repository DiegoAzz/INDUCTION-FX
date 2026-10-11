FROM node:20-slim

# Instalar OpenSSL requerido por Prisma
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar esquema de Prisma y código
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

# Puerto expuesto
EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Ejecutar migración de PostgreSQL y arrancar el servidor
CMD ["sh", "-c", "npx prisma db push --skip-generate || true; node server.js"]

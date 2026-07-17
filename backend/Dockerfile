FROM node:20-alpine AS builder

WORKDIR /app

# 1. Preparar y compilar la librería compartida (shared)
# Copiamos primero el package.json para aprovechar caché de capas si es posible
COPY shared/package*.json ./shared/
WORKDIR /app/shared
RUN --mount=type=cache,target=/root/.npm npm install

# Copiamos el resto de archivos de shared
COPY shared ./
# Antes de compilar shared, generamos el cliente prisma para que los tipos estén disponibles
RUN npm run prisma:generate
# Compilamos shared
RUN npm run build

# 2. Preparar y compilar el servicio específico
# Declaramos la variable de argumento aquí para que el paso anterior de 'shared' esté 100% cacheado
ARG SERVICE_DIR
ENV SERVICE_DIR=${SERVICE_DIR}

WORKDIR /app
# Copiamos solo package.json del servicio para aprovechar caché de capas.
# Como compartimos la misma estructura, file:../../shared funcionará correctamente.
COPY ${SERVICE_DIR}/package*.json ./${SERVICE_DIR}/

WORKDIR /app/${SERVICE_DIR}
RUN --mount=type=cache,target=/root/.npm npm install

# Ahora copiamos el resto del código del servicio y lo compilamos
WORKDIR /app
COPY ${SERVICE_DIR} ./${SERVICE_DIR}

WORKDIR /app/${SERVICE_DIR}
RUN npm run build

# 2.5. Limpieza de dependencias de desarrollo para aligerar la imagen final
WORKDIR /app/shared
RUN npm prune --omit=dev

WORKDIR /app/${SERVICE_DIR}
RUN npm prune --omit=dev

# 3. Imagen final de stage
FROM node:20-alpine
ARG SERVICE_DIR
ENV NODE_ENV=stage

WORKDIR /app

# Copiamos 'shared' porque 'node_modules' del servicio contiene un enlace (symlink) que apunta ahí
COPY --from=builder /app/shared /app/shared

# Copiamos el servicio compilado
COPY --from=builder /app/${SERVICE_DIR} /app/${SERVICE_DIR}

# Establecemos el directorio de trabajo final al del servicio
WORKDIR /app/${SERVICE_DIR}

# Aunque algunos packages del gateway dicen ts-node-dev en su "start", 
# "node dist/index.js" es estándar ya que todos ejecutan tsc en build.
CMD ["node", "dist/index.js"]


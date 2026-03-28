# Guía de Despliegue en Render (LCRC Backend)

Esta guía detalla cómo publicar la arquitectura backend en Render.com utilizando la funcionalidad de despliegue desde GitHub mediante Docker, y provisioning de las bases de datos manejadas por la plataforma. Desplegaremos usando la rama `stage`.

---

## 1. Bases de Datos (Managed Services)

Render ofrece servicios gestionados que sustituyen la necesidad de montar nuestras propias imágenes de bases de datos.

### A. Crear PostgreSQL
1. En tu panel de Render, haz clic en **New** -> **PostgreSQL**.
2. Asigna un nombre (p.ej: `lcrc-db-stage`) y selecciona tu región más cercana.
3. Elige el plan gratuito (Free) o el que necesites.
4. Clic en **Create PostgreSQL**.
5. Una vez creada, copia y guarda la **Internal Database URL** (empezará por `postgresql://...`). La usaremos en todos los microservicios.

### B. Crear Redis
1. Haz clic en **New** -> **Redis**.
2. Asígnale un nombre (p.ej: `lcrc-redis-stage`) y usa la misma región.
3. Clic en **Create Redis**.
4. Una vez creado, copia y guarda la **Internal Redis URL** (empezará por `redis://...`).

> **Importante:** Las URLs "Internal" aseguran que la comunicación ocurre por la red privada gratuita e hiper-rápida de Render. Las URLs "External" solo se deben usar cuando te conectes desde tu ordenador local.

---

## 2. Desplegar los Microservicios (Private Services)

El backend consta de varios servicios (`auth-service`, `user-service`, `admin-service`, etc.). Ya que estos no necesitan ser contactados directamente desde internet, los desplegaremos como "Private Services" para mayor seguridad.

Para **cada uno** de los servicios (`services/auth-service`, `services/user-service`, ...), repite estos pasos:

1. Ve a **New** -> **Private Service**.
2. Conecta tu repositorio de GitHub y selecciona tu repositorio `lcrcDev`.
3. Rellena el formulario de la siguiente manera:
   - **Name:** Nombre del servicio (p.ej. `lcrc-auth-service-stage`).
   - **Branch:** `stage`
   - **Root Directory:** Déjalo completamente en blanco (muy importante, o fallará el Dockerfile).
   - **Environment:** Selecciona `Docker`.
   - **Region:** La misma que las bases de datos.
   - **Docker Context:** Escribe `backend/` (Aquí le decimos desde dónde leer el Dockerfile unificado).
4. Desplázate a la sección de **Advanced**:
   - Pulsa en **Add Build Arg**:
     - Key: `SERVICE_DIR`
     - Value: `services/auth-service` (o `services/el-nombre-de-turno`).
   - Pulsa en **Add Environment Variable** para conectar la base de datos y redis:
     - `DATABASE_URL` = (Pega aquí tu Internal Database URL de Postgres).
     - `REDIS_HOST` y config si la usas = (Pega los credenciales de la Internal Redis URL).
     - Añade en esta pantalla **cualquier variable** del `.env` local que el servicio requiera (ej: claves secretas JWT, puertos, credenciales SMTP).
     - Puedes forzar el puerto del servicio añadiendo la variable `PORT` (ej: `PORT=3001`), Render la detectará automáticamente.
5. Clic en **Create Private Service**. Render compilará tu repositorio descargando los datos compartidos. Te devolverá en su panel una URL privada terminada en `.onrender.com`.

---

## 3. Desplegar el API Gateway (Web Service)

El API Gateway es el único punto de entrada a tu red, por lo que este sí debe estar expuesto a internet.

1. Selecciona **New** -> **Web Service**.
2. Conecta tu cuenta y el repo, seleccionando la rama `stage`.
3. Configuración del formulario:
   - **Name:** `lcrc-api-gateway-stage`
   - **Branch:** `stage`
   - **Root Directory:** Vacío.
   - **Environment:** Selecciona `Docker`.
   - **Docker Context:** `backend/`.
4. En **Advanced**:
   - **Add Build Arg**:
     - Key: `SERVICE_DIR`
     - Value: `api-gateway`
   - Configura las **Environment Variables**:
     - Añade todas las variables del `.env` del API Gateway (claves de encriptación, puerto, webhooks, etc.).
     - **MUY IMPORTANTE:** Si tu API Gateway usa variables en su `.env` para saber en qué IP están los otros microservicios (por ejemplo: `AUTH_SERVICE_URL=http://localhost:3001`), deberás inyectar las variables apuntando a las **URLs Privadas** de los servicios que acabamos de crear en el paso 2 (ej: `AUTH_SERVICE_URL=http://lcrc-auth-service-stage:10000`).
5. **Create Web Service**. 

Una vez finalizado, Render te proporcionará una URL pública segura (https://lcrc-api-gateway-stage.onrender.com) la cual es tu endpoint en vivo y deberá ser la URL colocada en las variables `.env` de tu frontend Vite.

---

### Migraciones (Paso Final)
Como no hemos puesto un automigrado en el despliegue del Docker:
1. Asegúrate de compilar y correr `npx prisma migrate deploy` o `npx prisma db push` apuntando a la **External Database URL** de tu PostgreSQL de Render temporalmente desde tu equipo local para sincronizar la BD al esquema, o usa las tareas de scripts de Render para invocar un build externo antes de la salida a producción.

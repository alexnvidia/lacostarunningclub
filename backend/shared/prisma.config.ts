// Prisma config — la URL de la base de datos se lee desde process.env (nunca lanza excepciones).
// - Durante `prisma generate` (build Docker): DATABASE_URL no existe → undefined, Prisma lo ignora.
// - Durante `prisma migrate deploy` (local/Render): DATABASE_URL viene inyectada → se usa correctamente.
// NO usar env() de prisma/config: lanza PrismaConfigEnvError si la variable no existe.
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: process.env.DATABASE_URL ?? '',
    },
});

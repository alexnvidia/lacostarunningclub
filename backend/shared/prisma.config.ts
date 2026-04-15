// Prisma config — la URL de la base de datos se lee desde schema.prisma en runtime.
// NO se define aquí para evitar el error PrismaConfigEnvError durante el build de Docker,
// ya que DATABASE_URL es una variable de runtime, no de build.
import { defineConfig } from "prisma/config";

export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
});

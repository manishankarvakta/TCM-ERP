import { defineConfig, env } from "prisma/config";
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env automatically
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"), // now loaded from .env automatically
  },
});

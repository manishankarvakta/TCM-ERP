// ============================================
// SIMPLE HEALTH CHECK FOR DOCKER
// ============================================
// Used by docker-compose healthcheck

import { prisma } from "@/lib/prisma";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const probe = searchParams.get("probe") || "liveness";

    if (probe === "liveness") {
      return Response.json({
        status: "ok",
        service: "espacio-app",
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development"
      }, { status: 200 });
    }

    // Readiness: Verify database availability
    await prisma.$queryRaw`SELECT 1`;
    
    return Response.json({
      status: "ready",
      database: "healthy",
      service: "espacio-app",
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    return Response.json({
      status: "error",
      message: "Service unavailable",
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

// ============================================
// SIMPLE HEALTH CHECK FOR DOCKER
// ============================================
// Used by docker-compose healthcheck

export async function GET() {
  try {
    const healthData = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'espacio-app',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    return Response.json(healthData, { status: 200 });
  } catch (error) {
    return Response.json({
      status: 'error',
      message: 'Service unavailable',
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

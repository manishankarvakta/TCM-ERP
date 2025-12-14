// ============================================
// FOR PAGES ROUTER (Next.js 12 and below)
// ============================================
// File location: pages/api/health.js

export default function handler(req, res) {
    try {
      // Basic health check
      const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'espacio-app',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
      };
  
      return res.status(200).json(healthData);
    } catch (error) {
      return res.status(503).json({
        status: 'error',
        message: 'Service unavailable',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  
  // ============================================
  // FOR APP ROUTER (Next.js 13+)
  // ============================================
  // File location: app/api/health/route.js
  
  export async function GET() {
    try {
      // Basic health check
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
  
  
  // ============================================
  // ADVANCED HEALTH CHECK WITH DATABASE
  // ============================================
  // File location: app/api/health/route.js (App Router)
  // or pages/api/health.js (Pages Router)
  
  import { PrismaClient } from '@prisma/client';
  
  const prisma = new PrismaClient();
  
  // For App Router
  export async function GET() {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'espacio-app',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: 'connected',
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
          }
        }
      };
  
      return Response.json(healthData, { status: 200 });
    } catch (error) {
      return Response.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'espacio-app',
        checks: {
          database: 'disconnected'
        },
        error: error.message
      }, { status: 503 });
    }
  }
  
  // For Pages Router
  export default async function handler(req, res) {
    try {
      // Check database connection
      await prisma.$queryRaw`SELECT 1`;
      
      const healthData = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'espacio-app',
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        checks: {
          database: 'connected',
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
            unit: 'MB'
          }
        }
      };
  
      return res.status(200).json(healthData);
    } catch (error) {
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'espacio-app',
        checks: {
          database: 'disconnected'
        },
        error: error.message
      });
    }
  }
  
  
  // ============================================
  // COMPREHENSIVE HEALTH CHECK (ALL SERVICES)
  // ============================================
  // File location: app/api/health/route.js (App Router)
  
  import { PrismaClient } from '@prisma/client';
  import Redis from 'ioredis';
  
  const prisma = new PrismaClient();
  const redis = new Redis(process.env.REDIS_URL);
  
  export async function GET() {
    const checks = {
      database: 'checking',
      redis: 'checking',
      minio: 'checking'
    };
  
    let allHealthy = true;
  
    // Check Database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = 'connected';
    } catch (error) {
      checks.database = 'disconnected';
      allHealthy = false;
    }
  
    // Check Redis
    try {
      await redis.ping();
      checks.redis = 'connected';
    } catch (error) {
      checks.redis = 'disconnected';
      allHealthy = false;
    }
  
    // Check MinIO (optional)
    try {
      const minioEndpoint = process.env.MINIO_ENDPOINT;
      const response = await fetch(`http://${minioEndpoint}:9000/minio/health/live`);
      checks.minio = response.ok ? 'connected' : 'disconnected';
      if (!response.ok) allHealthy = false;
    } catch (error) {
      checks.minio = 'disconnected';
      // MinIO is optional, so don't mark as unhealthy
    }
  
    const healthData = {
      status: allHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'espacio-app',
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      checks,
      system: {
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB'
        },
        nodeVersion: process.version
      }
    };
  
    return Response.json(healthData, { 
      status: allHealthy ? 200 : 503 
    });
  }
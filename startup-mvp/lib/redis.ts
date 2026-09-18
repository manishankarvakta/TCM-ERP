import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  // Allow Next.js static build to pass without a real Redis connection
  if (process.env.npm_lifecycle_event === 'build' || process.env.NODE_ENV !== 'production') {
    return "redis://127.0.0.1:6379";
  }
  throw new Error("REDIS_URL is not defined");
};

export const redis = new Redis(getRedisUrl(), {
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    // Retry with exponential backoff up to 2 seconds max
    return Math.min(times * 100, 2000);
  },
});

// Suppress unhandled error log spam when Redis is offline/unavailable
redis.on("error", (err) => {
  // Silent handling of connection errors to allow fail-closed rate limiters to handle degraded state
});
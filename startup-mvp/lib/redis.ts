import Redis from "ioredis";

const getRedisUrl = () => {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  // Allow Next.js static build to pass without a real Redis connection
  if (process.env.npm_lifecycle_event === 'build' || process.env.NODE_ENV !== 'production') {
    return "redis://localhost:6379";
  }
  throw new Error("REDIS_URL is not defined");
};

export const redis = new Redis(getRedisUrl());
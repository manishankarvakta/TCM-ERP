import { redis } from "./redis";

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  ttlSeconds: number;
  status: number;
  error?: string;
}

/**
 * Security Rate Limiter Authority
 * Used for externally reachable, security-sensitive production routes.
 * 
 * FAILURE POLICY: FAIL CLOSED (Distributed security authority rule)
 * When Redis is healthy: Enforces distributed rate limit across all application nodes.
 * When Redis is unavailable or times out: FAILS CLOSED with HTTP 503 Service Unavailable.
 * Process-local fallback as final security authority = 0.
 */
export async function checkSecurityRateLimit(
  identifier: string,
  routeKey: string,
  limit: number = 10,
  windowSeconds: number = 60
): Promise<RateLimitResult> {
  const key = `ratelimit:security:${routeKey}:${identifier}`;

  try {
    // Timeout promise (1000ms max timeout for Redis response)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Redis rate-limiting timeout")), 1000);
    });

    const pipelinePromise = (async () => {
      const results = await redis.pipeline()
        .incr(key)
        .ttl(key)
        .exec();

      if (!results || results.length < 2) {
        throw new Error("Invalid Redis pipeline response");
      }

      const [incrErr, currentCount] = results[0];
      const [ttlErr, currentTtl] = results[1];

      if (incrErr || ttlErr) {
        throw incrErr || ttlErr;
      }

      return {
        count: Number(currentCount),
        ttl: Number(currentTtl),
      };
    })();

    const { count, ttl: currentTtl } = await Promise.race([pipelinePromise, timeoutPromise]);
    let ttl = currentTtl;

    // If key has no TTL (newly created), set expiration
    if (ttl < 0) {
      await redis.expire(key, windowSeconds).catch(() => {});
      ttl = windowSeconds;
    }

    if (count > limit) {
      return {
        allowed: false,
        current: count,
        limit,
        ttlSeconds: ttl,
        status: 429,
        error: "Too many requests. Please try again later.",
      };
    }

    return {
      allowed: true,
      current: count,
      limit,
      ttlSeconds: ttl,
      status: 200,
    };
  } catch (error) {
    console.error(`[SecurityRateLimiter] Redis unavailable for ${routeKey}:${identifier}. Failing closed for security compliance.`, error);
    
    // FAIL CLOSED POLICY:
    // Process-local fallback as final security authority = 0
    // Distributed rate-limit bypass caused by Redis outage = 0
    return {
      allowed: false,
      current: 0,
      limit,
      ttlSeconds: 0,
      status: 503,
      error: "Security rate limiting service temporarily unavailable. Fail-closed enforced.",
    };
  }
}

/**
 * Non-security performance cache fallback helper
 * Used ONLY for non-security UI caching.
 */
export function isCacheFallbackAllowed(): boolean {
  return true;
}

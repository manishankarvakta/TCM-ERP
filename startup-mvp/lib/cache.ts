import { redis } from "./redis";

export const cacheSet = async (
  key: string,
  value: any,
  expireSeconds?: number
) => {
  const serialized = JSON.stringify(value);
  if (expireSeconds) {
    await redis.setex(key, expireSeconds, serialized);
  } else {
    await redis.set(key, serialized);
  }
};

export const cacheGet = async <T>(key: string): Promise<T | null> => {
  const cached = await redis.get(key);
  if (!cached) return null;
  return JSON.parse(cached) as T;
};

export const cacheDel = async (key: string) => {
  await redis.del(key);
};

export const cacheFlush = async () => {
  await redis.flushdb();
};
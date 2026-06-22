import Redis from 'ioredis';

const redis = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

const memStore = new Map<string, { value: string; expiresAt: number }>();

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (redis) {
      const val = await redis.get(key);
      return val ? (JSON.parse(val) as T) : null;
    }
    const entry = memStore.get(key);
    if (!entry || Date.now() > entry.expiresAt) return null;
    return JSON.parse(entry.value) as T;
  },

  async set(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    const serialized = JSON.stringify(value);
    if (redis) {
      await redis.set(key, serialized, 'EX', ttlSeconds);
    } else {
      memStore.set(key, { value: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  },

  async del(key: string): Promise<void> {
    if (redis) {
      await redis.del(key);
    } else {
      memStore.delete(key);
    }
  },

  async flush(): Promise<void> {
    if (redis) {
      await redis.flushdb();
    } else {
      memStore.clear();
    }
  },

  isRedis(): boolean {
    return redis !== null;
  },
};

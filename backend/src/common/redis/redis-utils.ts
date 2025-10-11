import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: any[]): Promise<'OK' | null>;
  setex(key: string, ttlSeconds: number, value: string): Promise<'OK'>;
  del(...keys: string[]): Promise<number>;
  eval(script: string, numKeys: number, ...args: any[]): Promise<any>;
  ping(): Promise<string>;
  info(section?: string): Promise<string>;
  keys(pattern: string): Promise<string[]>;
  on?(event: string, listener: (...args: any[]) => void): void;
  quit?(): Promise<void>;
  disconnect(): Promise<void>;
  exists(key: string): Promise<number>;
}

export function isRedisEnabled(configService?: ConfigService): boolean {
  const enabledRaw =
    (configService?.get?.('REDIS_ENABLED') as string) ?? process.env.REDIS_ENABLED ?? 'true';
  if (typeof enabledRaw === 'string') {
    const v = enabledRaw.toLowerCase();
    return v === 'true' || v === '1' || v === 'yes' || v === 'on';
  }
  return !!enabledRaw;
}

class NoopRedis implements RedisLike {
  private store = new Map<string, string>();
  private ttlMap = new Map<string, NodeJS.Timeout>();

  async get(key: string): Promise<string | null> {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  async set(key: string, value: string, ...args: any[]): Promise<'OK' | null> {
    // Support PX and NX semantics in a minimal way
    let ttlMs: number | undefined;
    let nx = false;
    if (args && args.length >= 2) {
      for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (typeof arg === 'string' && arg.toUpperCase() === 'PX') {
          const next = args[i + 1];
          if (typeof next === 'number') ttlMs = next;
        }
        if (typeof arg === 'string' && arg.toUpperCase() === 'NX') {
          nx = true;
        }
      }
    }

    if (nx && this.store.has(key)) {
      return null;
    }

    if (this.ttlMap.has(key)) {
      clearTimeout(this.ttlMap.get(key)!);
      this.ttlMap.delete(key);
    }
    this.store.set(key, value);
    if (ttlMs && ttlMs > 0) {
      const t = setTimeout(() => {
        this.store.delete(key);
        this.ttlMap.delete(key);
      }, ttlMs);
      this.ttlMap.set(key, t);
    }
    return 'OK';
  }

  async setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
    if (this.ttlMap.has(key)) {
      clearTimeout(this.ttlMap.get(key)!);
      this.ttlMap.delete(key);
    }
    this.store.set(key, value);
    const t = setTimeout(() => {
      this.store.delete(key);
      this.ttlMap.delete(key);
    }, ttlSeconds * 1000);
    this.ttlMap.set(key, t);
    return 'OK';
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      const existed = this.store.delete(key);
      if (existed) count++;
      if (this.ttlMap.has(key)) {
        clearTimeout(this.ttlMap.get(key)!);
        this.ttlMap.delete(key);
      }
    }
    return count;
  }

  async eval(script: string, numKeys: number, ...args: any[]): Promise<any> {
    // Minimal support:
    // - Unlock script in CartLockService: (key, requestId)
    // - Count keys pattern used in AddressCacheService: ARGV[1] pattern
    if (args.length >= 2 && typeof args[0] === 'string' && typeof args[1] === 'string') {
      const key = args[0];
      const requestId = args[1];
      const current = this.store.get(key);
      if (current === requestId) {
        await this.del(key);
        return 1;
      }
      return 0;
    }
    if (args.length >= 1 && typeof args[0] === 'string') {
      const pattern = args[0];
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      let count = 0;
      for (const key of this.store.keys()) {
        if (regex.test(key)) count++;
      }
      return count;
    }
    return 0;
  }

  async ping(): Promise<string> {
    return 'PONG';
  }

  async info(section?: string): Promise<string> {
    return 'redis_version:stub\r\nconnected_clients:1\r\nused_memory_human:1K\r\nuptime_in_seconds:1';
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) result.push(key);
    }
    return result;
  }

  on(event: string, listener: (...args: any[]) => void): void {
    // noop
  }

  async quit(): Promise<void> {
    // noop
  }

  async disconnect(): Promise<void> {
    // noop
  }

  async exists(key: string): Promise<number> {
    return this.store.has(key) ? 1 : 0;
  }
}

export function createRedisClient(configService: ConfigService, options?: RedisOptions): RedisLike {
  const isDev = (configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'development';
  const isTest = (configService?.get<string>('NODE_ENV') ?? process.env.NODE_ENV) === 'test';
  const enabled = isRedisEnabled(configService);

  if (isDev || isTest || !enabled) {
    return new NoopRedis();
  }

  // Use provided options or build from env/config
  const client = new Redis(
    options ?? {
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6379),
      password: configService.get('REDIS_PASSWORD'),
      db: configService.get('REDIS_DB', 0),
      connectTimeout: 3000,
      commandTimeout: 2000,
      lazyConnect: false,
      retryStrategy: times => Math.min(times * 200, 10000),
      enableOfflineQueue: true,
    },
  );
  return client as unknown as RedisLike;
}

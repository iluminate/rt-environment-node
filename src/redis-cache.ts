import { createClient, RedisClientType } from 'redis';

class RedisCacheSingleton {
  private static instance: RedisCacheSingleton;
  private client: RedisClientType | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {
    this.initializeClient();
  }

  static getInstance(): RedisCacheSingleton {
    if (!RedisCacheSingleton.instance) {
      RedisCacheSingleton.instance = new RedisCacheSingleton();
    }
    return RedisCacheSingleton.instance;
  }

  private initializeClient(): void {
    const redisHost = process.env.REDIS_HOST || 'localhost';
    const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);

    this.client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 2000
      },
      commandsQueueMaxLength: 100
    });

    this.client.on('error', () => {
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      this.isConnected = true;
    });
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client) return;

    if (!this.isConnected && !this.connectionPromise) {
      this.connectionPromise = this.client.connect().then(() => { }).catch(() => {
        this.connectionPromise = null;
      });

      await this.connectionPromise;
      this.connectionPromise = null;
    }
  }

  async get(microserviceId: string, configurationKey: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      await Promise.race([
        this.ensureConnection(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 2000))
      ]);

      if (!this.isConnected) return null;

      const redisKey = `rt-env-ms:${microserviceId}:${configurationKey}`;
      return await this.client.get(redisKey);
    } catch {
      return null;
    }
  }

  async set(microserviceId: string, configurationKey: string, value: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.ensureConnection();
      if (!this.isConnected) return;

      const redisKey = `rt-env-ms:${microserviceId}:${configurationKey}`;
      await this.client.setEx(redisKey, 300, value);
    } catch {
    }
  }

  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
    }
    this.client = null;
    this.isConnected = false;
  }
}

export const RedisCache = RedisCacheSingleton.getInstance();
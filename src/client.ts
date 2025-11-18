import http, { IncomingMessage, Agent } from 'http';
import { CONFIG } from './constants';
import { EnvironmentConfigurationResponse } from './types';

const agent = new Agent({ keepAlive: true, maxSockets: 10 });

class CircuitBreaker {
  private static failures = 0;
  private static lastFailure = 0;
  private static isOpen = false;

  static async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.isOpen && Date.now() - this.lastFailure < 30000) {
      throw new Error('Circuit breaker open');
    }

    try {
      const result = await fn();
      this.failures = 0;
      this.isOpen = false;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= 3) this.isOpen = true;
      throw error;
    }
  }
}

export async function getEnvironmentValue(
  microserviceId: string,
  configurationKey: string,
  timeout = 3000
): Promise<string> {
  return CircuitBreaker.execute(async () => {
    const baseUrl = process.env.MICROSERVICES_BASE_URL || CONFIG.DEFAULT_BASE_URL;
    const url = `${baseUrl}/api/rt-environment-ms/environment?ms-id=${microserviceId}&key=${configurationKey}`;

    return new Promise<string>((resolve, reject) => {
      const req = http.get(url, { agent }, (res: IncomingMessage) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode !== 200) {
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          try {
            const json: EnvironmentConfigurationResponse = JSON.parse(data);
            resolve(json.value);
          } catch {
            reject(new Error('Parse error'));
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
      req.end();
    });
  });
}

export function closeClient(): void {
  agent.destroy();
}

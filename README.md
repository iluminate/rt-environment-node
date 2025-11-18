# RT Environment Node

HTTP client for Rappi internal microservices.

## Install

```bash
npm install rt-environment-node
```

## Usage

```javascript
const { get, close } = require('rt-environment-node');

(async () => {
  try {
    const value = await get('4', 'weight_validation_limit_percentage', { timeout: 3000 });
    console.log(value);
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await close();
  }
})();
```

```typescript
import { get, close } from 'rt-environment-node';

(async () => {
  try {
    const value: string = await get('4', 'weight_validation_limit_percentage', { timeout: 3000 });
    console.log(value);
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await close();
  }
})();
```

## Environment Variables

```bash
# HTTP service configuration
export MICROSERVICES_BASE_URL=http://localhost:3000

# Redis cache configuration (optional)
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

## Features

- **3-Level Caching**: Memory (1min TTL) → Redis (5min TTL) → HTTP Service
- **Circuit Breaker**: Prevents cascading failures (3 failures = 30s timeout)
- **Connection Pooling**: HTTP keep-alive with 10 max sockets
- **Graceful Degradation**: Works even if Redis is unavailable
- **Auto-Populate Redis**: HTTP responses automatically cached to Redis
- **Resource Cleanup**: `close()` function prevents hanging processes

## API

`get(microserviceId, configurationKey, options?)` - Returns Promise\<string\>
- `options.timeout` - HTTP timeout (default: 3000ms)

`close()` - Closes all connections (Redis + HTTP agent)

# @bunary/core

Foundation module for the Bunary framework — configuration, environment helpers, and shared utilities.

## Installation

```bash
bun add @bunary/core
```

## Usage

### Environment Variables

```typescript
import { env, isDev, isProd, isTest } from '@bunary/core';

// Get environment variable with automatic type coercion
const port = env('PORT', 3000);        // Returns number
const debug = env('DEBUG', false);     // Returns boolean
const name = env('APP_NAME', 'myapp'); // Returns string

// Environment detection
if (isDev()) {
  console.log('Running in development mode');
}
```

### Configuration

```typescript
import { createConfig, defineConfig, Environment } from '@bunary/core';

export const configStore = createConfig(
  defineConfig({
    app: {
      name: 'My API',
      env: Environment.DEVELOPMENT,
      debug: true,
    },
  }),
);

// The resolved config object (use this in most app code)
export default configStore.get();
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `defineConfig` | Function | Create typed configuration |
| `createConfig` | Function | Create an instance-scoped config store (`get/set/clear`) |
| `env` | Function | Access environment variables with type coercion |
| `isDev` | Function | Check if NODE_ENV is development |
| `isProd` | Function | Check if NODE_ENV is production |
| `isTest` | Function | Check if NODE_ENV is test |
| `BunaryConfig` | Type | Configuration interface |
| `AppConfig` | Type | App configuration interface |
| `Environment` | Const | Environment constants (DEVELOPMENT, PRODUCTION, TEST) |
| `EnvironmentType` | Type | Union type for environment values |

## Migration note: `getBunaryConfig()`

`getBunaryConfig()` no longer returns a global config. Use `createConfig()` to create an instance-scoped store and call `store.get()` instead.

Before:

```ts
const config = getBunaryConfig();
```

After:

```ts
const store = createConfig(defineConfig({ /* ... */ }));
const config = store.get();
```

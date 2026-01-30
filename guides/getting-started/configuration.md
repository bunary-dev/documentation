
# Configuration

Understanding and customizing your Bunary application configuration.

## Configuration File

Bunary uses a `bunary.config.ts` file at your project root for configuration. This file exports a configuration object created with the `defineConfig` helper:

```typescript
import { createConfig, defineConfig } from "@bunary/core";

export const configStore = createConfig(
  defineConfig({
    app: {
      name: "My API",
      env: "development",
      debug: true,
    },
  }),
);

export default configStore.get();
```

### Using Environment Constants

Instead of string literals, you can use the `Environment` constant for better autocomplete and type safety:

```typescript
import { createConfig, defineConfig, Environment } from "@bunary/core";

export const configStore = createConfig(
  defineConfig({
    app: {
      name: "My API",
      env: Environment.DEVELOPMENT,
      debug: true,
    },
  }),
);

export default configStore.get();

// Available values:
// Environment.DEVELOPMENT → "development"
// Environment.PRODUCTION  → "production"
// Environment.TEST        → "test"
```

## Configuration Options

### App Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | Required | Application name |
| `env` | string | NODE_ENV or "development" | Environment (development, production, test) |
| `debug` | boolean | DEBUG env or false | Enable debug mode |

## Environment Variables

Bunary uses Bun's built-in `.env` file support. Access environment variables with the `env()` helper which provides type coercion:

```typescript
import { env } from "@bunary/core";

// String (default)
const appName = env("APP_NAME", "My API");

// Number - automatically coerced when default is a number
const port = env("PORT", 3000);

// Boolean - automatically coerced when default is boolean
const debug = env("DEBUG", false);

// Without default - returns string | undefined
const secret = env("API_SECRET");
```

Create a `.env` file in your project root:

```env
APP_NAME="My Awesome API"
NODE_ENV=development
DEBUG=true
PORT=3000
```

## Environment Helpers

Bunary provides convenient helpers to check the current environment (they read from the `NODE_ENV` environment variable):

```typescript
import { isDev, isProd, isTest } from "@bunary/core";

if (isDev()) {
  console.log("Running in development mode");
}

if (isProd()) {
  // Enable production optimizations
}

if (isTest()) {
  // Use test fixtures
}
```

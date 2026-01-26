---
title: @bunary/core
description: The foundation package providing configuration, environment, and app helpers
---

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
import { defineConfig, Environment } from '@bunary/core';

export default defineConfig({
  app: {
    name: 'My API',
    env: Environment.DEVELOPMENT,
    debug: true,
  },
});
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `defineConfig` | Function | Create typed configuration |
| `env` | Function | Access environment variables with type coercion |
| `isDev` | Function | Check if NODE_ENV is development |
| `isProd` | Function | Check if NODE_ENV is production |
| `isTest` | Function | Check if NODE_ENV is test |
| `BunaryConfig` | Type | Configuration interface |
| `AppConfig` | Type | App configuration interface |
| `Environment` | Const | Environment constants (DEVELOPMENT, PRODUCTION, TEST) |
| `EnvironmentType` | Type | Union type for environment values |

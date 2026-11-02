---
title: Configuration
description: Understanding and customizing your Bunary application configuration.
order: 2
---

# Configuration

Understanding and customizing your Bunary application configuration.

## Configuration File

A Bunary project keeps its configuration in one file, `config/bunary.ts` (the CLI also accepts `bunary.config.ts` at the project root). It default-exports an object built with the `defineConfig` helper, grouped into top-level namespaces such as `app` and `http`:

```typescript
import { defineConfig } from "@bunary/core";

export default defineConfig({
  app: {
    name: "My API",
    env: "development",
    debug: true,
  },
  http: {
    port: 3000,
  },
});
```

`defineConfig` checks that `app.name` is a non-empty string and resolves `app.env` and `app.debug` (see below). Packages add their own namespaces: `@bunary/http` reads `http`, `@bunary/orm` reads `database`.

### Environment Names

The environment is one of the strings `"development"`, `"production"` or `"test"`. Any other value throws at boot instead of quietly falling back to development, so a typo such as `APP_ENV=prod` fails fast.

## Reading Configuration

Config is not global. Pass it to `createApp()`, which builds an immutable `ConfigRepository` for that app and exposes it as `app.config`:

```typescript
import { createApp } from "@bunary/core";
import config from "../config/bunary.js";

const app = createApp({ config });

app.config.get().app.name;            // the whole, typed config
app.config.get<number>("http.port");  // dot-path read, typed by the caller
app.config.get("http.hostname", "localhost"); // fallback for a missing path
app.config.has("http.port");          // the key exists
app.config.filled("http.port");       // the key exists and is non-empty
```

Inside a route handler on a router mounted with `httpProvider`, the same app is available as `ctx.app`:

```typescript
router.get("/", (ctx) => ctx.json({ app: ctx.app?.config.get("app.name") }));
```

The repository has no `set`: config comes from `.env` and the config file and does not change at runtime. Values created at runtime belong in the app's token bindings (`app.set(token, value)`). Outside an app, `createConfig(values)` returns a standalone `ConfigRepository`.

### Validating Configuration

Pass a [Standard Schema](https://standardschema.dev) validator (zod, valibot, arktype) or a plain function as the first argument to validate the config once, at boot:

```typescript
import { defineConfig } from "@bunary/core";
import { z } from "zod";

export default defineConfig(
  z.object({
    app: z.object({ name: z.string().min(1) }),
    http: z.object({ port: z.coerce.number() }),
  }),
  { app: { name: "My API" }, http: { port: Bun.env.PORT } },
);
```

## Configuration Options

### App Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | Required | Application name (non-empty) |
| `env` | string | `APP_ENV`, then `NODE_ENV`, then `"development"` | Environment (`development`, `production`, `test`) |
| `debug` | boolean | `APP_DEBUG`, then `DEBUG` | Enable debug mode |

### HTTP Configuration

| Option | Type | Description |
|--------|------|-------------|
| `port` | number | Port `serve(app)` listens on (integer `0..65535`) |
| `hostname` | string | Hostname `serve(app)` binds to |
| `cors` | object | CORS options |

See the [HTTP package docs](/docs/packages/http) for details.

## Environment Variables

Bunary uses Bun's built-in `.env` file support. Access environment variables with the `env()` helper, which coerces the value to the type of the default:

```typescript
import { env } from "@bunary/core";

// String
const appName = env("APP_NAME", "My API");

// Number - coerced when the default is a number
const port = env("PORT", 3000);

// Boolean - coerced when the default is a boolean (true/1/yes/on, false/0/no/off)
const debug = env("DEBUG", false);
```

Empty values count as unset and return the default.

Create a `.env` file in your project root:

```env
APP_NAME="My Awesome API"
APP_ENV=development
APP_DEBUG=true
PORT=3000
```

### Validating Environment Variables

`env()` is for one-off lookups. For the variables your app depends on, validate them once with `defineEnv` at the top level of your config file, so a bad `.env` fails at boot:

```typescript
import { defineEnv } from "@bunary/core";
import { z } from "zod";

export const appEnv = defineEnv(
  z.object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string(),
  }),
);

appEnv.PORT; // number, frozen
```

## Environment Helpers

The environment name is resolved from `APP_ENV`, then `NODE_ENV`, then `development`. Bunary provides helpers to check it:

```typescript
import { environment, isDev, isProd, isTest, resolveEnvironment } from "@bunary/core";

environment();               // "development" | "production" | "test"
resolveEnvironment("test");  // an explicit value wins over the env vars

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

When you hold an application, prefer `app.env`: it also honours `app.env` from your config.

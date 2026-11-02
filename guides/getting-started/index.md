---
title: Installation
description: Get Bunary up and running in your project.
order: 1
---

# Installation

Get Bunary up and running in your project.

## Requirements

Before installing Bunary, ensure you have the following prerequisites:

- **Bun** v1.4.0 or later — [Install Bun](https://bun.sh)
- **TypeScript** 5.0+ (included with Bun)

> **Note:** Bunary is designed specifically for the Bun runtime and will not work with Node.js.

## Quick Start with CLI

The fastest way to get started is using the Bunary CLI:

```bash
# Install the CLI globally
bun add -g @bunary/cli

# Create a new project
bunary init my-api

# Navigate to your project
cd my-api

# Install dependencies
bun install

# Start the development server
bun run dev
```

Run `bunary init` without a name in a terminal and it asks for the project name and auth scaffolding interactively.

This will create a new directory with a Bunary project scaffold including:

- **package.json** — `@bunary/core` and `@bunary/http`; add `--auth basic` or `--auth jwt` to include `@bunary/auth`
- **tsconfig.json** — strict settings, so `bunx tsc --noEmit` typechecks the project
- **config/bunary.ts** — uses `defineConfig` from `@bunary/core`; sets the app name, env, debug and `http.port`
- **src/index.ts** — entry point; builds a router with `createRouter`, calls `registerRoutes`, mounts the router on a core app with `httpProvider` and starts it with `serve(app)`
- **src/routes/** — main, groupExample, index; `src/routes/index.ts` defines and exports `registerRoutes`. Add more with `bunary make:route <name>`
- **With --auth** — `src/middleware/basic.ts` or `jwt.ts`, registered with `router.use(...)` in the entrypoint

## Manual Installation

If you prefer to set up Bunary manually or add it to an existing project:

### 1. Install Packages

```bash
bun add @bunary/core @bunary/http
```

`@bunary/http` also works on its own; `@bunary/core` is needed to mount the router on an application.

### 2. Create Configuration File

Create `config/bunary.ts`:

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

### 3. Create Entry Point

Create your application entry point at `src/index.ts`:

```typescript
import { createApp } from "@bunary/core";
import { createRouter } from "@bunary/http";
import { httpProvider, serve } from "@bunary/http/provider";
import config from "../config/bunary.js";

const router = createRouter();

router.get("/", () => ({
  message: "Hello, Bunary!",
}));

router.get("/health", () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

const app = await createApp({
  config,
  providers: [httpProvider(router)],
}).boot();

// Port and hostname come from the `http` key in config/bunary.ts.
const server = serve(app);
console.log(`🚀 Server running at http://localhost:${server.port}`);
```

Without `@bunary/core`, a router can start its own server:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();
router.get("/", () => ({ message: "Hello, Bunary!" }));

router.listen({ port: 3000 });
```

### 4. Run Your App

```bash
bun run src/index.ts
```

## Optional Packages

Add additional packages as needed:

```bash
# Authentication support
bun add @bunary/auth

# CLI for development tools
bun add -d @bunary/cli

# ORM (built on Drizzle) for database operations
bun add @bunary/orm
```

`@bunary/orm` needs `drizzle-orm` next to it, and `drizzle-kit` for migrations; see the [ORM package docs](/docs/packages/orm).

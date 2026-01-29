
# Installation

Get Bunary up and running in your project.

## Requirements

Before installing Bunary, ensure you have the following prerequisites:

- **Bun** v1.0 or later — [Install Bun](https://bun.sh)
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

# Start the development server
bun run dev
```

This will create a new directory with a Bunary project scaffold including:

- Pre-configured `bunary.config.ts`
- Entry point at `src/index.ts`
- Package.json with development scripts

## Manual Installation

If you prefer to set up Bunary manually or add it to an existing project:

### 1. Install Core Packages

```bash
bun add @bunary/core @bunary/http
```

### 2. Create Configuration File

Create a `bunary.config.ts` in your project root:

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

### 3. Create Entry Point

Create your application entry point at `src/index.ts`:

```typescript
import { createApp } from "@bunary/http";

const app = createApp();

app.get("/", () => ({
  message: "Hello, Bunary!",
}));

app.get("/health", () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
}));

const server = app.listen({ port: 3000 });
console.log(`🚀 Server running at http://localhost:${server.port}`);
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
bun add -D @bunary/cli

# ORM for database operations
bun add @bunary/orm
```

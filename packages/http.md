---
title: @bunary/http
description: HTTP layer with routing, middleware, and request/response handling
---

# @bunary/http

A lightweight, type-safe HTTP framework built exclusively for [Bun](https://bun.sh).

Part of the [Bunary](https://github.com/bunary-dev) ecosystem - a Bun-first backend platform inspired by Laravel.

## Features

- 🚀 **Bun-native** - Uses `Bun.serve()` directly, no Node.js compatibility layer
- 📦 **Zero dependencies** - Only depends on `@bunary/core`
- 🔒 **Type-safe** - Full TypeScript support with strict types
- ⚡ **Fast** - Minimal overhead, direct routing
- 🧩 **Simple API** - Chainable route registration with automatic JSON serialization
- 📂 **Route Groups** - Organize routes with shared prefixes, middleware, and name prefixes
- 🏷️ **Named Routes** - URL generation with route names
- ✅ **Route Constraints** - Validate parameters with regex patterns
- ❓ **Optional Parameters** - Flexible routes with optional path segments

## Installation

```bash
bun add @bunary/http
```

## Quick Start

```typescript
import { createApp } from '@bunary/http';

const app = createApp();

app.get('/', () => ({ message: 'Hello, Bunary!' }));

app.listen(3000);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createApp` | Function | Create HTTP application |
| `BunaryApp` | Type | Application interface |
| `RequestContext` | Type | Request context interface |
| `Middleware` | Type | Middleware function type |
| `RouteHandler` | Type | Route handler function type |
| `RouteBuilder` | Type | Chainable route builder with constraints |
| `GroupOptions` | Type | Route group options (prefix, middleware, name) |
| `GroupRouter` | Type | Router interface for group callbacks |
| `GroupCallback` | Type | Callback function for route groups |
| `RouteInfo` | Type | Route information from getRoutes() |

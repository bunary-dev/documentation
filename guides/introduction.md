---
title: Introduction
description: Bunary is a Bun-first backend platform inspired by Laravel, focused on expressive developer experience, fast startup, and minimal operational overhead.
order: 1
---

# Introduction

Bunary is a Bun-first backend platform inspired by Laravel, focused on expressive developer experience, fast startup, and minimal operational overhead.

## Why Bunary?

Backend developers using JavaScript/TypeScript face a tradeoff. Node.js frameworks like NestJS and Express are flexible but verbose, decorator-heavy, or boilerplate-heavy. Modern runtimes like Bun are incredibly fast, but lack opinionated backend frameworks with strong developer experience. Laravel delivers exceptional DX, but PHP isn't the preferred runtime for many teams.

Bunary fills this gap as a **Bun-native backend platform** that provides strong conventions, sensible defaults, and batteries-included primitives — without enterprise ceremony or Node-era baggage.

## Key Features

### Bun-First
Built from the ground up for Bun's incredible speed and native TypeScript support.

### Laravel-Inspired
Familiar patterns and elegant syntax that developers love, brought to TypeScript.

### High Performance
Optimized for building scalable, production-ready APIs with minimal overhead.

### Great DX
TypeScript-first with excellent tooling and developer experience.

## First Steps

Ready to get started? Install Bunary and create your first API in minutes:

```bash
# Install the CLI globally
bun add -g @bunary/cli

# Create a new project
bunary init my-api

# Install dependencies and start
cd my-api && bun install && bun run dev
```

## Packages

Bunary is a set of packages under the `@bunary` npm scope. Install only what you need, for example:

```bash
bun add @bunary/http
```

| Package | Description |
|---------|-------------|
| `@bunary/core` | Instance-scoped application, configuration, environment helpers and providers |
| `@bunary/http` | Router with middleware, route groups, named routes and response helpers |
| `@bunary/auth` | Guard-based authentication (session, JWT, Basic) with middleware that sets `ctx.locals.auth` |
| `@bunary/cli` | CLI for project scaffolding and generators |
| `@bunary/orm` | Laravel-style models built on Drizzle |

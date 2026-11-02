---
title: Authentication
description: Securing your API with the Bunary authentication system.
order: 1
---

# Authentication

Securing your API with the Bunary authentication system.

## Introduction

The `@bunary/auth` package provides a flexible authentication layer with support for multiple guards. The `createAuth()` middleware attaches a request-scoped auth context to each request as `ctx.locals.auth`; there is no global auth manager.

## Installation

```bash
bun add @bunary/auth @bunary/http
```

`@bunary/auth` does not depend on `@bunary/http`: its middleware is typed structurally, so `router.use()` accepts it directly. This guide uses `@bunary/http` for routing.

## Setup

Use `createAuth()` to build auth middleware and register it on a router. Pass `AuthLocals` to both `createRouter()` and `createAuth()` so `ctx.locals.auth` is typed:

```typescript
import { createRouter } from "@bunary/http";
import { createAuth, createJwtGuard } from "@bunary/auth";
import type { AuthLocals } from "@bunary/auth";

const router = createRouter<AuthLocals>();

router.use(
  createAuth<AuthLocals>({
    defaultGuard: "jwt",
    guards: {
      jwt: createJwtGuard({
        secret: process.env.JWT_SECRET!,
        issuer: "my-app",
        audience: "api",
      }),
    },
  }),
);

router.get("/profile", async (ctx) => {
  const user = await ctx.locals.auth.authenticate();

  if (!user) {
    return ctx.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user };
});

router.listen({ port: 3000 });
```

## Authenticating in Routes

The middleware does not authenticate by itself. Call `ctx.locals.auth.authenticate()` where you need a user; it runs the default guard (or the guard you name) and resolves to the user or `null`. Afterwards, `check()`, `guest()` and `user()` report the result for the rest of the request:

```typescript
router.get("/dashboard", async (ctx) => {
  const auth = ctx.locals.auth;
  await auth.authenticate();

  if (auth.guest()) {
    return ctx.json({ error: "Unauthorized" }, { status: 401 });
  }

  return { user: auth.user() };
});
```

Use `auth.require()` to get the current user or throw if unauthenticated.

## Logging In and Out

Guards that keep login state support `attempt()`, `login()` and `logout()`. With the session guard, `attempt()` checks the credentials through a `UserProvider` and writes an encrypted session cookie; `logout()` clears it:

```typescript
import { createRouter } from "@bunary/http";
import { createAuth, createSessionGuard } from "@bunary/auth";
import type { AuthLocals } from "@bunary/auth";

const router = createRouter<AuthLocals>();

router.use(
  createAuth<AuthLocals>({
    defaultGuard: "session",
    guards: {
      session: createSessionGuard({
        provider: users, // your UserProvider
        secret: process.env.SESSION_SECRET!, // exactly 32 bytes
      }),
    },
  }),
);

router.post("/login", async (ctx) => {
  const { email, password } = await ctx.body.json<{ email: string; password: string }>();
  const result = await ctx.locals.auth.attempt({ email, password });
  if (!result) return new Response("Invalid credentials", { status: 401 });
  return { user: { id: result.user.id } };
});

router.post("/logout", async (ctx) => {
  await ctx.locals.auth.logout();
  return new Response(null, { status: 303, headers: { Location: "/" } });
});
```

See the [@bunary/auth package docs](/docs/packages/auth#user-providers) for writing a `UserProvider` and how each guard handles `attempt()`, `login()` and `logout()`.

## Built-in Guards

- **Session:** `createSessionGuard({ provider, secret })` — a cookie session for browser apps, stored as an encrypted JWT.
- **JWT:** `createJwtGuard({ secret, issuer?, audience? })` — validates Bearer tokens (HS256 by default; `key` or `jwksUrl` with `algorithms` for asymmetric keys).
- **Basic:** `createBasicGuard({ verify(username, password, request) })` — validates Basic auth; you provide a `verify` function that returns an `AuthUser` or `null`.

See [Guards](./guards.md) for multiple and custom guards.

## Using with @bunary/core

In a `@bunary/core` application, `@bunary/auth/provider` reads the `auth` config key, binds the auth manager, and offers `authMiddleware()` and `requireAuth()`, which authenticate the request and set `ctx.locals.user`:

```typescript
import { createApp, defineConfig } from "@bunary/core";
import { createRouter } from "@bunary/http";
import { httpProvider } from "@bunary/http/provider";
import { createJwtGuard } from "@bunary/auth";
import { authProvider, requireAuth, type RequiredAuthLocals } from "@bunary/auth/provider";

const config = defineConfig({
  app: { name: "my-app" },
  auth: {
    defaultGuard: "jwt",
    guards: { jwt: createJwtGuard({ secret: process.env.JWT_SECRET! }) },
  },
});

const router = createRouter<RequiredAuthLocals>();
router.use(requireAuth<RequiredAuthLocals>()); // answers 401 for guests
router.get("/me", (ctx) => ({ id: ctx.locals.user.id }));

const app = createApp({ config, providers: [authProvider, httpProvider(router)] });
```

See [Using with @bunary/core](/docs/packages/auth#using-with-bunarycore) for the options and the 401 response.

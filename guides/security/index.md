
# Authentication

Securing your API with the Bunary authentication system.

## Introduction

The `@bunary/auth` package provides a flexible authentication layer with support for multiple guards. **App-scoped integration** (recommended) attaches auth to each request via `ctx.locals.auth`; there is no global auth manager.

## Installation

```bash
bun add @bunary/auth
```

## App-Scoped Setup (Recommended)

Use `createAuth()` to build auth middleware for your app. Auth state is per request and available as `ctx.locals.auth`:

```typescript
import { createApp } from "@bunary/http";
import { createAuth, createJwtGuard } from "@bunary/auth";
import type { AuthContext } from "@bunary/auth";

const app = createApp();

const authMiddleware = createAuth({
  defaultGuard: "jwt",
  guards: {
    jwt: createJwtGuard({
      secret: process.env.JWT_SECRET!,
      issuer: "my-app",
      audience: "api",
    }),
  },
});

app.use(authMiddleware);

app.get("/profile", async (ctx) => {
  const auth = ctx.locals.auth as AuthContext;
  await auth.authenticate();

  if (!auth.check()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user: auth.user() };
});

app.listen({ port: 3000 });
```

## Authenticating in Routes

After `app.use(authMiddleware)`, every request has `ctx.locals.auth`. Call `authenticate()` then `check()` and `user()`:

```typescript
app.get("/profile", async (ctx) => {
  const auth = ctx.locals.auth as AuthContext;
  await auth.authenticate();

  if (!auth.check()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return { user: auth.user() };
});
```

## Built-in Guards

- **JWT:** `createJwtGuard({ secret, issuer?, audience? })` — validates Bearer tokens (HS256).
- **Basic:** `createBasicGuard({ validateUser })` — validates Basic auth; you provide a function that checks username/password.

See [Guards](./guards.md) for custom guards and details.

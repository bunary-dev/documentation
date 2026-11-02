---
title: Middleware
description: Intercept and modify requests and responses.
order: 1
---

# Middleware

Intercept and modify requests and responses.

## Introduction

Middleware provides a mechanism for filtering and modifying HTTP requests entering your application. Common use cases include authentication, logging, CORS handling, and request validation.

## Defining Middleware

A middleware is a function that receives the context and a `next` function. Call `next()` to continue the chain and return its result (or return your own response to stop early):

```typescript
import type { Middleware } from "@bunary/http";

const logger: Middleware = async (ctx, next) => {
  const start = Date.now();
  const url = new URL(ctx.request.url);

  // Before handler
  console.log(`→ ${ctx.request.method} ${url.pathname}`);

  // Call the next middleware or route handler
  const result = await next();

  // After handler
  const duration = Date.now() - start;
  console.log(`← ${ctx.request.method} ${url.pathname} ${duration}ms`);

  return result;
};
```

## Global Middleware

Register middleware that runs on every request using `router.use()`:

```typescript
import { cors, createRouter } from "@bunary/http";

const router = createRouter();

// Register global middleware
router.use(logger);
router.use(cors());

router.get("/", () => ({ message: "Hello!" }));

router.listen({ port: 3000 });
```

Global middleware wraps **every** response the router produces: matched routes, `404`, `405`, the automatic `OPTIONS` response and error responses alike. Because of that, `next()` hands global middleware a `Response`, not the handler's raw return value.

## Group Middleware

Attach middleware to a set of routes with a route group. Group (and route) middleware runs closer to the handler, so its `next()` resolves to the handler's **raw return value** — a plain object, string, `null` or a `Response`. Normalise it with `toResponse()` before touching headers:

```typescript
import { toResponse } from "@bunary/http";

router.group({ prefix: "/api", middleware: [
  async (ctx, next) => {
    const response = toResponse(await next(), ctx.request);
    response.headers.set("X-Api-Version", "1");
    return response;
  },
] }, (api) => {
  api.get("/users", () => ({ users: [] }));
});
```

## Middleware Order

Middleware executes in the order it's registered. The first middleware registered runs first on the way in and last on the way out:

```typescript
router.use(requestId); // 1st in, last out
router.use(logger);    // 2nd in, 2nd out (logs all requests)
router.use(cors());    // 3rd in, 1st out (adds CORS headers)

// Request flow:
// → requestId → logger → cors → route handler
// ← requestId ← logger ← cors ←
```

## Common Middleware Patterns

### Sharing Data with `ctx.locals`

`ctx.locals` is per-request storage. Pass a type to `createRouter()` to make it type-safe for every middleware and handler:

```typescript
import { createRouter, type Middleware } from "@bunary/http";

interface AppLocals {
  requestId: string;
}

const router = createRouter<AppLocals>();

const requestId: Middleware<AppLocals> = async (ctx, next) => {
  ctx.locals.requestId = crypto.randomUUID();
  return next();
};

router.use(requestId);

router.get("/", (ctx) => ({ requestId: ctx.locals.requestId }));
```

### Authentication

A hand-rolled bearer-token check stops the chain early and stores the user on `ctx.locals`:

```typescript
interface AuthedLocals {
  user: { id: number; name: string };
}

const auth: Middleware<AuthedLocals> = async (ctx, next) => {
  const token = ctx.request.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return ctx.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    ctx.locals.user = await verifyToken(token);
  } catch {
    return ctx.json({ error: "Invalid token" }, { status: 401 });
  }

  return next();
};
```

For real applications, use [@bunary/auth](/docs/packages/auth): its `createAuth()` middleware stores an `AuthContext` on `ctx.locals.auth` with session, JWT and basic guards, and `requireAuth()` from `@bunary/auth/provider` answers `401` for guests.

### CORS

`@bunary/http` ships a `cors()` middleware that answers preflight `OPTIONS` requests and adds the CORS headers to every response, including errors and 404s:

```typescript
import { cors } from "@bunary/http";

router.use(cors({
  origin: ["https://app1.com", "https://app2.com"],
  credentials: true,
  maxAge: 86400,
}));
```

See the [@bunary/http](/docs/packages/http) package docs for every option, per-group CORS and the rules for credentials with wildcard origins.

### Error Handling

A handler that throws reaches global middleware as a `500` response, not as a thrown error, so a global `try`/`catch` will not see it. Handle errors in one of two places:

Use the router's `onError` option to control the response for every uncaught error:

```typescript
import { createRouter } from "@bunary/http";

class NotFoundError extends Error {}

const router = createRouter({
  onError: (ctx, error) => {
    console.error("Error:", error);

    if (error instanceof NotFoundError) {
      return ctx.json({ error: error.message }, { status: 404 });
    }

    return ctx.json({ error: "Internal Server Error" }, { status: 500 });
  },
});
```

Or catch errors for a subset of routes with group middleware, which runs inside the error boundary:

```typescript
const catchNotFound: Middleware = async (ctx, next) => {
  try {
    return await next();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return ctx.json({ error: error.message }, { status: 404 });
    }
    throw error;
  }
};

router.group({ prefix: "/users", middleware: [catchNotFound] }, (users) => {
  users.get("/:id", (ctx) => findUserOrThrow(ctx.params.id));
});
```

Without `onError`, the default handler returns a generic `500` problem response and only includes the error message in debug mode. See [Error Handling](/docs/packages/http#error-handling) in the package docs for how debug mode is resolved.

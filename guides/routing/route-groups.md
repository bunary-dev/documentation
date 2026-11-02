---
title: Route Groups
description: Group routes together with shared prefixes, middleware, and name prefixes for better organization.
order: 3
---

# Route Groups

Group routes together with shared prefixes, middleware, and name prefixes for better organization.

The examples below assume a router created with `createRouter()` from `@bunary/http`:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();
```

## Basic Groups

Group routes with a shared prefix:

```typescript
// Simple prefix
router.group("/api", (api) => {
  api.get("/users", () => ({ users: [] }));     // /api/users
  api.get("/posts", () => ({ posts: [] }));     // /api/posts
});
```

## Groups with Options

Apply middleware and name prefixes to groups:

```typescript
// Middleware receives the context and a next() function
const authMiddleware = async (ctx, next) => {
  const token = ctx.request.headers.get("Authorization");
  if (!token) return ctx.json({ error: "Unauthorized" }, { status: 401 });
  return await next();
};

// With options (prefix, middleware, name prefix)
router.group({
  prefix: "/admin",
  middleware: [authMiddleware],
  name: "admin."
}, (admin) => {
  admin.get("/dashboard", () => ({})).name("dashboard");  // name: admin.dashboard
  admin.get("/users", () => ({})).name("users");          // name: admin.users
});
```

## Nested Groups

Create nested route groups for complex route hierarchies:

```typescript
// Nested groups
router.group("/api", (api) => {
  api.group("/v1", (v1) => {
    v1.get("/users", () => ({}));  // /api/v1/users
  });
  api.group("/v2", (v2) => {
    v2.get("/users", () => ({}));  // /api/v2/users
  });
});
```

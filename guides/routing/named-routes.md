---
title: Named Routes
description: Assign names to routes for URL generation, making it easy to generate URLs without hardcoding paths.
order: 4
---

# Named Routes

Assign names to routes for URL generation, making it easy to generate URLs without hardcoding paths.

The examples below assume a router created with `createRouter()` from `@bunary/http`:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();
```

## Naming Routes

Assign names to routes:

```typescript
// Name a route
router.get("/users/:id", (ctx) => ({})).name("users.show");
router.get("/posts/:slug", (ctx) => ({})).name("posts.show");
```

## Generating URLs

Generate URLs from route names:

```typescript
// Generate URLs
const url = router.route("users.show", { id: 42 });
// "/users/42"

// Extra params become query string
const searchUrl = router.route("users.show", { id: 42, tab: "profile" });
// "/users/42?tab=profile"
```

## Route Management

Check if routes exist and list all routes:

```typescript
// Check if route exists
if (router.hasRoute("users.show")) {
  // ...
}

// List all routes
const routes = router.getRoutes();
// [{ name: "users.show", method: "GET", path: "/users/:id" }, ...]
```

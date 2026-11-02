---
title: Route Parameters
description: Capture dynamic segments of the URL using route parameters.
order: 2
---

# Route Parameters

Capture dynamic segments of the URL using route parameters.

The examples below assume a router created with `createRouter()` from `@bunary/http`:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();
```

## Basic Parameters

Capture dynamic segments of the URL using route parameters:

```typescript
// Single parameter
router.get("/users/:id", (ctx) => {
  const userId = ctx.params.id;
  return { userId };
});

// Multiple parameters
router.get("/posts/:postId/comments/:commentId", (ctx) => {
  const { postId, commentId } = ctx.params;
  return { postId, commentId };
});
```

## Route Constraints

Add regex constraints to validate route parameters before matching:

```typescript
// Basic regex constraint
router.get("/users/:id", (ctx) => ({}))
  .where("id", /^\d+$/);

// Multiple constraints
router.get("/users/:id/posts/:postId", (ctx) => ({}))
  .where({ id: /^\d+$/, postId: /^\d+$/ });

// Helper methods for common patterns
router.get("/users/:id", () => ({})).whereNumber("id");
router.get("/categories/:name", () => ({})).whereAlpha("name");
router.get("/codes/:code", () => ({})).whereAlphaNumeric("code");
router.get("/items/:uuid", () => ({})).whereUuid("uuid");
router.get("/records/:ulid", () => ({})).whereUlid("ulid");
router.get("/status/:status", () => ({})).whereIn("status", ["active", "pending", "archived"]);

// Chain multiple constraints
router.get("/users/:id/posts/:slug", (ctx) => ({}))
  .whereNumber("id")
  .whereAlpha("slug")
  .name("users.posts");
```

## Optional Parameters

Use `?` to mark route parameters as optional:

```typescript
// :id is optional - matches /users and /users/123
router.get("/users/:id?", (ctx) => {
  if (ctx.params.id) {
    return { user: ctx.params.id };
  }
  return { users: [] };
});

// Multiple optional params
router.get("/archive/:year?/:month?", (ctx) => {
  const { year, month } = ctx.params;
  // year and month may be undefined
  return { year, month };
});

// Constraints work with optional params
router.get("/posts/:id?", (ctx) => ({})).whereNumber("id");
```

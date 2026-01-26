---
title: Routing
description: Define your application's routes and endpoints
---

# Routing

Define your application's routes and endpoints.

## Basic Routing

Bunary provides a simple and expressive API for defining routes. The most basic routes accept a path and a handler function:

```typescript
import { createApp } from "@bunary/http";

const app = createApp();

app.get("/", () => {
  return { message: "Hello, World!" };
});

app.listen(3000);
```

## Available HTTP Methods

The router supports the following HTTP methods:

```typescript
app.get("/users", handler);
app.post("/users", handler);
app.put("/users/:id", handler);
app.patch("/users/:id", handler);
app.delete("/users/:id", handler);
```

## Route Parameters

Capture dynamic segments of the URL using route parameters:

```typescript
// Single parameter
app.get("/users/:id", (ctx) => {
  const userId = ctx.params.id;
  return { userId };
});

// Multiple parameters
app.get("/posts/:postId/comments/:commentId", (ctx) => {
  const { postId, commentId } = ctx.params;
  return { postId, commentId };
});
```

## Route Handlers

Route handlers receive a context object and can return various response types:

```typescript
// Return JSON object (automatically serialized)
app.get("/json", () => {
  return { status: "ok" };
});

// Return with custom status using Response
app.post("/users", () => {
  return new Response(JSON.stringify({ id: 1, name: "John" }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});

// Return plain text
app.get("/text", () => {
  return new Response("Hello, World!", {
    headers: { "Content-Type": "text/plain" },
  });
});

// Async handlers
app.get("/async", async () => {
  const data = await fetchData();
  return data;
});
```

## Query Parameters

Access query string parameters via the context. The `query` property is a `URLSearchParams` object:

```typescript
// GET /search?q=bunary&limit=10
app.get("/search", (ctx) => {
  const query = ctx.query.get("q");
  const limit = ctx.query.get("limit") || "20";
  
  return { query, limit: parseInt(limit) };
});
```

## The Request Context

Every route handler receives a `RequestContext` object with the following properties:

| Property | Type | Description |
|----------|------|-------------|
| `request` | Request | The native Fetch API Request object |
| `params` | Record<string, string> | URL route parameters |
| `query` | URLSearchParams | Query string parameters |

## Accessing Request Data

Use the native Request object methods to access request data:

```typescript
app.post("/users", async (ctx) => {
  // Access request method
  const method = ctx.request.method;
  
  // Access request URL
  const url = new URL(ctx.request.url);
  
  // Access headers
  const contentType = ctx.request.headers.get("Content-Type");
  
  // Parse JSON body
  const body = await ctx.request.json();
  
  return { received: body };
});
```

## Route Groups

Group routes together with shared prefixes, middleware, and name prefixes for better organization:

```typescript
// Simple prefix
app.group("/api", (router) => {
  router.get("/users", () => ({ users: [] }));     // /api/users
  router.get("/posts", () => ({ posts: [] }));     // /api/posts
});

// With options (prefix, middleware, name prefix)
app.group({
  prefix: "/admin",
  middleware: [authMiddleware],
  name: "admin."
}, (router) => {
  router.get("/dashboard", () => ({})).name("dashboard");  // name: admin.dashboard
  router.get("/users", () => ({})).name("users");          // name: admin.users
});

// Nested groups
app.group("/api", (api) => {
  api.group("/v1", (v1) => {
    v1.get("/users", () => ({}));  // /api/v1/users
  });
  api.group("/v2", (v2) => {
    v2.get("/users", () => ({}));  // /api/v2/users
  });
});
```

## Named Routes

Assign names to routes for URL generation, making it easy to generate URLs without hardcoding paths:

```typescript
// Name a route
app.get("/users/:id", (ctx) => ({})).name("users.show");
app.get("/posts/:slug", (ctx) => ({})).name("posts.show");

// Generate URLs
const url = app.route("users.show", { id: 42 });
// "/users/42"

// Extra params become query string
const searchUrl = app.route("users.show", { id: 42, tab: "profile" });
// "/users/42?tab=profile"

// Check if route exists
if (app.hasRoute("users.show")) {
  // ...
}

// List all routes
const routes = app.getRoutes();
// [{ name: "users.show", method: "GET", path: "/users/:id" }, ...]
```

## Route Constraints

Add regex constraints to validate route parameters before matching:

```typescript
// Basic regex constraint
app.get("/users/:id", (ctx) => ({}))
  .where("id", /^\d+$/);

// Multiple constraints
app.get("/users/:id/posts/:postId", (ctx) => ({}))
  .where({ id: /^\d+$/, postId: /^\d+$/ });

// Helper methods for common patterns
app.get("/users/:id", () => ({})).whereNumber("id");
app.get("/categories/:name", () => ({})).whereAlpha("name");
app.get("/codes/:code", () => ({})).whereAlphaNumeric("code");
app.get("/items/:uuid", () => ({})).whereUuid("uuid");
app.get("/records/:ulid", () => ({})).whereUlid("ulid");
app.get("/status/:status", () => ({})).whereIn("status", ["active", "pending", "archived"]);

// Chain multiple constraints
app.get("/users/:id/posts/:slug", (ctx) => ({}))
  .whereNumber("id")
  .whereAlpha("slug")
  .name("users.posts");
```

## Optional Parameters

Use `?` to mark route parameters as optional:

```typescript
// :id is optional - matches /users and /users/123
app.get("/users/:id?", (ctx) => {
  if (ctx.params.id) {
    return { user: ctx.params.id };
  }
  return { users: [] };
});

// Multiple optional params
app.get("/archive/:year?/:month?", (ctx) => {
  const { year, month } = ctx.params;
  // year and month may be undefined
  return { year, month };
});

// Constraints work with optional params
app.get("/posts/:id?", (ctx) => ({})).whereNumber("id");
```

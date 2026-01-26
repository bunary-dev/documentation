# Route Parameters

Capture dynamic segments of the URL using route parameters.

## Basic Parameters

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

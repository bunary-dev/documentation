# Route Groups

Group routes together with shared prefixes, middleware, and name prefixes for better organization.

## Basic Groups

Group routes with a shared prefix:

```typescript
// Simple prefix
app.group("/api", (router) => {
  router.get("/users", () => ({ users: [] }));     // /api/users
  router.get("/posts", () => ({ posts: [] }));     // /api/posts
});
```

## Groups with Options

Apply middleware and name prefixes to groups:

```typescript
// With options (prefix, middleware, name prefix)
app.group({
  prefix: "/admin",
  middleware: [authMiddleware],
  name: "admin."
}, (router) => {
  router.get("/dashboard", () => ({})).name("dashboard");  // name: admin.dashboard
  router.get("/users", () => ({})).name("users");          // name: admin.users
});
```

## Nested Groups

Create nested route groups for complex route hierarchies:

```typescript
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

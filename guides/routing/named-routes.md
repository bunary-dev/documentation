# Named Routes

Assign names to routes for URL generation, making it easy to generate URLs without hardcoding paths.

## Naming Routes

Assign names to routes:

```typescript
// Name a route
app.get("/users/:id", (ctx) => ({})).name("users.show");
app.get("/posts/:slug", (ctx) => ({})).name("posts.show");
```

## Generating URLs

Generate URLs from route names:

```typescript
// Generate URLs
const url = app.route("users.show", { id: 42 });
// "/users/42"

// Extra params become query string
const searchUrl = app.route("users.show", { id: 42, tab: "profile" });
// "/users/42?tab=profile"
```

## Route Management

Check if routes exist and list all routes:

```typescript
// Check if route exists
if (app.hasRoute("users.show")) {
  // ...
}

// List all routes
const routes = app.getRoutes();
// [{ name: "users.show", method: "GET", path: "/users/:id" }, ...]
```

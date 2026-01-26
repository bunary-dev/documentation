
# Requests

Accessing and working with incoming HTTP requests.

## The Request Context

Every route handler receives a `RequestContext` object with access to the incoming request data:

```typescript
app.post("/users", async (ctx) => {
  // The context provides:
  ctx.request  // The native Request object
  ctx.params   // Route parameters (e.g., { id: "123" })
  ctx.query    // URLSearchParams object
  
  return { received: true };
});
```

## Accessing Request Properties

Access request data through the native `ctx.request` object:

```typescript
app.post("/users", async (ctx) => {
  const method = ctx.request.method;  // "POST"
  const url = new URL(ctx.request.url);
  const path = url.pathname;          // "/users"
  
  return { method, path };
});
```

## Request Headers

Access request headers through `ctx.request.headers`:

```typescript
app.get("/info", (ctx) => {
  const contentType = ctx.request.headers.get("content-type");
  const authorization = ctx.request.headers.get("authorization");
  const userAgent = ctx.request.headers.get("user-agent");
  
  return {
    contentType,
    hasAuth: !!authorization,
    userAgent,
  };
});
```

## Route Parameters

Access dynamic route segments via `ctx.params`:

```typescript
// GET /users/123
app.get("/users/:id", (ctx) => {
  const id = ctx.params.id; // "123"
  return { userId: id };
});

// GET /posts/456/comments/789
app.get("/posts/:postId/comments/:commentId", (ctx) => {
  const { postId, commentId } = ctx.params;
  return { postId, commentId };
});
```

## Query Parameters

Access query string parameters via `ctx.query`, which is a `URLSearchParams` object:

```typescript
// GET /search?q=bunary&page=2&limit=10
app.get("/search", (ctx) => {
  const q = ctx.query.get("q");           // "bunary"
  const page = ctx.query.get("page");     // "2"
  const limit = ctx.query.get("limit");   // "10"
  
  return {
    query: q,
    page: parseInt(page || "1"),
    limit: parseInt(limit || "20"),
  };
});

// Get all values for a key
// GET /filter?tag=typescript&tag=bun
app.get("/filter", (ctx) => {
  const tags = ctx.query.getAll("tag"); // ["typescript", "bun"]
  return { tags };
});
```

## Request Body

Parse the request body using the native Request methods:

### JSON Body

```typescript
app.post("/users", async (ctx) => {
  const body = await ctx.request.json();
  
  return {
    received: body,
    name: body.name,
    email: body.email,
  };
});
```

### Form Data

```typescript
app.post("/contact", async (ctx) => {
  const formData = await ctx.request.formData();
  
  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");
  
  return { name, email, message };
});
```

### Raw Text

```typescript
app.post("/webhook", async (ctx) => {
  const rawBody = await ctx.request.text();
  
  return { received: rawBody.length };
});
```

## Typed Request Bodies

Use TypeScript type assertions for type-safe request handling:

```typescript
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
}

app.post("/users", async (ctx) => {
  const body = await ctx.request.json() as CreateUserBody;
  
  // TypeScript knows body.name, body.email, body.password
  const user = await createUser(body);
  
  return user;
});
```

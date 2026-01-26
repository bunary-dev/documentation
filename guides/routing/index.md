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

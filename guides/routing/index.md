---
title: Routing
description: Define your application's routes and endpoints.
order: 1
---

# Routing

Define your application's routes and endpoints.

## Basic Routing

Bunary provides a simple and expressive API for defining routes. Install `@bunary/http`:

```bash
bun add @bunary/http
```

Create a router with `createRouter()`. The most basic routes accept a path and a handler function:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();

router.get("/", () => {
  return { message: "Hello, World!" };
});

router.listen({ port: 3000 });
```

You can pass options to `createRouter({ basePath?, onNotFound?, onMethodNotAllowed?, onError?, debug?, maxBodySize? })` (e.g. `basePath: "/api"` to prefix all routes). See the [@bunary/http](/docs/packages/http) package docs for full options. HEAD requests use GET routes automatically; OPTIONS returns allowed methods.

## Mounting on a Bunary Application

`router.listen()` runs the router standalone. To mount it on a `@bunary/core` Application instead, register `httpProvider(router)` and start the server with `serve(app)`, both from the `@bunary/http/provider` subpath:

```bash
bun add @bunary/core
```

```typescript
import { createApp } from "@bunary/core";
import { createRouter } from "@bunary/http";
import { httpProvider, serve } from "@bunary/http/provider";

const router = createRouter();
router.get("/", (ctx) => ctx.json({ app: ctx.app?.config.get("app.name") }));

const app = await createApp({
  config: {
    app: { name: "my-api" },
    http: { port: 3000 },
  },
  providers: [httpProvider(router)],
}).boot();

serve(app); // reads config.http.port / .hostname
```

## Available HTTP Methods

The router supports the following HTTP methods:

```typescript
router.get("/users", handler);
router.post("/users", handler);
router.put("/users/:id", handler);
router.patch("/users/:id", handler);
router.delete("/users/:id", handler);
```

## Route Handlers

Route handlers receive a context object and can return various response types:

```typescript
// Return JSON object (automatically serialized)
router.get("/json", () => {
  return { status: "ok" };
});

// Return plain text (strings become text/plain)
router.get("/text", () => "Hello, World!");

// Return with custom status using a response helper
router.post("/users", (ctx) => {
  return ctx.json({ id: 1, name: "John" }, { status: 201 });
});

// Other helpers: ctx.text(), ctx.html(), ctx.redirect(), ctx.status()
router.get("/old", (ctx) => ctx.redirect("/new", 301));
router.delete("/users/:id", (ctx) => ctx.status(204));

// Response objects are passed through unchanged
router.get("/custom", () => new Response("Custom", { status: 201 }));

// Async handlers
router.get("/async", async () => {
  const data = await fetchData();
  return data;
});
```

The same helpers (`json`, `text`, `html`, `redirect`, `status`) are also exported from `@bunary/http` as standalone functions.

## Query Parameters

Access query string parameters via the context. The `query` property is a `URLSearchParams` object:

```typescript
// GET /search?q=bunary&limit=10
router.get("/search", (ctx) => {
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
| `params` | Record<string, string \| undefined> | URL route parameters (optional params may be `undefined`) |
| `query` | URLSearchParams | Query string parameters |
| `locals` | Record<string, unknown> | Per-request data (e.g. `ctx.locals.auth` from auth middleware) |
| `body` | BodyReader | Body readers: `ctx.body.json()`, `ctx.body.text()`, `ctx.body.formData()` |

The context also carries the response helpers `ctx.json()`, `ctx.text()`, `ctx.html()`, `ctx.redirect()` and `ctx.status()`, and `ctx.cookies` for reading request cookies and queueing `Set-Cookie` headers.

## Accessing Request Data

Read the body with `ctx.body.*`, and use the native Request object for everything else:

```typescript
router.post("/users", async (ctx) => {
  // Access request method
  const method = ctx.request.method;

  // Access request URL
  const url = new URL(ctx.request.url);

  // Access headers
  const contentType = ctx.request.headers.get("Content-Type");

  // Parse JSON body
  const body = await ctx.body.json();

  return { received: body };
});
```

A request body can only be read once. Malformed JSON or form bodies throw `BodyParseError`; see the [@bunary/http](/docs/packages/http) package docs for error handling and the `maxBodySize` limit.

---
title: Requests
description: Accessing and working with incoming HTTP requests.
order: 2
---

# Requests

Accessing and working with incoming HTTP requests.

## The Request Context

Every route handler receives a `RequestContext` object with access to the incoming request data:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();

router.post("/users", async (ctx) => {
  // The context provides:
  ctx.request  // The native Request object
  ctx.params   // Route parameters (e.g., { id: "123" })
  ctx.query    // URLSearchParams object
  ctx.body     // Body readers: json(), text(), formData()
  ctx.cookies  // Read request cookies, queue Set-Cookie headers
  ctx.locals   // Per-request storage shared with middleware

  return { received: true };
});
```

The context also carries response helpers (`ctx.json()`, `ctx.text()`, ...), covered in [Responses](/docs/basics/responses).

## Accessing Request Properties

Access request data through the native `ctx.request` object:

```typescript
router.post("/users", async (ctx) => {
  const method = ctx.request.method;  // "POST"
  const url = new URL(ctx.request.url);
  const path = url.pathname;          // "/users"

  return { method, path };
});
```

## Request Headers

Access request headers through `ctx.request.headers`:

```typescript
router.get("/info", (ctx) => {
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

Access dynamic route segments via `ctx.params`. Values are strings, decoded with `decodeURIComponent`:

```typescript
// GET /users/123
router.get("/users/:id", (ctx) => {
  const id = ctx.params.id; // "123"
  return { userId: id };
});

// GET /posts/456/comments/789
router.get<{ postId: string; commentId: string }>(
  "/posts/:postId/comments/:commentId",
  (ctx) => {
    const { postId, commentId } = ctx.params; // typed as string
    return { postId, commentId };
  },
);
```

Without a type parameter, `ctx.params` is `Record<string, string | undefined>`. Never concatenate a parameter straight into a filesystem path: a decoded value can contain `/` or `..`.

## Query Parameters

Access query string parameters via `ctx.query`, which is a `URLSearchParams` object:

```typescript
// GET /search?q=bunary&page=2&limit=10
router.get("/search", (ctx) => {
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
router.get("/filter", (ctx) => {
  const tags = ctx.query.getAll("tag"); // ["typescript", "bun"]
  return { tags };
});
```

## Request Body

Read the request body with the readers on `ctx.body`. Malformed JSON or form data throws a `BodyParseError`, which the router answers with `400`.

### JSON Body

```typescript
router.post("/users", async (ctx) => {
  const body = await ctx.body.json<{ name: string; email: string }>();

  return {
    received: body,
    name: body.name,
    email: body.email,
  };
});
```

### Form Data

```typescript
router.post("/contact", async (ctx) => {
  const formData = await ctx.body.formData();

  const name = formData.get("name");
  const email = formData.get("email");
  const message = formData.get("message");

  return { name, email, message };
});
```

### Raw Text

```typescript
router.post("/webhook", async (ctx) => {
  const rawBody = await ctx.body.text();

  return { received: rawBody.length };
});
```

A request body can only be read once. If middleware reads it, share the parsed value with the handler through `ctx.locals`. To cap how much a handler may read, set `createRouter({ maxBodySize })`; larger bodies are answered with `413`.

## Cookies

`ctx.cookies` reads the incoming `Cookie` header:

```typescript
router.get("/whoami", (ctx) => {
  return { session: ctx.cookies.get("session") ?? null };
});
```

Setting and deleting cookies is shown in [Responses](/docs/basics/responses).

## Typed Request Bodies

For a quick type, pass a type parameter to `ctx.body.json<T>()`. It only narrows the TypeScript type; nothing is checked at runtime:

```typescript
interface CreateUserBody {
  name: string;
  email: string;
  password: string;
}

router.post("/users", async (ctx) => {
  const body = await ctx.body.json<CreateUserBody>();

  // TypeScript knows body.name, body.email, body.password
  const user = await createUser(body);

  return user;
});
```

## Validating Requests

To check the input at runtime, pass a schema object between the path and the handler. Each slot (`params`, `query`, `body`) takes a Standard Schema validator such as zod, or a plain function. A validated slot is replaced by the schema's output, so `ctx.body` *is* the parsed body:

```typescript
import { z } from "zod";

router.post(
  "/users/:id",
  {
    params: z.object({ id: z.coerce.number() }),
    body: z.object({ name: z.string(), email: z.email() }),
  },
  (ctx) => {
    ctx.params.id;  // number
    ctx.body.name;  // string
    return ctx.json({ id: ctx.params.id }, { status: 201 });
  },
);
```

A rejected schema is answered with a `422` problem document listing every issue. Validation uses `@bunary/core`, so install it alongside http:

```bash
bun add @bunary/core
```

See [Validation](/docs/packages/http#validation) in the package docs for what each schema receives.

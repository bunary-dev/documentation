---
title: Responses
description: Sending HTTP responses from your handlers.
order: 3
---

# Responses

Sending HTTP responses from your handlers.

## Basic Responses

Bunary route handlers can return plain values, which the router serializes for you, or a Web `Response`.

### JSON Responses

Return an object to automatically send a JSON response with status 200:

```typescript
import { createRouter } from "@bunary/http";

const router = createRouter();

// Simple object return (defaults to 200 status)
router.get("/users", () => {
  return { users: [{ id: 1, name: "John" }] };
});

// Arrays are also automatically serialized to JSON
router.get("/items", () => {
  return [1, 2, 3, 4, 5];
});
```

Other return values follow the same idea:

```typescript
// Strings → text/plain
router.get("/hello", () => "Hello, World!");

// null/undefined → 204 No Content
router.get("/empty", () => null);

// Response objects are passed through unchanged
router.get("/custom", () => new Response("Custom", { status: 201 }));
```

## Response Helpers

When you need control over the status code or headers, use the response helpers on the context. Each returns a plain Web `Response`:

```typescript
// 201 Created
router.post("/users", async (ctx) => {
  const body = await ctx.body.json<{ name: string }>();
  const user = { id: 1, ...body };

  return ctx.json(user, { status: 201 });
});

// 204 No Content
router.delete("/users/:id", (ctx) => ctx.status(204));
```

| Helper | Status | Content-Type |
|---|---|---|
| `ctx.json(data, init?)` | `200` (or `init.status`) | `application/json; charset=utf-8` |
| `ctx.text(body, init?)` | `200` (or `init.status`) | `text/plain; charset=utf-8` |
| `ctx.html(body, init?)` | `200` (or `init.status`) | `text/html; charset=utf-8` |
| `ctx.redirect(url, status = 302)` | `302` (or the argument) | — (sets `location`) |
| `ctx.status(code, init?)` | the `code` argument | — (empty body) |

The same helpers are exported as standalone functions for code that has no context, such as a shared helper module:

```typescript
import { json, status } from "@bunary/http";

export const notFound = (what: string) => json({ error: `${what} not found` }, { status: 404 });
export const accepted = () => status(202);
```

### Text Responses

```typescript
router.get("/hello", (ctx) => ctx.text("Hello, World!"));
```

### HTML Responses

```typescript
router.get("/page", (ctx) => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>My Page</title></head>
      <body><h1>Hello, Bunary!</h1></body>
    </html>
  `;

  return ctx.html(html);
});
```

## Response Headers

Pass headers in the `init` argument. They are merged with the helper's default content type, and an explicit `content-type` wins:

```typescript
router.get("/download", (ctx) => {
  return ctx.json({ data: "example" }, {
    headers: {
      "Content-Disposition": "attachment; filename=data.json",
      "X-Custom-Header": "custom-value",
    },
  });
});

router.get("/cached", (ctx) => {
  return ctx.json({ cached: true }, {
    headers: {
      "Cache-Control": "max-age=3600",
      "X-Request-Id": crypto.randomUUID(),
    },
  });
});

router.get("/report.csv", (ctx) => {
  return ctx.text("a,b\n1,2", { headers: { "content-type": "text/csv" } });
});
```

## Status Code Examples

Common HTTP status code patterns:

```typescript
// 200 OK (default with object return)
router.get("/", () => ({ status: "ok" }));

// 400 Bad Request
router.post("/validate", (ctx) => {
  return ctx.json({ error: "Invalid input" }, { status: 400 });
});

// 401 Unauthorized
router.get("/protected", (ctx) => {
  return ctx.json({ error: "Unauthorized" }, { status: 401 });
});

// 404 Not Found
router.get("/users/:id", (ctx) => {
  return ctx.json({ error: "User not found" }, { status: 404 });
});
```

`ctx.status(code)` always sends an empty body, which keeps bodyless codes such as `204` and `304` valid.

## Redirects

Redirect to another URL with `ctx.redirect()`:

```typescript
// 302 Temporary redirect (default)
router.get("/old", (ctx) => ctx.redirect("/new"));

// 301 Permanent redirect
router.get("/legacy", (ctx) => ctx.redirect("/modern", 301));

// External redirect
router.get("/github", (ctx) => ctx.redirect("https://github.com/bunary-dev"));
```

## Cookies

Queue cookies with `ctx.cookies`. The router appends the `Set-Cookie` headers to whatever response is finally sent, so the helpers above work unchanged:

```typescript
router.post("/login", (ctx) => {
  ctx.cookies.set("session", "abc123", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });
  return ctx.json({ ok: true });
});

router.post("/logout", (ctx) => {
  ctx.cookies.delete("session");
  return ctx.json({ ok: true });
});
```

Cookies are neither signed nor encrypted. For login state, use the session guard from [@bunary/auth](/docs/packages/auth#session-guard-createsessionguardoptions).

## Streaming Responses

Stream large responses using a `ReadableStream`:

```typescript
router.get("/stream", () => {
  const stream = new ReadableStream({
    async start(controller) {
      for (let i = 0; i < 10; i++) {
        controller.enqueue(new TextEncoder().encode(`Data chunk ${i}\n`));
        await Bun.sleep(100);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain" },
  });
});
```

For live updates to the browser, `sse()` returns a Server-Sent Events stream with event framing, keep-alive pings and a disconnect signal:

```typescript
import { sse } from "@bunary/http";

router.get("/clock", (ctx) =>
  sse(ctx, (stream) => {
    const timer = setInterval(() => {
      stream.send({ event: "tick", data: { now: Date.now() } });
    }, 1000);
    stream.signal.addEventListener("abort", () => clearInterval(timer));
  }, { keepAlive: 15_000 }),
);
```

## File Responses

To serve a directory of assets, mount `serveStatic()` on a wildcard route. It sets `Content-Type`, `ETag` and `Last-Modified`, answers conditional requests with `304`, and refuses dotfiles and path traversal:

```typescript
import { serveStatic } from "@bunary/http";

router.get("/assets/*", serveStatic("./public", { maxAge: 3600 }));
// GET /assets/css/site.css → ./public/css/site.css
```

For a single file, return it with Bun's file API. Constrain the parameter so it cannot name a path outside the directory:

```typescript
router.get("/download/:filename", async (ctx) => {
  const file = Bun.file(`./uploads/${ctx.params.filename}`);

  if (!await file.exists()) {
    return ctx.json({ error: "File not found" }, { status: 404 });
  }

  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${ctx.params.filename}"`,
    },
  });
}).where("filename", /^[a-zA-Z0-9_-]+\.[a-z0-9]+$/);
```

See the [@bunary/http](/docs/packages/http) package docs for content negotiation with `Resource`, and the full list of response options.

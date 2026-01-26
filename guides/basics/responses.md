
# Responses

Sending HTTP responses from your handlers.

## Basic Responses

Bunary route handlers can return different types of responses:

### JSON Responses

Return an object to automatically send a JSON response with status 200:

```typescript
// Simple object return (defaults to 200 status)
app.get("/users", () => {
  return { users: [{ id: 1, name: "John" }] };
});

// Arrays are also automatically serialized to JSON
app.get("/items", () => {
  return [1, 2, 3, 4, 5];
});
```

### Custom Status Codes

Use the native `Response` object for custom status codes:

```typescript
// 201 Created
app.post("/users", async (ctx) => {
  const body = await ctx.request.json();
  const user = { id: 1, ...body };
  
  return new Response(JSON.stringify(user), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
});

// 204 No Content
app.delete("/users/:id", () => {
  return new Response(null, { status: 204 });
});
```

### Text Responses

```typescript
app.get("/hello", () => {
  return new Response("Hello, World!", {
    headers: { "Content-Type": "text/plain" },
  });
});
```

### HTML Responses

```typescript
app.get("/page", () => {
  const html = `
    <!DOCTYPE html>
    <html>
      <head><title>My Page</title></head>
      <body><h1>Hello, Bunary!</h1></body>
    </html>
  `;
  
  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  });
});
```

## Response Headers

Set custom response headers using the Response constructor:

```typescript
app.get("/download", () => {
  return new Response(JSON.stringify({ data: "example" }), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=data.json",
      "X-Custom-Header": "custom-value",
    },
  });
});

app.get("/cached", () => {
  return new Response(JSON.stringify({ cached: true }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "max-age=3600",
      "X-Request-Id": crypto.randomUUID(),
    },
  });
});
```

## Status Code Examples

Common HTTP status code patterns:

```typescript
// 200 OK (default with object return)
app.get("/", () => ({ status: "ok" }));

// 400 Bad Request
app.post("/validate", () => {
  return new Response(JSON.stringify({ error: "Invalid input" }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
});

// 401 Unauthorized
app.get("/protected", () => {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
});

// 404 Not Found
app.get("/users/:id", (ctx) => {
  return new Response(JSON.stringify({ error: "User not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});
```

## Redirects

Redirect to another URL using `Response.redirect()`:

```typescript
// 302 Temporary redirect (default)
app.get("/old", () => {
  return Response.redirect("/new");
});

// 301 Permanent redirect
app.get("/legacy", () => {
  return Response.redirect("/modern", 301);
});

// External redirect
app.get("/github", () => {
  return Response.redirect("https://github.com/bunary-dev");
});
```

## Streaming Responses

Stream large responses using ReadableStream:

```typescript
app.get("/stream", () => {
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

## File Responses

Serve files using Bun's file API:

```typescript
app.get("/download/:filename", async (ctx) => {
  const file = Bun.file(`./uploads/${ctx.params.filename}`);
  
  if (!await file.exists()) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return new Response(file, {
    headers: {
      "Content-Type": file.type,
      "Content-Disposition": `attachment; filename="${ctx.params.filename}"`,
    },
  });
});
```

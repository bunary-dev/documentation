
# Middleware

Intercept and modify requests and responses.

## Introduction

Middleware provides a mechanism for filtering and modifying HTTP requests entering your application. Common use cases include authentication, logging, CORS handling, and request validation.

## Defining Middleware

A middleware is a function that receives the context and a `next` function:

```typescript
import type { Middleware } from "@bunary/http";

const logger: Middleware = async (ctx, next) => {
  const start = Date.now();
  const url = new URL(ctx.request.url);
  
  // Before handler
  console.log(`→ ${ctx.request.method} ${url.pathname}`);
  
  // Call the next middleware or route handler
  await next();
  
  // After handler
  const duration = Date.now() - start;
  console.log(`← ${ctx.request.method} ${url.pathname} ${duration}ms`);
};
```

## Global Middleware

Register middleware that runs on every request using `app.use()`:

```typescript
import { createApp } from "@bunary/http";

const app = createApp();

// Register global middleware
app.use(logger);
app.use(cors);

app.get("/", () => ({ message: "Hello!" }));

app.listen(3000);
```

## Middleware Order

Middleware executes in the order it's registered. The first middleware registered runs first on the way in and last on the way out:

```typescript
app.use(errorHandler);  // 1st in, last out (catches all errors)
app.use(logger);        // 2nd in, 2nd out (logs all requests)
app.use(cors);          // 3rd in, 1st out (adds CORS headers)

// Request flow:
// → errorHandler → logger → cors → route handler
// ← errorHandler ← logger ← cors ←
```

## Common Middleware Patterns

### Authentication

```typescript
const auth: Middleware = async (ctx, next) => {
  const token = ctx.request.headers.get("authorization")?.replace("Bearer ", "");
  
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  try {
    const user = await verifyToken(token);
    // Store user for later use (if extending context)
    await next();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid token" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### CORS

```typescript
const cors: Middleware = async (ctx, next) => {
  // Handle preflight requests
  if (ctx.request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  
  await next();
};
```

### Error Handling

```typescript
const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Error:", error);
    
    const message = error instanceof Error ? error.message : "Internal Server Error";
    const status = error instanceof ValidationError ? 400 : 500;
    
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Use as first middleware
app.use(errorHandler);
```

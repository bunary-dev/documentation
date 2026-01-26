
# Authentication

Securing your API with the Bunary authentication system.

## Introduction

The `@bunary/auth` package provides a flexible authentication layer with support for multiple guards. Guards are responsible for authenticating requests and returning user information.

## Installation

```bash
bun add @bunary/auth
```

## Basic Setup

Configure the auth manager with your guards. Guards are objects with a `name` and an `authenticate` method:

```typescript
import { createAuthManager, setAuthManager } from "@bunary/auth";

const authManager = createAuthManager({
  defaultGuard: "jwt",
  guards: {
    jwt: {
      name: "jwt",
      async authenticate(request) {
        const token = request.headers.get("Authorization")?.replace("Bearer ", "");
        if (!token) return null;
        
        // Validate token and return user
        const user = await verifyJWT(token);
        return user;
      },
    },
  },
});

// Set as global auth manager (optional)
setAuthManager(authManager);
```

## Authenticating Requests

Use the auth manager to authenticate incoming requests:

```typescript
app.get("/profile", async (ctx) => {
  const user = await authManager.authenticate(ctx.request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return { user };
});
```

## Creating Auth Middleware

Create reusable authentication middleware:

```typescript
import type { Middleware } from "@bunary/http";

const requireAuth: Middleware = async (ctx, next) => {
  const user = await authManager.authenticate(ctx.request);
  
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  // Continue to route handler
  await next();
};

// Use as global middleware for protected routes
app.use(requireAuth);
```

## Accessing the User

After authentication, access the user via the auth manager:

```typescript
app.get("/profile", async (ctx) => {
  await authManager.authenticate(ctx.request);
  
  // Get the authenticated user
  const user = authManager.user();
  
  // Check if authenticated
  if (!authManager.check()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  return { id: user?.id };
});
```

## The auth() Helper

Use the `auth()` helper to access the global auth manager:

```typescript
import { auth, setAuthManager } from "@bunary/auth";

// First, set up the global auth manager
setAuthManager(authManager);

// Then use auth() anywhere in your app
app.get("/dashboard", async (ctx) => {
  await auth().authenticate(ctx.request);
  
  if (!auth().check()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  
  const user = auth().user();
  return { dashboard: true, user };
});
```

## Logout

Clear the current authentication state:

```typescript
app.post("/logout", async (ctx) => {
  // Clear the auth state
  authManager.logout();
  
  return { message: "Logged out successfully" };
});
```

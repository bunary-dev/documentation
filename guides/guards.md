---
title: Guards
description: Understanding and creating authentication guards
---

# Guards

Understanding and creating authentication guards.

## What are Guards?

Guards define how users are authenticated for each request. They are responsible for extracting credentials from requests (e.g., tokens from headers), validating them, and returning user information. Bunary supports multiple guards, allowing different authentication methods for different parts of your application.

## Guard Interface

All guards must implement the following interface:

```typescript
interface Guard {
  /** Unique name for this guard */
  name: string;
  
  /**
   * Authenticate a request and return the user if valid.
   * @param request - The incoming HTTP request
   * @returns The authenticated user or null
   */
  authenticate(request: Request): Promise<AuthUser | null> | AuthUser | null;
}

interface AuthUser {
  id: string | number;
  [key: string]: unknown;
}
```

## Creating a JWT Guard

Here's how to create a JWT-based guard:

```typescript
import type { Guard, AuthUser } from "@bunary/auth";

const jwtGuard: Guard = {
  name: "jwt",
  
  async authenticate(request: Request): Promise<AuthUser | null> {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    
    if (!token) {
      return null;
    }
    
    try {
      // Verify JWT and extract payload (use your JWT library)
      const payload = await verifyJWT(token, process.env.JWT_SECRET!);
      
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch {
      return null;
    }
  },
};
```

## API Key Guard

Example of an API key-based guard:

```typescript
const apiKeyGuard: Guard = {
  name: "apiKey",
  
  async authenticate(request: Request): Promise<AuthUser | null> {
    const apiKey = request.headers.get("X-API-Key");
    
    if (!apiKey) {
      return null;
    }
    
    // Look up the API key in your database
    const keyRecord = await db.apiKeys.findByKey(apiKey);
    
    if (!keyRecord || keyRecord.revoked) {
      return null;
    }
    
    return {
      id: keyRecord.userId,
      keyId: keyRecord.id,
      permissions: keyRecord.permissions,
    };
  },
};
```

## Multiple Guards

Configure multiple guards for different authentication strategies:

```typescript
import { createAuthManager } from "@bunary/auth";

const authManager = createAuthManager({
  defaultGuard: "jwt",
  guards: {
    jwt: jwtGuard,
    apiKey: apiKeyGuard,
  },
});

// Use the default guard
const user = await authManager.authenticate(request);

// Use a specific guard
const apiUser = await authManager.authenticate(request, "apiKey");
```

## Accessing Guards Directly

Access individual guards via the `guard()` method:

```typescript
// Get the default guard
const defaultGuard = authManager.guard();

// Get a specific guard by name
const jwtGuard = authManager.guard("jwt");
const apiKeyGuard = authManager.guard("apiKey");

// Use the guard directly
const user = await jwtGuard.authenticate(request);
```

## Guard-Specific Middleware

Create middleware that uses specific guards:

```typescript
import type { Middleware } from "@bunary/http";

// Factory function to create guard-specific middleware
function createAuthMiddleware(guardName?: string): Middleware {
  return async (ctx, next) => {
    const user = await authManager.authenticate(ctx.request, guardName);
    
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
    
    await next();
  };
}

// Create middleware for different guards
const requireJWT = createAuthMiddleware("jwt");
const requireApiKey = createAuthMiddleware("apiKey");

// Use in routes
app.use(requireJWT);  // Default for all routes

// Or apply globally
app.get("/webhook", async (ctx) => {
  // Authenticate with API key for this specific route
  const user = await authManager.authenticate(ctx.request, "apiKey");
  if (!user) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { received: true };
});
```

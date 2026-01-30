# Guards

Understanding and using authentication guards with app-scoped auth.

## Built-in Guards

Use `createAuth()` with built-in guards; auth is available as `ctx.locals.auth`.

### JWT Guard

```typescript
import { createApp } from "@bunary/http";
import { createAuth, createJwtGuard } from "@bunary/auth";
import type { AuthContext } from "@bunary/auth";

const app = createApp();

const authMiddleware = createAuth({
  defaultGuard: "jwt",
  guards: {
    jwt: createJwtGuard({
      secret: process.env.JWT_SECRET!,
      issuer: "my-app",
      audience: "api",
    }),
  },
});

app.use(authMiddleware);

app.get("/profile", async (ctx) => {
  const auth = ctx.locals.auth as AuthContext;
  await auth.authenticate();
  if (!auth.check()) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return { user: auth.user() };
});

app.listen({ port: 3000 });
```

### Basic Auth Guard

```typescript
import { createAuth, createBasicGuard } from "@bunary/auth";

const authMiddleware = createAuth({
  defaultGuard: "basic",
  guards: {
    basic: createBasicGuard({
      verify: async (username, password, request) => {
        const user = await db.users.findByUsername(username);
        if (!user || !(await verifyPassword(password, user.passwordHash))) return null;
        return { id: user.id, username: user.username };
      },
    }),
  },
});

app.use(authMiddleware);
```

## Multiple Guards

Register multiple guards and use the default or a specific guard per request:

```typescript
const authMiddleware = createAuth({
  defaultGuard: "jwt",
  guards: {
    jwt: createJwtGuard({ secret: process.env.JWT_SECRET! }),
    basic: createBasicGuard({ verify: myVerify }),
  },
});

app.use(authMiddleware);

app.get("/profile", async (ctx) => {
  const auth = ctx.locals.auth as AuthContext;
  await auth.authenticate(); // uses default guard (jwt)
  if (!auth.check()) return unauthorized();
  return { user: auth.user() };
});

app.get("/webhook", async (ctx) => {
  const auth = ctx.locals.auth as AuthContext;
  await auth.authenticate("basic"); // use basic for this route
  if (!auth.check()) return unauthorized();
  return { received: true };
});
```

## Custom Guards

Guards implement the `Guard` interface: `name` (string) and `authenticate(request: Request)` returning `Promise<AuthUser | null>` or `AuthUser | null`:

```typescript
import type { Guard, AuthUser } from "@bunary/auth";

const apiKeyGuard: Guard = {
  name: "apiKey",
  async authenticate(request: Request): Promise<AuthUser | null> {
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) return null;
    const keyRecord = await db.apiKeys.findByKey(apiKey);
    if (!keyRecord?.active) return null;
    return { id: keyRecord.userId, keyId: keyRecord.id };
  },
};

const authMiddleware = createAuth({
  defaultGuard: "jwt",
  guards: {
    jwt: createJwtGuard({ secret: process.env.JWT_SECRET! }),
    apiKey: apiKeyGuard,
  },
});
```

---
title: Guards
description: Understanding and using authentication guards with app-scoped auth.
order: 2
---

# Guards

Understanding and using authentication guards with app-scoped auth.

## Built-in Guards

Use `createAuth()` with built-in guards; auth is available as `ctx.locals.auth`.

### JWT Guard

```typescript
import { createRouter } from "@bunary/http";
import { createAuth, createJwtGuard } from "@bunary/auth";
import type { AuthLocals } from "@bunary/auth";

const router = createRouter<AuthLocals>();

router.use(
  createAuth<AuthLocals>({
    defaultGuard: "jwt",
    guards: {
      jwt: createJwtGuard({
        secret: process.env.JWT_SECRET!,
        issuer: "my-app",
        audience: "api",
      }),
    },
  }),
);

router.get("/profile", async (ctx) => {
  const user = await ctx.locals.auth.authenticate();
  if (!user) {
    return ctx.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { user };
});

router.listen({ port: 3000 });
```

Tokens without `exp` are rejected by default, and only the configured `algorithms` are accepted. For asymmetric keys, pass `key` or `jwksUrl` together with `algorithms` instead of `secret`; see the [JWT guard reference](/docs/packages/auth#jwt-guard-createjwtguardoptions).

### Basic Auth Guard

Store password hashes and check them with `Bun.password.verify`; never compare plaintext passwords in `verify`:

```typescript
import { createAuth, createBasicGuard } from "@bunary/auth";
import type { AuthLocals } from "@bunary/auth";

router.use(
  createAuth<AuthLocals>({
    defaultGuard: "basic",
    guards: {
      basic: createBasicGuard({
        async verify(username, password, request) {
          const user = await findUserByName(username); // your lookup
          if (!user) return null;
          if (!(await Bun.password.verify(password, user.passwordHash))) return null;
          return { id: user.id, username };
        },
      }),
    },
  }),
);
```

The Basic guard is stateless: credentials come with every request, so `login()` and `logout()` throw.

### Session Guard

For browser apps, `createSessionGuard({ provider, secret })` keeps the user id in an encrypted, `HttpOnly` cookie. `@bunary/http` writes the cookie through `ctx.cookies`. See [Logging In and Out](./index.md#logging-in-and-out) and the [session guard reference](/docs/packages/auth#session-guard-createsessionguardoptions).

## Multiple Guards

Register multiple guards and use the default or a specific guard per request:

```typescript
router.use(
  createAuth<AuthLocals>({
    defaultGuard: "jwt",
    guards: {
      jwt: createJwtGuard({ secret: process.env.JWT_SECRET! }),
      basic: createBasicGuard({ verify: myVerify }),
    },
  }),
);

router.get("/profile", async (ctx) => {
  const user = await ctx.locals.auth.authenticate(); // uses default guard (jwt)
  if (!user) return ctx.json({ error: "Unauthorized" }, { status: 401 });
  return { user };
});

router.get("/webhook", async (ctx) => {
  const user = await ctx.locals.auth.authenticate("basic"); // use basic for this route
  if (!user) return ctx.json({ error: "Unauthorized" }, { status: 401 });
  return { received: true };
});
```

## Custom Guards

Guards implement the `Guard` interface: `name` (string) and `authenticate(request, input?)` returning `Promise<AuthUser | null>` or `AuthUser | null`. Guards that log users in can also implement `attempt`, `login` and `logout`:

```typescript
import { createAuth, createJwtGuard } from "@bunary/auth";
import type { AuthLocals, AuthUser, Guard } from "@bunary/auth";

const apiKeyGuard: Guard = {
  name: "apiKey",
  async authenticate(request: Request): Promise<AuthUser | null> {
    const apiKey = request.headers.get("X-API-Key");
    if (!apiKey) return null;
    const keyRecord = await findApiKey(apiKey); // your lookup
    if (!keyRecord?.active) return null;
    return { id: keyRecord.userId, keyId: keyRecord.id };
  },
};

router.use(
  createAuth<AuthLocals>({
    defaultGuard: "jwt",
    guards: {
      jwt: createJwtGuard({ secret: process.env.JWT_SECRET! }),
      apiKey: apiKeyGuard,
    },
  }),
);
```

Calling `attempt()` or `login()` on a guard that does not implement them throws. See [Custom guards](/docs/packages/auth#custom-guards) for the full interface.

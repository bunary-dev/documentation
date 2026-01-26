---
title: @bunary/auth
description: Authentication manager with guard abstraction for securing APIs
---

# @bunary/auth

Authentication and authorization module for the Bunary framework. Provides a flexible guard-based authentication system.

## Installation

```bash
bun add @bunary/auth
```

## Quick Start

```typescript
import { createAuthManager, setAuthManager, auth } from "@bunary/auth";
import type { Guard, AuthUser } from "@bunary/auth";

// Define a JWT guard
const jwtGuard: Guard = {
  name: "jwt",
  async authenticate(request) {
    const token = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return null;
    
    // Validate token and return user
    const user = await validateToken(token);
    return user;
  }
};

// Create and register the auth manager
const authManager = createAuthManager({
  defaultGuard: "jwt",
  guards: {
    jwt: jwtGuard,
  },
});

setAuthManager(authManager);
```

## API Reference

| Export | Type | Description |
|--------|------|-------------|
| `createAuthManager` | Function | Create auth manager instance |
| `auth` | Function | Get global auth manager |
| `setAuthManager` | Function | Set global auth manager |
| `getAuthManager` | Function | Get global auth manager or throw |
| `clearAuthManager` | Function | Clear global auth manager |
| `Guard` | Interface | Guard interface |
| `AuthUser` | Interface | Authenticated user type |
| `AuthConfig` | Interface | Auth manager config type |
| `AuthManagerInterface` | Interface | Auth manager interface |

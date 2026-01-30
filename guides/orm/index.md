# ORM

Working with databases using Bunary's ORM.

## Overview

Bunary's ORM provides an Eloquent-like interface for working with databases. It features a database abstraction layer that supports multiple database types through a unified API, plus a **Schema** builder and **migrations** for versioning your database schema.

## Quick Start

```typescript
import { Model, setOrmConfig } from "@bunary/orm";

// Configure the ORM
setOrmConfig({
  database: {
    type: "sqlite",
    sqlite: {
      path: "./database.sqlite"
    }
  }
});

// Query using the Model API
const user = await Model.table("users").find(1);
const allUsers = await Model.table("users").all();
```

## Using BaseModel

Create model classes that extend `BaseModel` for an Eloquent-like experience:

```typescript
import { BaseModel } from "@bunary/orm";

class User extends BaseModel {
  protected static tableName = "users";
  protected static protected = ["password"];
  protected static timestamps = ["createdAt", "updatedAt"];
}

// Use the model
const user = await User.find(1);
const users = await User.all();
const activeUsers = await User.where("status", "=", "active").all();
```

## Migrations

Version your database schema with migration files and the Schema builder. Use the CLI to create and run migrations:

- **`bunary migration:make <name>`** — Create a migration in `./migrations/`
- **`bunary migrate`** — Run pending migrations (creates `scripts/migrate.ts` on first use)
- **`bunary migrate:rollback`** — Rollback last batch
- **`bunary migrate:status`** — Show ran vs pending

Your project needs `src/config/orm.ts` that calls `setOrmConfig` so the migrator can connect. See [Migrations](./migrations.md) for the Schema builder, migration file format, and programmatic API.

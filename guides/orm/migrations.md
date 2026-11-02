---
title: Migrations
description: Manage database schema changes with drizzle-kit migrations generated from your Drizzle tables.
order: 5
---

# Migrations

Manage database schema changes with drizzle-kit migrations generated from your Drizzle tables.

## Overview

`@bunary/orm` has no migrator and no schema builder. Your Drizzle tables are the schema, and [drizzle-kit](https://orm.drizzle.team/docs/kit-overview) compares them with the database to write SQL migration files and apply them.

```bash
bun add @bunary/orm drizzle-orm
bun add -d drizzle-kit
```

## Defining the schema

Keep your tables in one module so drizzle-kit, your models and `ormProvider({ schema })` all read the same definitions:

```typescript
// src/db/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text().primaryKey().$defaultFn(() => Bun.randomUUIDv7()),
  name: text().notNull(),
  email: text().notNull().unique(),
  active: integer({ mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const posts = sqliteTable("posts", {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text().notNull(),
});
```

To change the schema later (add a column, rename a table), edit the tables and generate a new migration.

## Configuring drizzle-kit

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite", // or "postgresql"
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: "./app.sqlite" }, // or process.env.DATABASE_URL
});
```

## Commands

| Command | Description |
|--------|-------------|
| `bunx drizzle-kit generate` | Write SQL migrations to `./drizzle` from changes to your tables |
| `bunx drizzle-kit migrate` | Apply pending migrations |
| `bunx drizzle-kit studio` | Browse the database |

With `@bunary/orm` installed as a dependency, the Bunary CLI also lists `bunary db:generate`, `bunary db:migrate` and `bunary db:studio`: thin pass-throughs to the same drizzle-kit commands.

```bash
bunary db:generate
bunary db:migrate
```

## Running migrations at startup

To apply migrations from code, use Drizzle's migrator:

```typescript
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

const db = drizzle({ client: new Database("app.sqlite") });

migrate(db, { migrationsFolder: "./drizzle" });

// Postgres: import from "drizzle-orm/bun-sql/migrator" and `await migrate(...)`
```

With `ormProvider`, run it against the database bound under `DatabaseToken` after `app.boot()`; see [Database Configuration](./database-config.md).

## Upgrading from the old migrator

The pre-0.4 `Schema` builder, migration files with `up()` / `down()`, the `migrate` CLI commands and the programmatic migrator are gone, with no compatibility shims. Recreate your tables as Drizzle tables and let drizzle-kit generate the migrations. See the upgrade table in the [`@bunary/orm` package reference](/docs/packages/orm).

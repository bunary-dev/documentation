---
title: ORM
description: Working with databases using Bunary's ORM.
order: 1
---

# ORM

Working with databases using Bunary's ORM.

## Overview

`@bunary/orm` gives you Laravel-style models built on [Drizzle](https://orm.drizzle.team). You describe your tables with Drizzle, and `defineModel(db, table)` wraps a table in a model with `find` / `create` / `save` / `delete`, dirty tracking, model events, hidden columns, soft deletes, named scopes and eager loading. Anything the model API does not cover (joins, aggregates, migrations) is plain Drizzle.

SQLite (`bun:sqlite`) and Postgres (`Bun.SQL`) are supported.

## Installation

`drizzle-orm` is a peer dependency, and `drizzle-kit` handles migrations:

```bash
bun add @bunary/orm drizzle-orm
bun add -d drizzle-kit
```

## Quick Start

```typescript
import { Database } from "bun:sqlite";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { defineModel } from "@bunary/orm";

// A Drizzle table
export const users = sqliteTable("users", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  email: text().notNull().unique(),
});

// A Drizzle database
const db = drizzle({ client: new Database("app.sqlite") });

// A model
export const User = defineModel(db, users);

const user = await User.create({ name: "Ada", email: "ada@example.com" });
if (!user) throw new Error("cancelled by a listener");

user.name = "Ada Lovelace";
await user.save(); // writes only the dirty "name" column

const found = await User.where(eq(users.email, "ada@example.com")).first();
const byId = await User.find(1);
```

## Using the ORM in a Bunary app

With `@bunary/core`, `ormProvider` builds the Drizzle database from the `database` key of your config and binds it under `DatabaseToken`. Handlers mounted with `httpProvider` from `@bunary/http/provider` can then use your models. See [Database Configuration](./database-config.md) for the full setup.

## Migrations

There is no Bunary migrator: schema changes are your Drizzle tables plus [drizzle-kit](https://orm.drizzle.team/docs/kit-overview). Generate SQL migrations with `bunx drizzle-kit generate` and apply them with `bunx drizzle-kit migrate`. See [Migrations](./migrations.md).

## Next steps

- [Working with Models](./models.md): defining models, hidden columns, soft deletes, events
- [Query Builder](./query-builder.md): `where()`, scopes, eager loading and raw Drizzle queries
- [Database Configuration](./database-config.md): SQLite, Postgres and `ormProvider`
- [Migrations](./migrations.md): drizzle-kit
- The [`@bunary/orm` package reference](/docs/packages/orm)

---
title: Database Configuration
description: Configure your database connection for the ORM.
order: 4
---

# Database Configuration

Configure your database connection for the ORM.

There is no global ORM configuration: every model takes a Drizzle database explicitly. You either create that database yourself, or let `ormProvider` build it from the `database` key of your Bunary config.

## SQLite Configuration

```typescript
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { defineModel } from "@bunary/orm";
import { users } from "./schema";

const db = drizzle({ client: new Database("./database.sqlite") });

export const User = defineModel(db, users);
```

Tables for SQLite come from `drizzle-orm/sqlite-core` (`sqliteTable`).

## Postgres Configuration

```typescript
import { SQL } from "bun";
import { drizzle } from "drizzle-orm/bun-sql";
import { defineModel } from "@bunary/orm";
import { users } from "./schema";

const db = drizzle({ client: new SQL(process.env.DATABASE_URL!) });

export const User = defineModel(db, users);
```

Tables for Postgres come from `drizzle-orm/pg-core` (`pgTable`). Using a SQLite table with a Postgres database (or the other way round) is a type error. MySQL is not supported.

## Using the `database` config key

In a Bunary app, put the connection in your config and register `ormProvider` (from the `@bunary/orm/provider` subpath; it needs `@bunary/core`):

```bash
bun add @bunary/core @bunary/http @bunary/orm drizzle-orm
```

```typescript
// config/bunary.ts
import { defineConfig } from "@bunary/core";

export default defineConfig({
  app: { name: "my-app" },
  http: { port: 3000 },
  database: { dialect: "sqlite", path: "app.sqlite" },
  // or: database: { dialect: "postgres", url: process.env.DATABASE_URL! },
});
```

```typescript
// src/index.ts
import { createApp } from "@bunary/core";
import { createRouter } from "@bunary/http";
import { httpProvider, serve } from "@bunary/http/provider";
import { defineModel } from "@bunary/orm";
import { DatabaseToken, ormProvider } from "@bunary/orm/provider";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import config from "../config/bunary.js";
import * as schema from "./db/schema.js";

const router = createRouter();

const app = await createApp({
  config,
  providers: [ormProvider({ schema }), httpProvider(router)],
}).boot();

const db = app.get(DatabaseToken) as BunSQLiteDatabase<typeof schema>;
const User = defineModel(db, schema.users);

router.get<{ id: string }>("/users/:id", async (ctx) => {
  const user = await User.find(Number(ctx.params.id));
  return user ?? ctx.json({ error: "Not found" }, { status: 404 });
});

serve(app);
```

| `database.dialect` | Other keys               | Builds                                        |
| ------------------ | ------------------------ | --------------------------------------------- |
| `"sqlite"`         | `path` (or `":memory:"`) | a `drizzle-orm/bun-sqlite` database           |
| `"postgres"`       | `url`                    | a `drizzle-orm/bun-sql` database              |

- Pass your schema (tables and `relations()`) to `ormProvider({ schema })` to use `with()` eager loading.
- A missing or invalid `database` key rejects `app.boot()` with a `BunaryError`.
- `DatabaseToken` is typed as `AnyDatabase`: cast it to your dialect's Drizzle type (`BunSQLiteDatabase<typeof schema>` or `BunSQLDatabase<typeof schema>`).
- Every app gets its own database; two apps in one process share nothing.

## Best Practices

1. **Keep tables in one schema module**: drizzle-kit, `ormProvider({ schema })` and your models can all import it
2. **Hide sensitive fields**: add columns such as `password` to the model's `hidden` option
3. **Declare timestamps on the columns**: use Drizzle defaults (`$defaultFn`, `$onUpdate`, `defaultNow()`)
4. **Use `query()` for everything else**: ordering, limits and aggregates are plain Drizzle

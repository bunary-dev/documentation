# Migrations

Manage database schema changes with migration files and the Schema builder.

## Overview

Migrations let you version your database schema: each migration file defines `up()` (apply changes) and `down()` (rollback). The ORM provides a **Schema** builder for creating and altering tables, and a **Migrator** (or the CLI) to run and rollback migrations in order.

**Requirements:** `@bunary/orm` in your project. For the CLI commands you also need `src/config/orm.ts` that calls `setOrmConfig` so the migrator can connect.

## CLI commands

| Command | Description |
|--------|-------------|
| `bunary migration:make <name>` | Create a new migration file in `./migrations/` |
| `bunary migrate` | Run all pending migrations |
| `bunary migrate:rollback` | Rollback the last migration batch |
| `bunary migrate:status` | Show which migrations have run and which are pending |

### Creating a migration

```bash
bunary migration:make create_users_table
```

This creates a file like `./migrations/20260129120000_create_users_table.ts` with stub `up()` and `down()` that use `Schema` from `@bunary/orm`. The name is used to derive a table name (e.g. `create_users_table` → `"users"`) in the stub.

### Running migrations

```bash
bunary migrate
```

On first use, the CLI creates `scripts/migrate.ts` in your project. Ensure `src/config/orm.ts` calls `setOrmConfig` with your database config so the migrator can connect.

### Rollback and status

```bash
bunary migrate:rollback   # Rollback last batch
bunary migrate:status      # List ran and pending migrations
```

## Migration file format

Each migration file must export `up()` and `down()` (async or sync). Use the Schema builder for DDL:

```typescript
// migrations/20260129120000_create_users_table.ts
import { Schema } from "@bunary/orm";

export async function up() {
  Schema.createTable("users", (table) => {
    table.uuid("id").primary();
    table.string("name", 255).notNull();
    table.string("email", 255).unique().notNull();
    table.boolean("active").default(true);
    table.timestamps();
  });
}

export async function down() {
  Schema.dropTable("users");
}
```

Drop in reverse order of create (e.g. drop dependent tables first):

```typescript
export async function down() {
  Schema.dropTable("posts");
  Schema.dropTable("users");
}
```

## Schema builder

Use `Schema` inside migrations (after ORM config is set) to create, alter, and drop tables.

### Create and drop tables

```typescript
import { Schema } from "@bunary/orm";

// Create a table
Schema.createTable("users", (table) => {
  table.increments("id");                    // Integer primary key, auto-increment
  table.string("name", 255).notNull();
  table.string("email", 255).unique().notNull();
  table.boolean("active").default(true);
  table.timestamp("deleted_at").nullable();
  table.timestamps();                        // createdAt, updatedAt
});

// Or UUID primary key
Schema.createTable("posts", (table) => {
  table.uuid("id").primary();
  table.foreignId("user_id").references("users", "id");
  table.text("title").notNull();
  table.timestamps();
});

// Drop a table
Schema.dropTable("users");
```

### Alter tables and helpers

```typescript
// Add columns to an existing table
Schema.table("users", (table) => {
  table.string("phone", 20).nullable();
});

// Check before changing
if (!Schema.hasTable("users")) {
  Schema.createTable("users", (table) => { /* ... */ });
}
if (!Schema.hasColumn("users", "email")) {
  Schema.table("users", (table) => {
    table.string("email", 255);
  });
}

// Rename a table
Schema.renameTable("users", "accounts");
```

**Schema methods:** `createTable(name, callback)`, `dropTable(name)`, `table(name, callback)` (alter), `hasTable(name)`, `hasColumn(table, column)`, `renameTable(oldName, newName)`.

**Column types:** `increments("id")`, `integer("col")`, `text("col")`, `string("col", length?)`, `boolean("col")`, `timestamp("col")`, `uuid("id"?)`, `foreignId("col")`, `timestamps()`.

**Modifiers:** `.nullable()`, `.notNull()`, `.default(value)`, `.unique()`, `.primary()`, and `foreignId("col").references("table", "column")`.

## Programmatic API

Run migrations from code with `createMigrator`:

```typescript
import { createMigrator, setOrmConfig } from "@bunary/orm";

setOrmConfig({
  database: {
    type: "sqlite",
    sqlite: { path: "./database.sqlite" },
  },
});

const migrator = createMigrator({ migrationsPath: "./migrations" });

// Status: ran vs pending
const status = await migrator.status();
console.log("Ran:", status.ran);
console.log("Pending:", status.pending);

// Run all pending migrations (uses transactions; rollback on failure)
await migrator.up();

// Rollback last batch (default) or multiple batches
await migrator.down();
await migrator.down({ steps: 2 });
```

**API:** `createMigrator({ migrationsPath?, tableName? })`, `migrator.status()`, `migrator.up()`, `migrator.down({ steps?: number })`.

## Configuration

The migrator needs the ORM to be configured before running. In a Bunary project:

1. **`src/config/orm.ts`** — Call `setOrmConfig` with your database config (same as in [Database config](./database-config.md)).
2. **`scripts/migrate.ts`** — Created by `bunary migrate` on first use; it imports your config and runs the migrator. You can customize it to change the migrations path or use `enableCoreConfig()`.

Without `src/config/orm.ts` (and the config being loaded before the migrator runs), `bunary migrate` will fail with a configuration error.

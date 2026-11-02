---
title: Working with Models
description: Create and configure model classes for your database tables.
order: 2
---

# Working with Models

Create and configure models for your database tables.

## Creating Models

A model is a Drizzle table wrapped with `defineModel(db, table, options?)`. There are no model classes: the row types are inferred from the table, so instances have the table's select type and `create()` takes its insert type.

```typescript
// src/db/schema.ts
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const posts = sqliteTable("posts", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer().primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  body: text().notNull(),
  internalNotes: text("internal_notes"),
});
```

```typescript
// src/db/models.ts
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { defineModel } from "@bunary/orm";
import { comments, posts } from "./schema";

const db = drizzle({ client: new Database("app.sqlite") });

export const Post = defineModel(db, posts);
export const Comment = defineModel(db, comments, { hidden: ["internalNotes"] });
```

Instances expose the columns as properties and track changes:

```typescript
const post = await Post.findOrFail(1);
post.title = "Hello, Bunary";
post.isDirty("title"); // true
post.getDirty(); // { title: "Hello, Bunary" }
await post.save(); // UPDATE only the dirty columns
await post.delete();
```

A column's JS key may not be an instance method name (`save`, `delete`, `toJSON`, ...); rename the JS key and keep the SQL name, e.g. `saveFlag: integer("save")`.

## Hidden Fields

`hidden` lists column keys left out of `toJSON()`, and therefore out of `JSON.stringify()` and JSON responses:

```typescript
import { defineModel } from "@bunary/orm";
import { users } from "./schema";

export const User = defineModel(db, users, { hidden: ["password", "apiKey"] });

const user = await User.findOrFail(1);
user.password; // still loaded and usable in code
JSON.stringify(user); // {"id":1,"name":"Ada",...} without password / apiKey
```

Hidden columns are still selected, writable and saved; only `toJSON()` omits them. Spreading (`{ ...user }`) and the plain rows from `query()` still include them.

## Timestamps

Models do not manage `createdAt` / `updatedAt` for you: declare the defaults on the Drizzle columns. `create()` and `save()` return the row as persisted, so database defaults and `$onUpdate` values are on the instance:

```typescript
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const articles = sqliteTable("articles", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date()),
});
```

## Events

Listeners run before a write and can change or cancel it (`creating`, `updating`, `saving`, `deleting`). Returning `false` cancels the write:

```typescript
export const User = defineModel(db, users, {
  hidden: ["password"],
  events: {
    creating: async (values) => {
      values.password = await Bun.password.hash(values.password);
    },
    deleting: (user) => user.role !== "admin", // false cancels
  },
});
```

Only instance operations fire events; bulk `where(...).update()` / `.delete()` and `query()` do not.

## Soft Deletes

With `softDeletes: true` and a nullable `deletedAt` column, `delete()` sets `deletedAt` instead of removing the row, and the model's queries leave trashed rows out:

```typescript
const posts = sqliteTable("posts", {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
});

const Post = defineModel(db, posts, { softDeletes: true });

const post = await Post.findOrFail(1);
await post.delete(); // sets deletedAt
post.trashed(); // true
await Post.withTrashed().get(); // includes trashed rows
await post.restore();
await post.forceDelete(); // really deletes
```

See the [`@bunary/orm` package reference](/docs/packages/orm) for primary keys, transactions and every model option.

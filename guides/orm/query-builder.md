---
title: Query Builder
description: The ORM provides a fluent query builder interface for building database queries.
order: 3
---

# Query Builder

Models give you a small, chainable query API on top of Drizzle conditions. For ordering, limits, joins and aggregates you drop down to Drizzle itself with `query()` or `Model.db`.

The examples use the `users` table and `User` model from [Working with Models](./models.md).

## Basic Queries

```typescript
// Find by primary key (null when missing)
const user = await User.find(1);

// Throw ModelNotFoundError when missing
const sure = await User.findOrFail(1);

// Get all records: plain rows from Drizzle, wrapped as instances
const everyone = (await User.query()).map(User.hydrate);
```

## Filtering Records

`where()` takes any Drizzle condition (`eq`, `and`, `or`, `gt`, `like`, `inArray`, `isNull`, ...). `get()` returns every matching instance, `first()` the first one or `null`. Chained `where()` calls are combined with `AND`:

```typescript
import { eq, gt, like } from "drizzle-orm";
import { users } from "./schema";

const activeUsers = await User.where(eq(users.status, "active")).get();

const adultAdas = await User.where(gt(users.age, 17))
  .where(eq(users.name, "Ada"))
  .first();

const examples = await User.where(like(users.email, "%@example.com")).get();
```

Queries are immutable: every chained call returns a new query.

## Bulk Updates and Deletes

Update or delete every matching row in one statement; both resolve to the number of rows affected and fire no model events:

```typescript
import { eq, lt } from "drizzle-orm";

const archived = await User.where(lt(users.lastSeen, cutoff)).update({ archived: true });
const removed = await User.where(eq(users.archived, true)).delete();
```

## Scopes

Named scopes are reusable constraints that become methods of the model and of its queries:

```typescript
import { defineModel } from "@bunary/orm";
import { eq, gt } from "drizzle-orm";

export const User = defineModel(db, users, {
  scopes: {
    active: (q) => q.where(eq(users.status, "active")),
    olderThan: (q, age: number) => q.where(gt(users.age, age)),
  },
});

await User.active().get();
await User.active().olderThan(17).first();
```

## Eager Loading Relations

Declare Drizzle `relations()`, pass them to `drizzle()` in its `schema`, and load them with `with()`. Related rows are hydrated as model instances:

```typescript
const authors = await User.with({ posts: Post }).get();
authors[0]?.posts; // Post instances

const post = await Post.with({ author: User }).findOrFail(1);
post.author.name;
```

## Ordering and Limiting

`query()` is `db.select().from(table)`, fully typed. It returns plain rows; wrap them with `hydrate()` when you want instances:

```typescript
import { desc } from "drizzle-orm";

const rows = await User.query().orderBy(desc(users.createdAt)).limit(10);
const recentUsers = rows.map(User.hydrate);
```

## Common Patterns

### Pagination

```typescript
const page = 1;
const perPage = 10;

const rows = await User.query()
  .orderBy(users.id)
  .limit(perPage)
  .offset((page - 1) * perPage);
```

### Counting Records

Use Drizzle's `$count` on the model's database:

```typescript
import { eq } from "drizzle-orm";

const totalUsers = await User.db.$count(users);
const activeCount = await User.db.$count(users, eq(users.status, "active"));
```

### Getting First Record

```typescript
import { desc, eq } from "drizzle-orm";

const firstAda = await User.where(eq(users.name, "Ada")).first();

const [latest] = await User.query().orderBy(desc(users.createdAt)).limit(1);
const latestUser = latest ? User.hydrate(latest) : null;
```

`query()` includes soft-deleted rows; filter with `isNull(table.deletedAt)` yourself. See the [`@bunary/orm` package reference](/docs/packages/orm) for the full query API.

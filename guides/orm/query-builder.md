# Query Builder

The ORM provides a fluent query builder interface for building database queries.

## Basic Queries

```typescript
// Find by ID
const user = await Model.table("users").find(1);

// Get all records
const users = await Model.table("users").all();

// Select specific columns
const users = await Model.table("users")
  .select("id", "name", "email")
  .get();

// Exclude sensitive fields
const users = await Model.table("users")
  .exclude("password", "secret_key")
  .get();
```

## Filtering Records

Filter records using the `where` method:

```typescript
// Filter records
const activeUsers = await Model.table("users")
  .where("status", "=", "active")
  .get();
```

## Ordering and Limiting

Order and limit query results:

```typescript
// Order and limit
const recentUsers = await Model.table("users")
  .orderBy("createdAt", "desc")
  .limit(10)
  .get();
```

## Common Patterns

### Pagination

```typescript
const page = 1;
const perPage = 10;

const users = await User
  .offset((page - 1) * perPage)
  .limit(perPage)
  .get();
```

### Counting Records

```typescript
const totalUsers = await User.count();
const activeCount = await User.where("status", "=", "active").count();
```

### Getting First Record

```typescript
const firstUser = await User.first();
const latestUser = await User.orderBy("createdAt", "desc").first();
```

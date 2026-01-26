# Working with Models

Create and configure model classes for your database tables.

## Creating Models

Create model classes that extend `BaseModel`:

```typescript
import { BaseModel } from "@bunary/orm";

class Post extends BaseModel {
  static tableName = "posts";
  protected static timestamps = false; // Disable timestamps
}

class Comment extends BaseModel {
  static tableName = "comments";
  protected static protected = ["internal_notes"];
}
```

## Protected Fields

Automatically exclude sensitive fields from queries:

```typescript
class User extends BaseModel {
  static tableName = "users";
  protected static protected = ["password", "api_key"];
}

// Password is automatically excluded
const user = await User.find(1);
// user.password will be undefined
```

## Timestamps

Automatically handle `createdAt` and `updatedAt` fields:

```typescript
class Post extends BaseModel {
  static tableName = "posts";
  // timestamps defaults to ["createdAt", "updatedAt"]
  // Set to false to disable
  protected static timestamps = false;
}
```

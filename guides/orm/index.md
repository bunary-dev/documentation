# ORM

Working with databases using Bunary's ORM.

## Overview

Bunary's ORM provides an Eloquent-like interface for working with databases. It features a database abstraction layer that supports multiple database types through a unified API.

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
  static tableName = "users";
  protected static protected = ["password"];
  protected static timestamps = ["createdAt", "updatedAt"];
}

// Use the model
const user = await User.find(1);
const users = await User.all();
const activeUsers = await User.where("status", "=", "active").get();
```

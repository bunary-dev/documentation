# Database Configuration

Configure your database connection for the ORM.

## SQLite Configuration

Configure SQLite database connection:

```typescript
import { setOrmConfig } from "@bunary/orm";

// SQLite
setOrmConfig({
  database: {
    type: "sqlite",
    sqlite: {
      path: "./database.sqlite"
    }
  }
});
```

## MySQL Configuration

MySQL support is coming soon:

```typescript
// MySQL (coming soon)
// setOrmConfig({
//   database: {
//     type: "mysql",
//     mysql: {
//       host: "localhost",
//       port: 3306,
//       user: "root",
//       password: "password",
//       database: "myapp"
//     }
//   }
// });
```

## Best Practices

1. **Use BaseModel for type safety**: Extend `BaseModel` instead of using `Model.table()` directly
2. **Protect sensitive fields**: Always add sensitive fields to the `protected` array
3. **Use timestamps**: Enable timestamps for automatic `createdAt`/`updatedAt` tracking
4. **Chain queries**: Use the fluent query builder for readable, maintainable code

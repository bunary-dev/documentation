# Examples

Explore complete working examples to see Bunary in action. All examples are available in the [bunary-dev/examples](https://github.com/bunary-dev/examples) repository.

## Running Examples Locally

Clone the examples repository and run any example:

```bash
git clone https://github.com/bunary-dev/examples.git
cd examples
```

Each example includes tests you can run with `bun test`.

## Available Examples

### Basic API

A complete REST API demonstrating core `@bunary/http` features.

**Features covered:**

- Route definition with `createApp()` from `@bunary/http`
- Path parameters (`:id` syntax for dynamic segments)
- Multiple path parameters (`:userId/posts/:postId`)
- Query parameters with defaults
- Automatic JSON response serialization
- Request logging middleware
- Environment helpers (`env()`, `isDev()` from `@bunary/core`)
- CRUD endpoints (GET, POST, PUT, DELETE)

```bash
cd basic-api
bun install
bun run dev
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Welcome message with environment info |
| GET | `/health` | Health check endpoint |
| GET | `/users/:id` | Get user by ID |
| GET | `/items?page=1&limit=10` | List items with pagination |
| POST | `/resources` | Create a resource |
| PUT | `/resources/:id` | Update a resource |
| DELETE | `/resources/:id` | Delete a resource |

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/basic-api)

---

### Nested Routes

Organize routes across multiple files using a prefix-based modular pattern.

**Features covered:**

- Splitting routes into separate modules (`users.ts`, `posts.ts`)
- Central route registration with prefixes (`/api/users`, `/api/posts`)
- Clean project structure for larger applications
- Query parameter filtering (`?authorId=1`)
- Resource-based route organization

```bash
cd nested-routes
bun install
bun run dev
```

**Project structure:**

```
src/
├── index.ts              # Entry point
└── routes/
    ├── index.ts          # Central route registration
    ├── users.ts          # User resource routes
    └── posts.ts          # Post resource routes
```

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| POST | `/api/users` | Create user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/posts` | List all posts |
| GET | `/api/posts?authorId=1` | Filter posts by author |
| POST | `/api/posts` | Create post |

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/nested-routes)

---

### Basic ORM

Database integration using `@bunary/orm` with SQLite and the Eloquent-like model pattern.

**Features covered:**

- ORM configuration with `setOrmConfig()` or `defineConfig()` from `@bunary/core`
- Model classes extending `BaseModel` (Users, Posts)
- Protected fields (auto-exclude `password`, `secret_key` from results)
- Timestamps handling (auto-exclude `createdAt`, `updatedAt`)
- Basic queries: `find()`, `all()`, `select()`, `exclude()`
- Advanced queries: `where()`, `limit()`, `offset()`, `orderBy()`, `first()`, `count()`
- Method chaining for complex queries
- Database table setup with sample data

```bash
cd basic-orm
bun install
bun run dev
```

**Example queries:**

```typescript
// Find by ID
const user = await Users.find(1);

// Get all with specific columns
const users = await Users.select("id", "name", "email").all();

// Complex chained query
const results = await Users
  .where("active", 1)
  .where("age", ">", 25)
  .orderBy("age", "desc")
  .limit(3)
  .all();
```

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/basic-orm)

---

## Contributing Examples

Have an example you'd like to share? We welcome contributions! Open a pull request on the [examples repository](https://github.com/bunary-dev/examples).

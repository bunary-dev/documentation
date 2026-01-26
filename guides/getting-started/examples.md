# Examples

Explore complete working examples to see Bunary in action. All examples are available in the [bunary-dev/examples](https://github.com/bunary-dev/examples) repository.

## Running Examples Locally

Clone the examples repository and run any example:

```bash
git clone https://github.com/bunary-dev/examples.git
cd examples
```

## Available Examples

### Basic API

A simple REST API demonstrating core Bunary features.

**Features covered:**
- Route definition with `createApp()`
- Path parameters (`:id` syntax)
- Query parameters
- JSON serialization
- Middleware pipeline
- Environment helpers

```bash
cd basic-api
bun install
bun run dev
```

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/basic-api)

---

### Nested Routes

Organized routes across multiple files using route groups and modular structure.

**Features covered:**
- Route groups with prefixes
- Splitting routes into separate files
- Shared middleware per group
- Clean project organization

```bash
cd nested-routes
bun install
bun run dev
```

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/nested-routes)

---

### Basic ORM

Database integration example using Bunary ORM with SQLite.

**Features covered:**
- Database configuration
- Model definitions
- Query builder usage
- CRUD operations
- Relationships

```bash
cd basic-orm
bun install
bun run dev
```

[View source on GitHub →](https://github.com/bunary-dev/examples/tree/main/basic-orm)

---

## Contributing Examples

Have an example you'd like to share? We welcome contributions! Open a pull request on the [examples repository](https://github.com/bunary-dev/examples).

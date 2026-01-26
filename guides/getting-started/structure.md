
# Directory Structure

Understanding the default Bunary project layout.

## Default Structure

When you create a new Bunary project using `bunary init`, you'll get the following directory structure:

```
my-api/
├── src/
│   ├── index.ts          # Application entry point
│   ├── routes/
│   │   └── api.ts        # API route definitions
│   └── middleware/
│       └── logger.ts     # Custom middleware
├── tests/
│   └── api.test.ts       # Test files
├── bunary.config.ts      # Bunary configuration
├── package.json
├── tsconfig.json
└── .env.example
```

## Directory Overview

### The src Directory

The `src` directory contains your application source code. This is where you'll spend most of your time:

| Directory | Purpose |
|-----------|---------|
| `src/index.ts` | Application entry point and server bootstrap |
| `src/routes/` | Route definitions and API endpoints |
| `src/middleware/` | Custom middleware functions |
| `src/handlers/` | Request handlers (optional) |
| `src/services/` | Business logic and services (optional) |

### The tests Directory

The `tests` directory contains your test files. Bunary uses Bun's built-in test runner, so you can run tests with `bun test`.

### Configuration Files

| File | Purpose |
|------|---------|
| `bunary.config.ts` | Bunary application configuration |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration |
| `.env` | Environment variables (git-ignored) |
| `.env.example` | Example environment variables template |

## Larger Projects

As your project grows, you might adopt a more structured layout:

```
my-api/
├── src/
│   ├── index.ts
│   ├── app.ts              # App instance creation
│   ├── routes/
│   │   ├── index.ts        # Route aggregation
│   │   ├── users.ts
│   │   └── posts.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   └── logger.ts
│   ├── handlers/
│   │   ├── users.ts
│   │   └── posts.ts
│   ├── services/
│   │   ├── user.service.ts
│   │   └── post.service.ts
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── tests/
│   ├── routes/
│   ├── services/
│   └── setup.ts
├── bunary.config.ts
├── package.json
└── tsconfig.json
```


# Directory Structure

Understanding the default Bunary project layout.

## Default Structure

When you create a new Bunary project using `bunary init`, you'll get the following directory structure:

```
my-api/
├── src/
│   ├── index.ts          # Application entry point (calls registerRoutes, app.listen)
│   └── routes/
│       ├── index.ts      # Defines and exports registerRoutes (called from src/index.ts)
│       ├── main.ts       # Registers / and /health
│       └── groupExample.ts  # Example route group (e.g. /api, /api/health)
├── bunary.config.ts      # Bunary configuration (defineConfig from @bunary/core)
└── package.json
```

Optional (add as needed): `tests/`, `tsconfig.json`, `.env`, `.env.example` — not created by `bunary init`; see Directory Overview below.

With `bunary init my-api --auth basic` or `--auth jwt`, you also get:

- `src/middleware/basic.ts` or `jwt.ts` (auth stub), wired in `src/index.ts`

Add more routes with `bunary route:make <name>`, middleware with `bunary middleware:make <name>`, and models with `bunary model:make <table-name>`.

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

The `tests` directory (optional; not created by `bunary init`) contains your test files. Bunary uses Bun's built-in test runner, so you can run tests with `bun test`.

### Configuration Files

| File | Purpose |
|------|---------|
| `bunary.config.ts` | Bunary application configuration |
| `package.json` | Dependencies and scripts |
| `tsconfig.json` | TypeScript configuration (optional; add if needed) |
| `.env` | Environment variables (optional; git-ignored) |
| `.env.example` | Example environment variables template (optional; add as needed) |

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

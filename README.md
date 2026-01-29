# Bunary Documentation

This directory contains the source of truth for all Bunary documentation.

## Structure

```
documentation/
├── guides/          # Getting started and core concepts
│   ├── introduction.md
│   ├── philosophy.md
│   ├── getting-started/
│   │   ├── index.md          # Installation
│   │   ├── configuration.md
│   │   └── structure.md
│   ├── basics/
│   │   ├── index.md          # Middleware
│   │   ├── requests.md
│   │   └── responses.md
│   ├── routing/
│   │   ├── index.md
│   │   ├── route-parameters.md
│   │   ├── route-groups.md
│   │   └── named-routes.md
│   ├── orm/
│   │   ├── index.md
│   │   ├── models.md
│   │   ├── query-builder.md
│   │   └── database-config.md
│   └── security/
│       ├── index.md          # Authentication
│       └── guards.md
└── packages/        # Package-specific documentation
    ├── core.md
    ├── http.md
    ├── auth.md
    ├── cli.md
    └── orm.md
```

## Building Documentation

The documentation is built from markdown files into React components for the site.

Run the build script:
```bash
bun run scripts/build-docs.ts
```

This will:
1. Read markdown files from `documentation/guides/` and `documentation/packages/`
2. Convert them to React components using the `marked` library
3. Output to `site/src/pages/docs/`

## Syncing package docs (pkg/docs → documentation/packages)

Package documentation is authored in each package repo under `docs/` and synced into this repo under `packages/`.

Run:

```bash
bun run sync:packages
```

This will update:
- `packages/core.md`
- `packages/http.md`
- `packages/auth.md`
- `packages/orm.md`
- `packages/cli.md`

### CI drift check

Pull requests are expected to keep `packages/*.md` in sync. CI will fail if `bun run sync:packages` produces changes that are not committed.

Review checklist (contract, per-package alignment, guides): [DOCS_REVIEW.md](./DOCS_REVIEW.md).

## Writing Documentation

### Guides

- Use standard Markdown syntax
- Code blocks should specify language: ` ```typescript `
- Use frontmatter for metadata (title, description, etc.)
- Keep documentation focused and example-driven

### Package Documentation

- Package documentation files live in `documentation/packages/`
- Use frontmatter with `title` and `description` fields
- Follow the same markdown conventions as guides

For the new package-owned docs workflow (`pkg/docs/*.md` synced into this repo), see `PACKAGE_DOCS_CONTRACT.md`.

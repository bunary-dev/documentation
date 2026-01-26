# Bunary Documentation

This directory contains the source of truth for all Bunary documentation.

## Structure

```
documentation/
├── guides/          # Getting started and core concepts
│   ├── introduction.md
│   ├── philosophy.md
│   ├── installation.md
│   ├── configuration.md
│   ├── structure.md
│   ├── routing.md
│   ├── middleware.md
│   ├── requests.md
│   ├── responses.md
│   ├── authentication.md
│   └── guards.md
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

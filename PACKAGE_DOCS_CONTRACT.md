# Package docs contract (Option 1)

This repo (`bunary-dev/documentation`) is the source used to build the docs website, but **package documentation should be authored in each package repo** under `docs/` and then **synced into this repo**.

The goal is to avoid duplicating (and manually keeping in sync) docs across multiple locations.

---

## Terms

- **Package repo**: one of `bunary-dev/{core,http,auth,orm,cli}`
- **Package docs source**: markdown files under `docs/` inside a package repo
- **Docs site source**: markdown files under `guides/` and `packages/` in this repo
- **Synced docs output**: the generated markdown files committed under `packages/` in this repo (consumed by the site build)

---

## Required structure in each package repo

Each package repo MUST contain:

- `docs/index.md`

Each package repo SHOULD contain (recommended, but optional until the sync supports multi-file composition):

- `docs/quickstart.md`
- `docs/api.md`

Each package repo MAY contain (optional):

- `docs/migration.md`
- `docs/recipes/*.md`

---

## Markdown conventions

- **Top heading**: `docs/index.md` should start with a `#` heading for the package (example: `# @bunary/http`).
- **Installation snippet**: quickstart must show installing **only the package**, e.g. `bun add @bunary/http` (it can mention that `@bunary/core` is a dependency, but users shouldn't have to install it manually).
- **Cross-package content**:
  - Package docs should not require other packages to understand or run the quickstart.
  - Cross-package tutorials belong in `guides/` in this repo.
- **Frontmatter**: optional for now. The current site build accepts markdown without frontmatter; we can standardize frontmatter later if desired.

---

## Mapping: package repo → documentation repo (site pages)

The docs sync (see documentation issue #7) will read package repo files and write outputs under `documentation/packages/` in this repo.

### MVP mapping (phase 1)

To start, we sync only `docs/index.md`:

| Package repo | Source | Output (this repo) |
|---|---|---|
| `core` | `docs/index.md` | `packages/core.md` |
| `http` | `docs/index.md` | `packages/http.md` |
| `auth` | `docs/index.md` | `packages/auth.md` |
| `orm` | `docs/index.md` | `packages/orm.md` |
| `cli` | `docs/index.md` | `packages/cli.md` |

### Follow-up mapping (phase 2, optional)

Once we support composing multiple source files into a single package page, the sync should concatenate in this order when files exist:

1. `docs/index.md`
2. `docs/quickstart.md`
3. `docs/api.md`
4. `docs/migration.md`

This preserves the site’s existing “one page per package” model while allowing authors to keep docs modular in package repos.

---

## Ownership

- `guides/**` is authored and maintained in this repo.
- `packages/*.md` is considered **synced output** once the sync is in place.
- Canonical package docs content should live in each package repo under `docs/`.


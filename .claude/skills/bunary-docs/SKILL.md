---
name: bunary-docs
description: Use when writing, editing, syncing, reviewing, or auditing Bunary documentation — package docs, guides, or the docs site build — or when a Bunary package API change needs a doc update.
---

# Bunary documentation workflow

Bunary docs flow through two hops:
package repo `docs/` → (sync:packages) → `documentation/packages/*.md` → (sync:site) → `site/src/pages/docs/*.tsx`.

## Where to edit — decision table

| You changed / need | Edit here | Never |
|---|---|---|
| Package API, feature, CLI command | `packages/{pkg}/docs/index.md` (+ optional `quickstart.md`, `api.md`, `migration.md`) in that package repo | `documentation/packages/*.md` (synced output) |
| Cross-package tutorial, concepts, getting started | `documentation/guides/**/*.md` | duplicating package API detail in guides |
| Site chrome, layout, docs shell | `site/` repo (`DocsLayout.tsx` survives rebuilds) | generated `site/src/pages/docs/**` pages |

## Pipeline commands (run from the documentation repo root)

- `bun run sync:packages` — fetch package docs from GitHub main, compose per contract order (`index.md` + `quickstart.md` + `api.md` + `migration.md`), write `packages/*.md`.
- `bun run scripts/sync-packages.ts --local [root]` — same, but read from local sibling checkouts (default root `../packages`); use to preview unpushed package-doc changes. Never commit locally-sourced `packages/*.md` — committed output must come from the remote sync.
- `bun run sync:site` — convert guides + packages markdown to React components in the site repo.
- CI drift check: a PR here must include the `packages/*.md` produced by `bun run sync:packages`, or CI fails.

## Authoring conventions

- Frontmatter on guides: `title`, `description`, `order` (sidebar position within its section). Package docs: optional.
- `docs/index.md` starts with `# @bunary/{pkg}`.
- Install snippets show only the one package (`bun add @bunary/http`); dependencies arrive transitively.
- Example-driven; code fences carry a language (```typescript).
- A feature PR in a package repo is not done until `docs/` reflects the change; the docs sync PR follows here.

## Drift audit (when asked to review docs)

1. Per package (core, http, auth, orm, cli): compare `docs/index.md` claims against the package's actual exports and JSDoc; fix gaps in the package repo, then sync.
2. Per guide section (`getting-started/`, `basics/`, `routing/`, `orm/`, `security/`): confirm examples and APIs still match the packages.
3. Run `bun run sync:packages` and commit any drift.
4. Details: `DOCS_REVIEW.md`, `PACKAGE_DOCS_CONTRACT.md`, `PUBLISH_WORKFLOW.md` in the documentation repo — those are the source of truth; this skill is the operational summary.

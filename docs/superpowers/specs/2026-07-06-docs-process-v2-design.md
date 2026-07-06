# Documentation process v2 — design

**Date:** 2026-07-06
**Issue:** bunary-dev/documentation#45
**Status:** Approved

## Context

The Bunary documentation pipeline is a two-hop flow: package repos
(`bunary-dev/{core,http,auth,orm,cli}`) author reference docs in `docs/index.md`;
`bun run sync:packages` fetches them from GitHub main into `packages/*.md` in this
repo; `bun run sync:site` converts `guides/` + `packages/` markdown into React
components in the site repo (`site/src/pages/docs/`). A CI drift check fails PRs
when `packages/*.md` is stale.

Pain points this design addresses:

- **Docs drift from code** — nothing prompts a doc update when a package API changes.
- **Sync/build friction** — sync only reads from GitHub main, so local doc edits
  cannot be previewed before pushing; and there are two divergent md→React
  converters (workspace-root `scripts/build-docs.ts` vs this repo's
  `scripts/sync-site.ts`).
- **Authoring inconsistency** — conventions live across four markdown files
  (`README.md`, `PACKAGE_DOCS_CONTRACT.md`, `PUBLISH_WORKFLOW.md`,
  `DOCS_REVIEW.md`) with nothing enforcing them during a coding session.

## 1. `bunary-docs` skill

One Claude Code skill covering the whole documentation loop. Versioned in this
repo at `.claude/skills/bunary-docs/SKILL.md` and mirrored (copy) to the
BunaryDev workspace root `.claude/skills/` so it loads for sessions started at
the workspace root (the root is not a git repo, hence the mirror).

Contents:

- **Where-to-edit decision table** — package API/feature change → edit
  `docs/` in that package repo, never `packages/*.md` here; cross-package
  tutorial → `guides/` here; site chrome → site repo.
- **Pipeline commands** — `sync:packages` (remote default, `--local` for
  preview), `sync:site`, and the CI expectation that synced `packages/*.md`
  land in the same PR as the doc source change.
- **Authoring conventions** — frontmatter schema, top-heading rule,
  single-package install snippet rule, example-driven style, docs PR
  accompanies feature PR.
- **Drift-audit procedure** — distilled from `DOCS_REVIEW.md`: per package,
  compare `docs/index.md` claims against actual exports/JSDoc; audit each
  guide section (`getting-started/`, `basics/`, `routing/`, `orm/`,
  `security/`) against current APIs.

The four markdown process docs remain the human-facing source of truth; the
skill links to them instead of duplicating their content.

## 2. Converter consolidation

`scripts/sync-site.ts` (this repo) becomes the only markdown→React converter.
The legacy workspace-root `scripts/build-docs.ts` is deleted and the workspace
root `CLAUDE.md` documentation-build section is updated to
`cd documentation && bun run sync:site`. (Workspace-root files are not under
version control; that part is a plain local edit outside this repo.)

## 3. Local sync mode

`scripts/sync-packages.ts` gains `--local [root]`:

- `--local` reads `packages/{pkg}/docs/*.md` from the local sibling checkouts;
  root defaults to `../packages` relative to this repo.
- Remote GitHub-main fetch remains the default; CI drift-check semantics are
  unchanged.
- Missing local `docs/index.md` → hard fail naming the package (parity with a
  remote 404 today).

## 4. Multi-file composition (contract phase 2)

Both modes compose per-package pages in the contract's order:
`index.md` + `quickstart.md` + `api.md` + `migration.md` → one
`packages/{pkg}.md`. Only `index.md` is mandatory; a 404/ENOENT on the others
skips that file. Single-file packages keep working unchanged; packages adopt
the split gradually. `PACKAGE_DOCS_CONTRACT.md` is updated to mark phase 2 as
implemented.

## 5. Frontmatter standard

Schema: `title`, `description`, `order` (sidebar position). `sync-site.ts`
uses frontmatter for page metadata and sidebar ordering. Files without
frontmatter keep the current derived-from-heading behaviour, so adoption is
opt-in and non-breaking. Existing guides get frontmatter added as a mechanical
pass in this repo.

## Testing

TDD throughout:

- Extend `scripts/sync-packages.test.ts`: local mode resolution, composition
  order, skip-missing-optional-files, hard-fail on missing `index.md`.
- Add `scripts/sync-site.test.ts`: frontmatter parsing, sidebar ordering,
  heading-derived fallback, output cleaning.

Full suite green before the PR.

## Delivery

- One PR in this repo (branch `docs/45-docs-process-v2`, closes #45):
  sections 1 (skill), 3, 4, 5, plus contract/README updates.
- Local-only edits at the workspace root: section 2 cleanup and the skill
  mirror.

## Out of scope

- Repositioning the framework's "inspired by Laravel" messaging (discussed and
  deferred; recommendation was "Laravel-inspired DX, Symfony-style standalone
  packages" if ever revisited).
- Automating sync via CI beyond the existing drift check.

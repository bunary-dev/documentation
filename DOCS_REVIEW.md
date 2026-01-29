# Documentation review (packages → Documentation)

Use this when you’re checking whether Documentation is complete and consistent. Scope: this repo and package `docs/` only. Site build and site-specific updates are out of scope for this checklist; track them in the docs site repo or via an issue in this repo (e.g. [bunary-dev/documentation#2](https://github.com/bunary-dev/documentation/issues/2) for umbrella/site scope).

**To change package docs content:** edit in the package repo (`docs/index.md`), then run `bun run sync:packages` and commit updated `packages/*.md`. Do not edit `packages/*.md` directly.

Contract: Is PACKAGE_DOCS_CONTRACT still accurate? If we changed how README and docs/index.md split (see #14) or how sync works, update the contract. Same for the docs sync workflow (`.github/workflows/docs-sync-drift.yml`) if the “when/who runs sync” process changes.

Per-package docs: For each of core, http, auth, orm, cli, does that package’s `docs/index.md` exist and match what we ship? Run `bun run sync:packages` and commit any changes so `packages/*.md` here reflect the package repos. If a package added a feature and didn’t update `docs/index.md`, that’s a gap: fix it in the package repo, then sync.

Guides: Files under `guides/` sometimes reference packages (APIs, install commands, examples). When a package’s API or behavior changes, check whether any guide is now wrong. Update the guide here; don’t duplicate package API detail, but fix broken examples or outdated steps.

Gaps: Anything else that would leave readers with wrong or missing info counts as a gap. Prefer fixing the source (package `docs/` or a guide) and syncing or committing here, rather than one-off edits to `packages/*.md` that the next sync would overwrite.

# Publishing package docs to Documentation

Package docs live in each package repo under `docs/`. This repo consumes them. When you change a package (new feature, API change, new command), the docs need to get here so the site and readers see the update.

When to sync: after you merge or release a package change that touched `docs/` or that users need documented. If you added a CLI command, you update `packages/cli/docs/index.md` in the cli repo; then someone runs the sync so `documentation/packages/cli.md` here is updated.

How to sync: from this repo root run `bun run sync:packages`. The script fetches each package’s `docs/index.md` from GitHub (main) and writes `packages/*.md` here. No local package clones needed. Commit the changed `packages/*.md` and push.

Who runs it: whoever is doing the release or the follow-up doc pass. There is no automated trigger yet. A practical rule: when you cut a package release or merge a feature that changed docs, run sync and open a PR in this repo with the updated `packages/*.md`, or add “run sync and commit” to the release checklist for that package.

CI: PRs in this repo run a drift check. If `bun run sync:packages` would produce changes but the PR didn’t include them, CI fails. So if a package’s `docs/index.md` changed and you didn’t sync, the next person to touch this repo may hit that failure; then they run sync and commit the result.

Summary: change package docs in the package repo; run `bun run sync:packages` here and commit updated `packages/*.md` so Documentation stays in sync. No version bump in this repo for doc-only syncs.

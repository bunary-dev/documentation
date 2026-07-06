# Documentation Process v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved docs-process-v2 spec (issue bunary-dev/documentation#45): multi-file package-doc composition, a `--local` sync mode, frontmatter-driven site build ordering, a `bunary-docs` Claude skill, and consolidation onto one md→React converter.

**Architecture:** `scripts/sync-packages.ts` gets a `DocFileLoader` abstraction with two implementations (remote GitHub-raw, local sibling checkouts) and composes up to four doc files per package into one `packages/*.md`. `scripts/sync-site.ts` is refactored into exported, testable functions and learns an `order` frontmatter key used to sort the generated `index.ts` exports. Process knowledge is captured in `.claude/skills/bunary-docs/SKILL.md` (versioned here, copied to the workspace root).

**Tech Stack:** Bun ≥1.0.0, TypeScript, `bun:test`, marked (existing). No new dependencies.

## Global Constraints

- Work happens in the worktree `documentation/.worktrees/45-docs-process-v2` on branch `docs/45-docs-process-v2`. Never commit on main.
- All commands run from the worktree root unless stated otherwise. Prefix Bash with `cd /home/paul/Projects/OpenSource/BunaryDev/documentation/.worktrees/45-docs-process-v2 &&`.
- Conventional Commits for every commit message.
- TDD: failing test first, then implementation. Full suite (`bun test`) green before the PR; report the passing count.
- Remote fetch stays the **default** sync mode — CI drift-check semantics must not change.
- Only `docs/index.md` is mandatory per package; `quickstart.md`, `api.md`, `migration.md` are optional and composed in exactly that order (PACKAGE_DOCS_CONTRACT phase 2).
- Files without frontmatter must keep today's derived-from-heading behaviour (non-breaking).
- Biome for lint (`bunx biome check ./scripts`); tabs for indentation (match existing files).

---

### Task 1: Loader abstraction + multi-file composition in sync-packages

**Files:**
- Modify: `scripts/sync-packages.ts`
- Test: `scripts/sync-packages.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 2 and the CLI):
  - `DOC_FILE_ORDER: readonly string[]` — `["index.md", "quickstart.md", "api.md", "migration.md"]`
  - `type DocFileLoader = { describeSource(repo: string, file: string): string; loadFile(repo: string, file: string): Promise<string | null> }` (null = file does not exist)
  - `createRemoteLoader(fetchImpl?: typeof fetch): DocFileLoader`
  - `composePackageDocs(repo: string, loader: DocFileLoader): Promise<{ sources: string[]; markdown: string } | null>` (null = mandatory `index.md` missing)
  - `renderSyncedPackageMarkdown(args: { generatorCommand: string; sources: string[]; sourceMarkdown: string }): string` (**breaking change**: `sources: string[]` replaces `sourceUrl: string`)
  - `syncPackages(options)` where `SyncPackagesOptions` gains `loader?: DocFileLoader` and **drops** `fetchText`; `SyncTarget` drops `sourceUrl` (now `{ repo, outputFileName }`)

- [ ] **Step 1: Rewrite the test file with failing tests for composition**

Replace the entire contents of `scripts/sync-packages.test.ts` with:

```typescript
import { describe, expect, test } from "bun:test";
import {
	composePackageDocs,
	createRemoteLoader,
	DOC_FILE_ORDER,
	renderSyncedPackageMarkdown,
	SYNC_TARGETS,
	syncPackages,
	type DocFileLoader,
} from "./sync-packages";

/** In-memory loader: files maps "repo/file" → content. */
function memoryLoader(files: Record<string, string>): DocFileLoader {
	return {
		describeSource: (repo, file) => `mem://${repo}/docs/${file}`,
		loadFile: async (repo, file) => files[`${repo}/${file}`] ?? null,
	};
}

describe("documentation sync: composition", () => {
	test("DOC_FILE_ORDER is the contract phase-2 order", () => {
		expect(DOC_FILE_ORDER).toEqual(["index.md", "quickstart.md", "api.md", "migration.md"]);
	});

	test("composePackageDocs() concatenates existing files in contract order", async () => {
		const loader = memoryLoader({
			"http/index.md": "# @bunary/http\n",
			"http/api.md": "## API\n",
			"http/quickstart.md": "## Quickstart\n",
		});
		const result = await composePackageDocs("http", loader);
		expect(result).not.toBeNull();
		const markdown = result!.markdown;
		expect(markdown.indexOf("# @bunary/http")).toBeLessThan(markdown.indexOf("## Quickstart"));
		expect(markdown.indexOf("## Quickstart")).toBeLessThan(markdown.indexOf("## API"));
		expect(result!.sources).toEqual([
			"mem://http/docs/index.md",
			"mem://http/docs/quickstart.md",
			"mem://http/docs/api.md",
		]);
	});

	test("composePackageDocs() returns null when index.md is missing", async () => {
		const loader = memoryLoader({ "http/api.md": "## API\n" });
		expect(await composePackageDocs("http", loader)).toBeNull();
	});

	test("renderSyncedPackageMarkdown() lists every source in the header", () => {
		const out = renderSyncedPackageMarkdown({
			generatorCommand: "bun run sync:packages",
			sources: ["mem://core/docs/index.md", "mem://core/docs/api.md"],
			sourceMarkdown: "# @bunary/core\n\nHello\n",
		});
		expect(out).toContain("AUTO-GENERATED");
		expect(out).toContain("mem://core/docs/index.md");
		expect(out).toContain("mem://core/docs/api.md");
		expect(out).toContain("# @bunary/core");
		expect(out.endsWith("\n")).toBe(true);
	});

	test("syncPackages() writes packages/*.md for all targets", async () => {
		const writes = new Map<string, string>();
		const files: Record<string, string> = {};
		for (const t of SYNC_TARGETS) files[`${t.repo}/index.md`] = `# @bunary/${t.repo}\n`;

		await syncPackages({
			repoRootDir: "/repo",
			loader: memoryLoader(files),
			writeFile: async (absolutePath, content) => {
				writes.set(absolutePath, content);
			},
		});

		for (const target of SYNC_TARGETS) {
			const outPath = `/repo/packages/${target.outputFileName}`;
			expect(writes.has(outPath)).toBe(true);
			expect(writes.get(outPath)).toContain(`# @bunary/${target.repo}`);
		}
	});

	test("syncPackages() skips packages missing index.md when strict=false", async () => {
		const writes = new Map<string, string>();
		await syncPackages({
			repoRootDir: "/repo",
			strict: false,
			targets: [{ repo: "cli", outputFileName: "cli.md" }],
			loader: memoryLoader({}),
			writeFile: async (absolutePath, content) => {
				writes.set(absolutePath, content);
			},
		});
		expect(writes.size).toBe(0);
	});

	test("syncPackages() throws on missing index.md when strict=true", async () => {
		expect(
			syncPackages({
				repoRootDir: "/repo",
				strict: true,
				targets: [{ repo: "cli", outputFileName: "cli.md" }],
				loader: memoryLoader({}),
				writeFile: async () => {},
			}),
		).rejects.toThrow(/cli/);
	});

	test("createRemoteLoader() returns null on 404 and content on 200", async () => {
		const fakeFetch = (async (url: string | URL | Request) => {
			const u = String(url);
			if (u.endsWith("quickstart.md")) return new Response("nope", { status: 404 });
			return new Response(`# from ${u}`, { status: 200 });
		}) as typeof fetch;
		const loader = createRemoteLoader(fakeFetch);
		expect(await loader.loadFile("core", "quickstart.md")).toBeNull();
		expect(await loader.loadFile("core", "index.md")).toContain("# from ");
		expect(loader.describeSource("core", "index.md")).toBe(
			"https://raw.githubusercontent.com/bunary-dev/core/main/docs/index.md",
		);
	});

	test("createRemoteLoader() throws on non-404 errors", async () => {
		const fakeFetch = (async () => new Response("boom", { status: 500 })) as typeof fetch;
		const loader = createRemoteLoader(fakeFetch);
		expect(loader.loadFile("core", "index.md")).rejects.toThrow(/500/);
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test scripts/sync-packages.test.ts`
Expected: FAIL — `composePackageDocs`, `createRemoteLoader`, `DOC_FILE_ORDER` are not exported; `SyncTarget` still requires `sourceUrl`.

- [ ] **Step 3: Rewrite sync-packages.ts with the loader abstraction**

Replace the entire contents of `scripts/sync-packages.ts` with:

```typescript
#!/usr/bin/env bun
/**
 * Sync package docs from package repos into this repo's `packages/*.md`.
 *
 * Source-of-truth: each package repo's `docs/` directory. Per package we compose
 * (in order): index.md (mandatory), quickstart.md, api.md, migration.md (optional).
 *
 * Default mode fetches from GitHub main. `--local [root]` reads from local
 * sibling checkouts instead (root defaults to ../packages) so doc changes can
 * be previewed before pushing.
 *
 * @example
 * ```bash
 * bun run sync:packages
 * bun run sync:packages --local
 * bun run sync:packages --local /path/to/packages
 * ```
 */

import { mkdir, readFile, writeFile } from "fs/promises";
import { dirname, join, resolve } from "path";

/** Contract phase-2 composition order. Only index.md is mandatory. */
export const DOC_FILE_ORDER: ReadonlyArray<string> = Object.freeze([
	"index.md",
	"quickstart.md",
	"api.md",
	"migration.md",
]);

export type SyncTarget = Readonly<{
	/** GitHub repository name under `bunary-dev/` (e.g. `core`, `http`). */
	repo: string;
	/** Output filename under `packages/` (e.g. `core.md`). */
	outputFileName: string;
}>;

/**
 * Deterministic list of package docs we sync.
 * Extending this list is the only change needed to sync another package.
 */
export const SYNC_TARGETS: ReadonlyArray<SyncTarget> = Object.freeze([
	{ repo: "core", outputFileName: "core.md" },
	{ repo: "http", outputFileName: "http.md" },
	{ repo: "auth", outputFileName: "auth.md" },
	{ repo: "orm", outputFileName: "orm.md" },
	{ repo: "cli", outputFileName: "cli.md" },
]);

/**
 * Loads package doc files from some source (GitHub raw, local checkout, memory).
 * `loadFile` resolves `null` when the file does not exist at the source.
 */
export type DocFileLoader = Readonly<{
	describeSource: (repo: string, file: string) => string;
	loadFile: (repo: string, file: string) => Promise<string | null>;
}>;

/**
 * Loader that fetches from GitHub raw (main branch). 404 → null; other
 * non-OK responses throw.
 */
export function createRemoteLoader(fetchImpl: typeof fetch = fetch): DocFileLoader {
	const urlFor = (repo: string, file: string) =>
		`https://raw.githubusercontent.com/bunary-dev/${repo}/main/docs/${file}`;
	return {
		describeSource: urlFor,
		loadFile: async (repo, file) => {
			const url = urlFor(repo, file);
			const res = await fetchImpl(url);
			if (res.status === 404) return null;
			if (!res.ok) {
				throw new Error(`Failed to fetch "${url}" (${res.status} ${res.statusText})`);
			}
			return await res.text();
		},
	};
}

/**
 * Loader that reads from local package checkouts: `<root>/<repo>/docs/<file>`.
 * Missing file (ENOENT) → null; other filesystem errors throw.
 */
export function createLocalLoader(
	packagesRootDir: string,
	readFileImpl: (path: string) => Promise<string> = (path) => readFile(path, "utf-8"),
): DocFileLoader {
	const pathFor = (repo: string, file: string) => join(packagesRootDir, repo, "docs", file);
	return {
		describeSource: pathFor,
		loadFile: async (repo, file) => {
			try {
				return await readFileImpl(pathFor(repo, file));
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
				throw error;
			}
		},
	};
}

/**
 * Compose one package page from its doc files in DOC_FILE_ORDER.
 * Returns null when the mandatory index.md is missing.
 */
export async function composePackageDocs(
	repo: string,
	loader: DocFileLoader,
): Promise<{ sources: string[]; markdown: string } | null> {
	const parts: string[] = [];
	const sources: string[] = [];
	for (const file of DOC_FILE_ORDER) {
		const content = await loader.loadFile(repo, file);
		if (content === null) {
			if (file === "index.md") return null;
			continue;
		}
		parts.push(normalizeNewlines(content).trim());
		sources.push(loader.describeSource(repo, file));
	}
	return { sources, markdown: `${parts.join("\n\n")}\n` };
}

export type RenderSyncedPackageMarkdownArgs = Readonly<{
	generatorCommand: string;
	sources: ReadonlyArray<string>;
	sourceMarkdown: string;
}>;

/**
 * Render the markdown we commit into `packages/*.md`.
 * Output is deterministic (LF newlines, trailing newline).
 */
export function renderSyncedPackageMarkdown(args: RenderSyncedPackageMarkdownArgs): string {
	const normalizedSource = normalizeNewlines(args.sourceMarkdown).trimEnd();
	const header = [
		"<!--",
		"  AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY.",
		`  Generated by: ${args.generatorCommand}`,
		...args.sources.map((source) => `  Source: ${source}`),
		"-->",
		"",
	].join("\n");

	return `${header}${normalizedSource}\n`;
}

function normalizeNewlines(input: string): string {
	return input.replace(/\r\n/g, "\n");
}

export type SyncPackagesOptions = Readonly<{
	/** Absolute repo root directory. Defaults to `process.cwd()`. */
	repoRootDir?: string;
	/** Doc file loader. Defaults to the remote (GitHub raw) loader. */
	loader?: DocFileLoader;
	/** Write a file (absolute path). Defaults to `fs/promises.writeFile`. */
	writeFile?: (absolutePath: string, content: string) => Promise<void>;
	/** Ensure a directory exists (absolute path). */
	mkdirp?: (absoluteDir: string) => Promise<void>;
	/** Which targets to sync. Defaults to `SYNC_TARGETS`. */
	targets?: ReadonlyArray<SyncTarget>;
	/**
	 * If true, throw when a package's mandatory index.md is missing or a
	 * source errors. If false, log and continue. Defaults to false.
	 */
	strict?: boolean;
}>;

/** Sync all package docs into `packages/`. */
export async function syncPackages(options: SyncPackagesOptions = {}): Promise<void> {
	const repoRootDir = options.repoRootDir ?? process.cwd();
	const targets = options.targets ?? SYNC_TARGETS;
	const strict = options.strict ?? false;
	const loader = options.loader ?? createRemoteLoader();

	const defaultMkdirp = async (absoluteDir: string) => {
		await mkdir(absoluteDir, { recursive: true });
	};
	const mkdirp = options.mkdirp ?? (options.writeFile ? undefined : defaultMkdirp);
	const writer =
		options.writeFile ??
		(async (absolutePath: string, content: string) => {
			await writeFile(absolutePath, content, "utf-8");
		});

	for (const target of targets) {
		let composed: { sources: string[]; markdown: string } | null;
		try {
			composed = await composePackageDocs(target.repo, loader);
		} catch (error) {
			if (strict) throw error;
			console.warn(
				`⚠️  Skipping "${target.repo}" (source error): ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
			continue;
		}

		if (composed === null) {
			const message = `Package "${target.repo}" is missing mandatory docs/index.md (${loader.describeSource(target.repo, "index.md")})`;
			if (strict) throw new Error(message);
			console.warn(`⚠️  Skipping "${target.repo}": ${message}`);
			continue;
		}

		const outputMarkdown = renderSyncedPackageMarkdown({
			generatorCommand: "bun run sync:packages",
			sources: composed.sources,
			sourceMarkdown: composed.markdown,
		});

		const outputPath = join(repoRootDir, "packages", target.outputFileName);
		if (mkdirp) {
			await mkdirp(dirname(outputPath));
		}
		await writer(outputPath, outputMarkdown);
	}
}

/** Parse CLI args: `--local [root]` selects the local loader. */
export function loaderFromArgv(argv: ReadonlyArray<string>, cwd: string): DocFileLoader {
	const localIndex = argv.indexOf("--local");
	if (localIndex === -1) return createRemoteLoader();
	const next = argv[localIndex + 1];
	const root = next && !next.startsWith("--") ? next : join(cwd, "..", "packages");
	return createLocalLoader(resolve(cwd, root));
}

if (import.meta.main) {
	await syncPackages({ loader: loaderFromArgv(process.argv.slice(2), process.cwd()) });
}
```

Note: `createLocalLoader` and `loaderFromArgv` are included now because they share the file; their tests land in Task 2. Task 1's tests must pass with this code.

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test scripts/sync-packages.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Lint and typecheck**

Run: `bunx biome check ./scripts && bunx tsc --noEmit`
Expected: no errors. (If `tsconfig.json` is absent in this repo, skip tsc and note it.)

- [ ] **Step 6: Commit**

```bash
git add scripts/sync-packages.ts scripts/sync-packages.test.ts
git commit -m "feat(sync): compose multi-file package docs via loader abstraction (#45)"
```

---

### Task 2: Local sync mode tests + CLI wiring

**Files:**
- Modify: `scripts/sync-packages.ts` (only if tests reveal fixes needed — implementation landed in Task 1)
- Test: `scripts/sync-packages.test.ts`

**Interfaces:**
- Consumes from Task 1: `createLocalLoader(packagesRootDir, readFileImpl?)`, `loaderFromArgv(argv, cwd)`.
- Produces: verified CLI behaviour `bun run sync:packages --local [root]`.

- [ ] **Step 1: Append failing/verifying tests for the local loader and argv parsing**

Append to `scripts/sync-packages.test.ts` (inside the file, after the existing describe block):

```typescript
import { createLocalLoader, loaderFromArgv } from "./sync-packages";

describe("documentation sync: local mode", () => {
	test("createLocalLoader() reads <root>/<repo>/docs/<file> and nulls ENOENT", async () => {
		const reads: string[] = [];
		const loader = createLocalLoader("/ws/packages", async (path) => {
			reads.push(path);
			if (path === "/ws/packages/core/docs/index.md") return "# @bunary/core\n";
			const err = new Error("not found") as NodeJS.ErrnoException;
			err.code = "ENOENT";
			throw err;
		});
		expect(await loader.loadFile("core", "index.md")).toBe("# @bunary/core\n");
		expect(await loader.loadFile("core", "quickstart.md")).toBeNull();
		expect(reads).toContain("/ws/packages/core/docs/quickstart.md");
		expect(loader.describeSource("core", "index.md")).toBe("/ws/packages/core/docs/index.md");
	});

	test("createLocalLoader() rethrows non-ENOENT errors", async () => {
		const loader = createLocalLoader("/ws/packages", async () => {
			const err = new Error("permission denied") as NodeJS.ErrnoException;
			err.code = "EACCES";
			throw err;
		});
		expect(loader.loadFile("core", "index.md")).rejects.toThrow(/permission denied/);
	});

	test("loaderFromArgv() defaults to remote", () => {
		const loader = loaderFromArgv([], "/docs-repo");
		expect(loader.describeSource("core", "index.md")).toStartWith("https://raw.githubusercontent.com/");
	});

	test("loaderFromArgv() with bare --local uses ../packages relative to cwd", () => {
		const loader = loaderFromArgv(["--local"], "/ws/documentation");
		expect(loader.describeSource("core", "index.md")).toBe("/ws/packages/core/docs/index.md");
	});

	test("loaderFromArgv() with --local <root> uses the given root", () => {
		const loader = loaderFromArgv(["--local", "/elsewhere/pkgs"], "/ws/documentation");
		expect(loader.describeSource("core", "index.md")).toBe("/elsewhere/pkgs/core/docs/index.md");
	});
});
```

Move the `import { createLocalLoader, loaderFromArgv } from "./sync-packages";` line up into the existing import statement at the top of the file (single combined import) — Biome will flag a mid-file import.

- [ ] **Step 2: Run tests**

Run: `bun test scripts/sync-packages.test.ts`
Expected: PASS (14 tests). If any fail, fix `scripts/sync-packages.ts` minimally until green.

- [ ] **Step 3: Smoke-test the real CLI in local mode**

Run: `bun run scripts/sync-packages.ts --local ../../../packages && git diff --stat packages/`
(Path note: from the worktree, the workspace packages dir is `../../../packages` — worktree → documentation → BunaryDev.)
Expected: script completes; `packages/*.md` headers now show local paths as sources. **Then restore:** `git checkout -- packages/` (committed output must stay remote-generated so the CI drift check passes).

- [ ] **Step 4: Lint**

Run: `bunx biome check ./scripts`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add scripts/sync-packages.test.ts scripts/sync-packages.ts
git commit -m "feat(sync): add --local mode reading sibling package checkouts (#45)"
```

---

### Task 3: sync-site — testable refactor + frontmatter `order`

**Files:**
- Modify: `scripts/sync-site.ts`
- Test: `scripts/sync-site.test.ts` (create)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  - `DocMetadata` gains `order?: number`
  - exported `parseFrontmatter(content: string, fallbackName?: string): { metadata: DocMetadata; body: string }`
  - exported `generateIndexContent(files: ProcessedFile[], outputDir: string): string` where `ProcessedFile` gains `order?: number`
  - `if (import.meta.main)` guard so importing the module in tests does not run the build

- [ ] **Step 1: Write failing tests**

Create `scripts/sync-site.test.ts`:

```typescript
import { describe, expect, test } from "bun:test";
import { generateIndexContent, parseFrontmatter, type ProcessedFile } from "./sync-site";

describe("sync-site: frontmatter", () => {
	test("parses title, description, and order", () => {
		const { metadata, body } = parseFrontmatter(
			"---\ntitle: Routing\ndescription: How routes work\norder: 3\n---\n# Routing\n\nBody\n",
		);
		expect(metadata.title).toBe("Routing");
		expect(metadata.description).toBe("How routes work");
		expect(metadata.order).toBe(3);
		expect(body).toContain("# Routing");
	});

	test("no frontmatter keeps heading-derived behaviour and undefined order", () => {
		const { metadata } = parseFrontmatter("# My Title\n\nFirst paragraph here.\n\n## More\n");
		expect(metadata.title).toBe("My Title");
		expect(metadata.description).toBe("First paragraph here.");
		expect(metadata.order).toBeUndefined();
	});

	test("non-numeric order is ignored", () => {
		const { metadata } = parseFrontmatter("---\ntitle: X\norder: soon\n---\nBody\n");
		expect(metadata.order).toBeUndefined();
	});
});

describe("sync-site: index generation", () => {
	const file = (over: Partial<ProcessedFile>): ProcessedFile => ({
		componentName: "X",
		exportName: "X",
		filePath: "/out/X.tsx",
		isPackage: false,
		...over,
	});

	test("guides sort by order first, then name; unordered files sink to the end", () => {
		const content = generateIndexContent(
			[
				file({ componentName: "Zebra", exportName: "Zebra", filePath: "/out/Zebra.tsx", order: 1 }),
				file({ componentName: "Alpha", exportName: "Alpha", filePath: "/out/Alpha.tsx" }),
				file({ componentName: "Mid", exportName: "Mid", filePath: "/out/Mid.tsx", order: 2 }),
			],
			"/out",
		);
		const zebra = content.indexOf("Zebra");
		const mid = content.indexOf("Mid");
		const alpha = content.indexOf("Alpha");
		expect(zebra).toBeLessThan(mid);
		expect(mid).toBeLessThan(alpha);
	});

	test("packages are exported after guides", () => {
		const content = generateIndexContent(
			[
				file({ componentName: "CorePackage", exportName: "CorePackage", filePath: "/out/packages/Core.tsx", isPackage: true }),
				file({ componentName: "Guide", exportName: "Guide", filePath: "/out/Guide.tsx" }),
			],
			"/out",
		);
		expect(content.indexOf("Guide")).toBeLessThan(content.indexOf("CorePackage"));
		expect(content).toContain('from "./packages/Core.js"');
		expect(content).toContain('export { default as DocsLayout } from "./DocsLayout.js";');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test scripts/sync-site.test.ts`
Expected: FAIL — but watch the failure mode: today `sync-site.ts` calls `build()` at module top level, so the *import itself* will try to run a site build. This confirms why the `import.meta.main` guard is required.

- [ ] **Step 3: Refactor sync-site.ts**

Apply these exact changes to `scripts/sync-site.ts`:

(a) Extend the interface and export it, plus export `ProcessedFile`:

```typescript
export interface DocMetadata {
	title: string;
	description: string;
	order?: number;
}

export interface ProcessedFile {
	componentName: string;
	exportName: string;
	filePath: string;
	isPackage: boolean;
	order?: number;
}
```

(b) Export `parseFrontmatter` and parse `order` (replace the existing function; note the added `order` handling — the no-frontmatter branch is unchanged apart from the signature):

```typescript
export function parseFrontmatter(content: string): { metadata: DocMetadata; body: string } {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
	const match = content.match(frontmatterRegex);

	if (!match) {
		const h1Match = content.match(/^#\s+(.+)$/m);
		const title = h1Match ? h1Match[1].trim() : basename(content, ".md");
		const afterH1 = content.replace(/^#\s+.*?\n+/, "").trim();
		const pMatch = afterH1.match(/^([^\n]+?)(?:\n\n|\n##|$)/);
		const description = pMatch ? pMatch[1].trim() : "";
		return { metadata: { title, description }, body: content };
	}

	const frontmatter = match[1];
	const body = match[2];
	const metadata: DocMetadata = { title: "", description: "" };
	for (const line of frontmatter.split("\n")) {
		const m = line.match(/^(\w+):\s*(.+)$/);
		if (m) {
			const [, key, value] = m;
			const clean = value.replace(/^["']|["']$/g, "");
			if (key === "title") metadata.title = clean;
			if (key === "description") metadata.description = clean;
			if (key === "order") {
				const parsed = Number(clean);
				if (Number.isFinite(parsed)) metadata.order = parsed;
			}
		}
	}
	return { metadata, body };
}
```

(c) In `processMarkdownFile`, thread order into the record — change the `processedFiles.push` line to:

```typescript
	processedFiles.push({ componentName, exportName, filePath: outputPath, isPackage, order: metadata.order });
```

(d) Extract index generation into a pure exported function and use it (replace `generateIndexFile` with these two):

```typescript
function byOrderThenName(a: ProcessedFile, b: ProcessedFile): number {
	const ao = a.order ?? Number.MAX_SAFE_INTEGER;
	const bo = b.order ?? Number.MAX_SAFE_INTEGER;
	if (ao !== bo) return ao - bo;
	return a.componentName.localeCompare(b.componentName);
}

export function generateIndexContent(files: ProcessedFile[], outputDir: string): string {
	const guides = files.filter((f) => !f.isPackage).sort(byOrderThenName);
	const packages = files.filter((f) => f.isPackage).sort(byOrderThenName);
	const exports: string[] = [];
	for (const file of guides) {
		const rel = relative(outputDir, file.filePath).replace(/\\/g, "/");
		const importPath = rel.replace(/\.tsx$/, ".js");
		exports.push(`export { default as ${file.exportName} } from "./${importPath}";`);
	}
	if (packages.length > 0) {
		exports.push("");
		for (const file of packages) {
			exports.push(`export { default as ${file.exportName} } from "./packages/${basename(file.filePath, ".tsx")}.js";`);
		}
	}
	return `/**
 * Documentation pages - auto-generated. Do not edit directly.
 */

export { default as DocsLayout } from "./DocsLayout.js";

${exports.join("\n")}
`;
}

async function generateIndexFile(): Promise<void> {
	await writeFile(join(OUTPUT_DIR, "index.ts"), generateIndexContent(processedFiles, OUTPUT_DIR), "utf-8");
	console.log("✓ Generated index.ts");
}
```

(e) Guard the entrypoint — replace the trailing `build().catch(...)` call with:

```typescript
if (import.meta.main) {
	build().catch((err) => {
		console.error("❌ Build failed:", err);
		process.exit(1);
	});
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test scripts/sync-site.test.ts`
Expected: PASS (5 tests), and importing the module must NOT trigger a build (no "📚 Building docs" output).

- [ ] **Step 5: Run the real site build to prove no regression**

Run: `DOCS_SITE_OUTPUT=/home/paul/Projects/OpenSource/BunaryDev/site/src/pages/docs bun run sync:site && git -C ../../../site status --short src/pages/docs | head -20`
(The env override is required: run from the worktree, the default `../site` would resolve to `.worktrees/site`.)
Expected: build completes; site repo diff limited to regenerated content (no structural surprises). Do not commit the site repo in this task.

- [ ] **Step 6: Lint and commit**

```bash
bunx biome check ./scripts
git add scripts/sync-site.ts scripts/sync-site.test.ts
git commit -m "feat(site-build): frontmatter order + testable refactor of sync-site (#45)"
```

---

### Task 4: Frontmatter pass on guides

**Files:**
- Modify: every `guides/**/*.md` (17 files: `introduction.md`, `philosophy.md`, `getting-started/{index,configuration,structure,examples}.md`, `basics/{index,requests,responses}.md`, `routing/{index,route-parameters,route-groups,named-routes}.md`, `orm/{index,models,query-builder,database-config}.md` — verify the exact list with `find guides -name '*.md'` — plus `security/{index,guards}.md`)

**Interfaces:**
- Consumes from Task 3: the `title` / `description` / `order` frontmatter schema.
- Produces: guides carrying explicit frontmatter; sidebar order becomes deliberate.

- [ ] **Step 1: Add frontmatter to each guide**

For each file, add a frontmatter block at the very top preserving the current H1 as `title` and the current first paragraph as `description` (or write a better one-sentence description if the first paragraph is unsuitable). Assign `order` per section to match the reading order the docs README implies:

- `introduction.md` → order 1; `philosophy.md` → order 2
- `getting-started/`: index 1, configuration 2, structure 3, examples 4
- `basics/`: index 1, requests 2, responses 3
- `routing/`: index 1, route-parameters 2, route-groups 3, named-routes 4
- `orm/`: index 1, models 2, query-builder 3, database-config 4
- `security/`: index 1, guards 2

Pattern (example for `guides/routing/route-parameters.md`, keeping the existing body untouched below the block):

```markdown
---
title: Route Parameters
description: Capture dynamic URL segments and pass them to handlers.
order: 2
---
# Route Parameters
...existing content...
```

- [ ] **Step 2: Rebuild the site and eyeball the export order**

Run: `DOCS_SITE_OUTPUT=/home/paul/Projects/OpenSource/BunaryDev/site/src/pages/docs bun run sync:site && head -40 ../../../site/src/pages/docs/index.ts`
Expected: exports within each section follow the assigned `order` values, not alphabetical order.

- [ ] **Step 3: Commit**

```bash
git add guides
git commit -m "docs(guides): add title/description/order frontmatter to all guides (#45)"
```

---

### Task 5: The bunary-docs skill

**Files:**
- Create: `.claude/skills/bunary-docs/SKILL.md`

**Interfaces:**
- Consumes: the commands and conventions delivered by Tasks 1–4.
- Produces: the skill file (mirrored to the workspace root in Task 7).

- [ ] **Step 1: Write the skill**

Create `.claude/skills/bunary-docs/SKILL.md`:

```markdown
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
```

- [ ] **Step 2: Sanity-check the skill against reality**

Run: `bun run scripts/sync-packages.ts --local ../../../packages` (should succeed) and confirm every command named in the skill exists in `package.json` scripts. Restore any modified `packages/*.md` with `git checkout -- packages/`.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/bunary-docs/SKILL.md
git commit -m "docs: add bunary-docs skill capturing the documentation workflow (#45)"
```

---

### Task 6: Update the process docs

**Files:**
- Modify: `README.md`, `PACKAGE_DOCS_CONTRACT.md`, `PUBLISH_WORKFLOW.md`

**Interfaces:**
- Consumes: behaviour shipped in Tasks 1–3.
- Produces: human-facing docs matching the new pipeline.

- [ ] **Step 1: README.md**

In the Commands table, update the `sync:packages` row description to: "Fetch package docs (index + quickstart + api + migration when present) from GitHub and write `packages/*.md`. Add `--local [root]` to read from local sibling checkouts for preview." Add a sentence under "sync:packages" documenting local mode with the example `bun run scripts/sync-packages.ts --local`. Mention the frontmatter schema (`title`, `description`, `order`) under "Writing Documentation → Guides".

- [ ] **Step 2: PACKAGE_DOCS_CONTRACT.md**

Change the phase-2 section heading from "Follow-up mapping (phase 2, optional)" to "Composition (phase 2 — implemented)" and state: the sync now concatenates `index.md` + `quickstart.md` + `api.md` + `migration.md` when present; only `index.md` is mandatory. Update the MVP mapping table note accordingly (source column becomes "docs/*.md composed").

- [ ] **Step 3: PUBLISH_WORKFLOW.md**

Add one paragraph after "How to sync": "To preview package-doc changes before pushing, run `bun run scripts/sync-packages.ts --local` — it reads the local sibling checkouts instead of GitHub main. Do not commit locally-sourced output; the committed `packages/*.md` must come from the default remote sync."

- [ ] **Step 4: Commit**

```bash
git add README.md PACKAGE_DOCS_CONTRACT.md PUBLISH_WORKFLOW.md
git commit -m "docs: document --local sync mode, phase-2 composition, frontmatter schema (#45)"
```

---

### Task 7: Workspace-root consolidation (outside the git repo)

**Files:**
- Delete: `/home/paul/Projects/OpenSource/BunaryDev/scripts/build-docs.ts`
- Modify: `/home/paul/Projects/OpenSource/BunaryDev/CLAUDE.md`
- Create: `/home/paul/Projects/OpenSource/BunaryDev/.claude/skills/bunary-docs/SKILL.md` (copy)
- Check: `/home/paul/Projects/OpenSource/BunaryDev/package.json` for a docs script referencing build-docs.ts

**Interfaces:**
- Consumes from Task 5: the skill file to mirror.
- Produces: one converter, workspace-level skill availability.

These files are NOT under version control (the workspace root is not a git repo) — plain local edits, no branch/commit for this task.

- [ ] **Step 1: Check for references to build-docs.ts**

Run: `grep -rn "build-docs" /home/paul/Projects/OpenSource/BunaryDev --include='*.json' --include='*.md' -l | grep -v node_modules | grep -v .worktrees`
Expected: `CLAUDE.md`, possibly root `package.json`. Update every hit in the next steps.

- [ ] **Step 2: Delete the legacy converter**

Run: `rm /home/paul/Projects/OpenSource/BunaryDev/scripts/build-docs.ts`

- [ ] **Step 3: Update root CLAUDE.md**

Replace the "Documentation build" block:

````markdown
Documentation build (source of truth: the `documentation/` repo; converts guides + package docs markdown → React components in `site/src/pages/docs/`):
```bash
cd documentation && bun run sync:site
# preview local package-doc edits first: bun run scripts/sync-packages.ts --local
```
````

If root `package.json` has a script invoking `scripts/build-docs.ts`, repoint it to `cd documentation && bun run sync:site` or delete the script entry.

- [ ] **Step 4: Mirror the skill to the workspace root**

Run: `mkdir -p /home/paul/Projects/OpenSource/BunaryDev/.claude/skills/bunary-docs && cp /home/paul/Projects/OpenSource/BunaryDev/documentation/.worktrees/45-docs-process-v2/.claude/skills/bunary-docs/SKILL.md /home/paul/Projects/OpenSource/BunaryDev/.claude/skills/bunary-docs/SKILL.md`

- [ ] **Step 5: Verify nothing still imports the deleted script**

Run: `grep -rn "build-docs" /home/paul/Projects/OpenSource/BunaryDev --include='*.ts' --include='*.json' --include='*.md' -l | grep -v node_modules | grep -v .worktrees`
Expected: no output.

---

### Task 8: Full verification + PR

**Files:**
- None new.

**Interfaces:**
- Consumes: everything above.
- Produces: green suite, open PR closing #45.

- [ ] **Step 1: Full test suite in the documentation repo**

Run: `bun test`
Expected: all tests pass — report the exact count (Tasks 1–3 target 19 tests in scripts/ plus any pre-existing ones).

- [ ] **Step 2: Full pipeline end-to-end**

Run: `DOCS_SITE_OUTPUT=/home/paul/Projects/OpenSource/BunaryDev/site/src/pages/docs bun run sync && git status --short`
(Env override needed for the sync:site half — from the worktree the default output path would resolve to `.worktrees/site`.)
Expected: pipeline completes (remote mode); any resulting `packages/*.md` drift is legitimate remote drift — commit it if present:

```bash
git add packages && git commit -m "chore(sync): refresh packages/*.md from package repos (#45)"
```

- [ ] **Step 3: Lint everything changed**

Run: `bunx biome check ./scripts`
Expected: clean.

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin docs/45-docs-process-v2
gh pr create --title "feat: documentation process v2 — composition, --local mode, frontmatter, bunary-docs skill" --body "Closes #45.

- Multi-file package-doc composition (contract phase 2): index + quickstart + api + migration
- --local sync mode reading sibling package checkouts for preview
- Frontmatter standard (title/description/order) driving site export order
- sync-site refactored into testable exported functions with import.meta.main guard
- bunary-docs Claude skill (.claude/skills/) capturing the workflow
- Process docs (README, CONTRACT, PUBLISH_WORKFLOW) updated

Spec: docs/superpowers/specs/2026-07-06-docs-process-v2-design.md
Tests: full suite green (report count from CI)."
```

Expected: PR URL printed. Do not merge — merging requires Paul's explicit approval.

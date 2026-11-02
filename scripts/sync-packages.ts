#!/usr/bin/env bun
/**
 * Sync package docs from package repos into this repo's `packages/*.md`.
 *
 * Source-of-truth: each package repo's `docs/` directory. Per package we compose
 * (in order): index.md (mandatory), quickstart.md, api.md, migration.md (optional).
 *
 * Default mode fetches from the published release: each package's version is
 * resolved from the npm registry and docs are read from the matching
 * `v<version>` git tag, so the site documents what `bun add` installs. A
 * registry failure or missing tag fails the sync; it never falls back to main.
 * `--ref <ref>` fetches from a branch/tag instead (e.g. `--ref main` to preview
 * unreleased docs). `--local [root]` reads from local sibling checkouts
 * (root defaults to ../packages) so doc changes can be previewed before pushing.
 *
 * @example
 * ```bash
 * bun run sync:packages
 * bun run sync:packages --ref main
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

function rawDocUrl(repo: string, ref: string, file: string): string {
	return `https://raw.githubusercontent.com/bunary-dev/${repo}/${ref}/docs/${file}`;
}

/**
 * Loader that fetches from GitHub raw at a fixed ref (default: main). 404 →
 * null; other non-OK responses throw.
 */
export function createRemoteLoader(fetchImpl: typeof fetch = fetch, ref = "main"): DocFileLoader {
	const urlFor = (repo: string, file: string) => rawDocUrl(repo, ref, file);
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
 * A failure to resolve or read a package's published release. Always fails
 * the sync (even when `strict` is false): silently skipping or falling back
 * to main would document an unreleased or stale version.
 */
export class ReleaseSourceError extends Error {
	override name = "ReleaseSourceError";
}

/** Resolve `@bunary/<repo>`'s published (`latest`) version from the npm registry. */
export async function resolvePublishedVersion(
	repo: string,
	fetchImpl: typeof fetch = fetch,
): Promise<string> {
	const pkg = `@bunary/${repo}`;
	const url = `https://registry.npmjs.org/${pkg}/latest`;
	let res: Response;
	try {
		res = await fetchImpl(url);
	} catch (error) {
		throw new ReleaseSourceError(
			`Could not resolve the published version of ${pkg} from ${url}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
	if (!res.ok) {
		throw new ReleaseSourceError(
			`Could not resolve the published version of ${pkg} from ${url} (${res.status} ${res.statusText})`,
		);
	}
	const body = (await res.json().catch(() => null)) as { version?: unknown } | null;
	if (typeof body?.version !== "string" || body.version === "") {
		throw new ReleaseSourceError(`Registry response for ${pkg} (${url}) has no "version"`);
	}
	return body.version;
}

/**
 * Loader that fetches from each package's published release: the npm
 * `latest` version is resolved once per package and docs are read from the
 * `v<version>` tag. Registry failures and a missing tag (index.md 404) throw
 * ReleaseSourceError; optional files missing at the tag → null.
 */
export function createReleaseLoader(fetchImpl: typeof fetch = fetch): DocFileLoader {
	const tags = new Map<string, Promise<string>>();
	const resolved = new Map<string, string>();
	const tagFor = (repo: string): Promise<string> => {
		let tag = tags.get(repo);
		if (!tag) {
			tag = resolvePublishedVersion(repo, fetchImpl).then((version) => {
				resolved.set(repo, `v${version}`);
				return `v${version}`;
			});
			tags.set(repo, tag);
		}
		return tag;
	};
	return {
		describeSource: (repo, file) => rawDocUrl(repo, resolved.get(repo) ?? "<unresolved>", file),
		loadFile: async (repo, file) => {
			const tag = await tagFor(repo);
			const url = rawDocUrl(repo, tag, file);
			const res = await fetchImpl(url);
			if (res.status === 404) {
				if (file !== "index.md") return null;
				throw new ReleaseSourceError(
					`Package "${repo}": tag ${tag} (published @bunary/${repo}) has no docs/index.md or does not exist (${url} → 404)`,
				);
			}
			if (!res.ok) {
				throw new ReleaseSourceError(
					`Package "${repo}": failed to fetch "${url}" at tag ${tag} (${res.status} ${res.statusText})`,
				);
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
	/** Doc file loader. Defaults to the published release loader. */
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
	 * ReleaseSourceError always throws regardless.
	 */
	strict?: boolean;
}>;

/** Sync all package docs into `packages/`. */
export async function syncPackages(options: SyncPackagesOptions = {}): Promise<void> {
	const repoRootDir = options.repoRootDir ?? process.cwd();
	const targets = options.targets ?? SYNC_TARGETS;
	const strict = options.strict ?? false;
	const loader = options.loader ?? createReleaseLoader();

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
			if (strict || error instanceof ReleaseSourceError) throw error;
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

/**
 * Parse CLI args: `--local [root]` selects the local loader, `--ref <ref>` a
 * fixed GitHub ref; the default is the published release.
 */
export function loaderFromArgv(
	argv: ReadonlyArray<string>,
	cwd: string,
	fetchImpl: typeof fetch = fetch,
): DocFileLoader {
	const refIndex = argv.indexOf("--ref");
	const ref = refIndex === -1 ? undefined : argv[refIndex + 1];
	if (refIndex !== -1 && (!ref || ref.startsWith("--"))) {
		throw new Error("--ref requires a value (e.g. --ref main)");
	}
	const localIndex = argv.indexOf("--local");
	if (localIndex === -1) {
		return ref === undefined ? createReleaseLoader(fetchImpl) : createRemoteLoader(fetchImpl, ref);
	}
	const next = argv[localIndex + 1];
	const root = next && !next.startsWith("--") ? next : join(cwd, "..", "packages");
	return createLocalLoader(resolve(cwd, root));
}

if (import.meta.main) {
	await syncPackages({ loader: loaderFromArgv(process.argv.slice(2), process.cwd()) });
}

import { describe, expect, test } from "bun:test";
import {
	composePackageDocs,
	createLocalLoader,
	createReleaseLoader,
	createRemoteLoader,
	DOC_FILE_ORDER,
	loaderFromArgv,
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

	test("composePackageDocs() normalizes CRLF and irregular whitespace deterministically", async () => {
		const loader = memoryLoader({
			"core/index.md": "# @bunary/core\r\n\r\nIntro line\r\n\r\n\r\n",
			"core/quickstart.md": "\n\n## Quickstart\r\nSteps here\n\n\n",
		});
		const result = await composePackageDocs("core", loader);
		expect(result).not.toBeNull();
		const markdown = result!.markdown;
		// CRLF collapsed to LF everywhere.
		expect(markdown).not.toContain("\r");
		// Parts joined by exactly one blank line despite ragged source edges.
		expect(markdown).toBe("# @bunary/core\n\nIntro line\n\n## Quickstart\nSteps here\n");
		// Same inputs → same output (deterministic).
		const again = await composePackageDocs("core", loader);
		expect(again!.markdown).toBe(markdown);
	});

	test("renderSyncedPackageMarkdown() normalizes CRLF sources to LF with single trailing newline", () => {
		const out = renderSyncedPackageMarkdown({
			generatorCommand: "bun run sync:packages",
			sources: ["mem://core/docs/index.md"],
			sourceMarkdown: "# @bunary/core\r\n\r\nBody\r\n\r\n",
		});
		expect(out).not.toContain("\r");
		expect(out.endsWith("Body\n")).toBe(true);
		expect(out.endsWith("Body\n\n")).toBe(false);
	});
});

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

	test("loaderFromArgv() defaults to the published release loader", async () => {
		const fakeFetch = (async (url: string | URL | Request) => {
			const u = String(url);
			if (u.startsWith("https://registry.npmjs.org/")) return Response.json({ version: "0.4.0" });
			return new Response("# core", { status: 200 });
		}) as typeof fetch;
		const loader = loaderFromArgv([], "/docs-repo", fakeFetch);
		await loader.loadFile("core", "index.md");
		expect(loader.describeSource("core", "index.md")).toBe(
			"https://raw.githubusercontent.com/bunary-dev/core/v0.4.0/docs/index.md",
		);
	});

	test("loaderFromArgv() with --ref main fetches from main without the registry", async () => {
		const urls: string[] = [];
		const fakeFetch = (async (url: string | URL | Request) => {
			urls.push(String(url));
			return new Response("# core", { status: 200 });
		}) as typeof fetch;
		const loader = loaderFromArgv(["--ref", "main"], "/docs-repo", fakeFetch);
		await loader.loadFile("core", "index.md");
		expect(urls).toEqual(["https://raw.githubusercontent.com/bunary-dev/core/main/docs/index.md"]);
		expect(loader.describeSource("core", "index.md")).toBe(
			"https://raw.githubusercontent.com/bunary-dev/core/main/docs/index.md",
		);
	});

	test("loaderFromArgv() rejects --ref without a value", () => {
		expect(() => loaderFromArgv(["--ref"], "/docs-repo")).toThrow(/--ref/);
		expect(() => loaderFromArgv(["--ref", "--local"], "/docs-repo")).toThrow(/--ref/);
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

describe("documentation sync: published release", () => {
	/** Fake fetch: registry versions per package, raw files per URL; records requested URLs. */
	function releaseFetch(
		versions: Record<string, string | number>,
		files: Record<string, string>,
		urls: string[] = [],
	): typeof fetch {
		return (async (url: string | URL | Request) => {
			const u = String(url);
			urls.push(u);
			const reg = u.match(/^https:\/\/registry\.npmjs\.org\/@bunary\/([^/]+)\/latest$/);
			if (reg) {
				const v = versions[reg[1]!];
				if (v === undefined) return new Response("not found", { status: 404, statusText: "Not Found" });
				if (typeof v === "number") return new Response("err", { status: v });
				return Response.json({ name: `@bunary/${reg[1]}`, version: v });
			}
			const body = files[u];
			if (body === undefined) return new Response("404: Not Found", { status: 404 });
			return new Response(body, { status: 200 });
		}) as typeof fetch;
	}

	const raw = (repo: string, ref: string, file: string) =>
		`https://raw.githubusercontent.com/bunary-dev/${repo}/${ref}/docs/${file}`;

	test("resolves the version from the npm registry and fetches from the v<version> tag", async () => {
		const urls: string[] = [];
		const loader = createReleaseLoader(
			releaseFetch({ http: "0.4.0" }, { [raw("http", "v0.4.0", "index.md")]: "# @bunary/http 0.4.0\n" }, urls),
		);
		expect(await loader.loadFile("http", "index.md")).toBe("# @bunary/http 0.4.0\n");
		expect(urls).toEqual([
			"https://registry.npmjs.org/@bunary/http/latest",
			raw("http", "v0.4.0", "index.md"),
		]);
	});

	test("resolves the registry version once per package; optional files may be absent", async () => {
		const urls: string[] = [];
		const loader = createReleaseLoader(
			releaseFetch({ cli: "0.4.1" }, { [raw("cli", "v0.4.1", "index.md")]: "# cli\n" }, urls),
		);
		await loader.loadFile("cli", "index.md");
		expect(await loader.loadFile("cli", "api.md")).toBeNull();
		expect(urls.filter((u) => u.startsWith("https://registry.npmjs.org/"))).toHaveLength(1);
	});

	test("the generated header shows the tag URL", async () => {
		const writes = new Map<string, string>();
		await syncPackages({
			repoRootDir: "/repo",
			targets: [{ repo: "cli", outputFileName: "cli.md" }],
			loader: createReleaseLoader(
				releaseFetch(
					{ cli: "0.4.1" },
					{
						[raw("cli", "v0.4.1", "index.md")]: "# @bunary/cli\n",
						[raw("cli", "v0.4.1", "api.md")]: "## API\n",
					},
				),
			),
			writeFile: async (path, content) => {
				writes.set(path, content);
			},
		});
		const out = writes.get("/repo/packages/cli.md")!;
		expect(out).toContain(`  Source: ${raw("cli", "v0.4.1", "index.md")}\n`);
		expect(out).toContain(`  Source: ${raw("cli", "v0.4.1", "api.md")}\n`);
		expect(out).not.toContain("/main/");
	});

	test("a registry error throws naming the package", async () => {
		const loader = createReleaseLoader(releaseFetch({ orm: 503 }, {}));
		expect(loader.loadFile("orm", "index.md")).rejects.toThrow(/@bunary\/orm/);
	});

	test("a registry response without a version throws naming the package", async () => {
		const fakeFetch = (async () => Response.json({ name: "@bunary/auth" })) as typeof fetch;
		expect(createReleaseLoader(fakeFetch).loadFile("auth", "index.md")).rejects.toThrow(/@bunary\/auth/);
	});

	test("a missing tag throws naming the package and tag, and never falls back to main", async () => {
		const urls: string[] = [];
		const loader = createReleaseLoader(
			releaseFetch({ http: "0.5.0" }, { [raw("http", "main", "index.md")]: "# unreleased\n" }, urls),
		);
		expect(loader.loadFile("http", "index.md")).rejects.toThrow(/http.*v0\.5\.0/);
		await loader.loadFile("http", "index.md").catch(() => {});
		expect(urls.some((u) => u.includes("/main/"))).toBe(false);
	});

	test("release errors fail syncPackages() even when strict=false", async () => {
		const writes: string[] = [];
		const run = syncPackages({
			repoRootDir: "/repo",
			strict: false,
			targets: [{ repo: "http", outputFileName: "http.md" }],
			loader: createReleaseLoader(releaseFetch({ http: "0.5.0" }, {})),
			writeFile: async (path) => {
				writes.push(path);
			},
		});
		expect(run).rejects.toThrow(/v0\.5\.0/);
		await run.catch(() => {});
		expect(writes).toHaveLength(0);
	});
});

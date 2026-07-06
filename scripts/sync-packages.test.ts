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

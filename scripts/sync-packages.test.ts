import { describe, expect, test } from "bun:test";
import { renderSyncedPackageMarkdown, syncPackages, SYNC_TARGETS } from "./sync-packages";

describe("documentation sync: packages", () => {
	test("renderSyncedPackageMarkdown() is deterministic and preserves source", () => {
		const out = renderSyncedPackageMarkdown({
			generatorCommand: "bun run sync:packages",
			sourceUrl: "https://example.com/docs/index.md",
			sourceMarkdown: "# @bunary/core\n\nHello\n",
		});

		expect(out).toContain("AUTO-GENERATED");
		expect(out).toContain("bun run sync:packages");
		expect(out).toContain("https://example.com/docs/index.md");
		expect(out).toContain("# @bunary/core");
		expect(out.endsWith("\n")).toBe(true);
	});

	test("syncPackages() writes packages/*.md for all targets", async () => {
		const fetchCalls: string[] = [];
		const writes = new Map<string, string>();

		await syncPackages({
			repoRootDir: "/repo",
			fetchText: async (url) => {
				fetchCalls.push(url);
				return `# ${url}\n`;
			},
			writeFile: async (absolutePath, content) => {
				writes.set(absolutePath, content);
			},
		});

		// Fetch order should match target order (deterministic).
		expect(fetchCalls).toEqual(SYNC_TARGETS.map((t) => t.sourceUrl));

		// Output files should be written for every target.
		for (const target of SYNC_TARGETS) {
			const outPath = `/repo/packages/${target.outputFileName}`;
			expect(writes.has(outPath)).toBe(true);
			expect(writes.get(outPath)).toContain(`# ${target.sourceUrl}`);
		}
	});

	test("syncPackages() can skip missing sources when strict=false", async () => {
		const writes = new Map<string, string>();

		await syncPackages({
			repoRootDir: "/repo",
			strict: false,
			targets: [
				{
					repo: "cli",
					outputFileName: "cli.md",
					sourceUrl: "https://example.com/missing.md",
				},
			],
			fetchText: async () => {
				throw new Error("404 Not Found");
			},
			writeFile: async (absolutePath, content) => {
				writes.set(absolutePath, content);
			},
		});

		expect(writes.size).toBe(0);
	});
});


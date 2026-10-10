import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
	generateIndexContent,
	generateLastUpdatedContent,
	gitLastUpdated,
	parseFrontmatter,
	type ProcessedFile,
} from "./sync-site";

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

describe("sync-site: last-updated map", () => {
	const file = (filePath: string, lastUpdated?: string): ProcessedFile => ({
		componentName: "X",
		exportName: "X",
		filePath,
		isPackage: false,
		lastUpdated,
	});

	test("maps each page, relative to the output dir and without extension, to its date", () => {
		const content = generateLastUpdatedContent(
			[file("/out/routing/RouteGroups.tsx", "2026-07-06"), file("/out/Introduction.tsx", "2026-01-26")],
			"/out",
		);
		expect(content).toContain('"Introduction": "2026-01-26",');
		expect(content).toContain('"routing/RouteGroups": "2026-07-06",');
		expect(content.indexOf("Introduction")).toBeLessThan(content.indexOf("routing/RouteGroups"));
		expect(content).toContain("export const lastUpdated: Record<string, string> = {");
	});

	test("omits pages with no known date", () => {
		const content = generateLastUpdatedContent([file("/out/Untracked.tsx")], "/out");
		expect(content).not.toContain("Untracked");
	});

	test("gitLastUpdated returns the last commit date of a tracked file", () => {
		expect(gitLastUpdated(join(import.meta.dir, "sync-site.ts"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
	});

	test("gitLastUpdated returns undefined for a file git does not know", () => {
		expect(gitLastUpdated(join(import.meta.dir, "does-not-exist.md"))).toBeUndefined();
	});
});

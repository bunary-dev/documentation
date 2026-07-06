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

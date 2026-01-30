#!/usr/bin/env bun
/**
 * Build docs for the site: convert markdown (guides/ + packages/) to React components.
 *
 * Run from the documentation repo root. Reads from this repo (guides/, packages/)
 * and writes to the site docs output directory.
 *
 * Output path: DOCS_SITE_OUTPUT env, or ../site/src/pages/docs when run from documentation/.
 *
 * @example
 * ```bash
 * bun run sync:site
 * DOCS_SITE_OUTPUT=/path/to/site/src/pages/docs bun run sync:site
 * ```
 */

import { readdir, readFile, writeFile, mkdir, rm } from "fs/promises";
import { join, dirname, basename, relative } from "path";
import { existsSync } from "fs";
import { marked } from "marked";

/** Documentation repo root (cwd when run from documentation/) */
const DOCS_DIR = process.cwd();
/** Site docs output: env or sibling ../site/src/pages/docs */
const OUTPUT_DIR =
	process.env.DOCS_SITE_OUTPUT ?? join(DOCS_DIR, "..", "site", "src", "pages", "docs");

interface DocMetadata {
	title: string;
	description: string;
}

function parseFrontmatter(content: string): { metadata: DocMetadata; body: string } {
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
		}
	}
	return { metadata, body };
}

function processCodeBlocks(markdown: string): string {
	return markdown;
}

async function markdownToReactComponent(
	metadata: DocMetadata,
	markdown: string,
	componentName: string,
): Promise<string> {
	let processedMarkdown = markdown.replace(/^#\s+.*?\n+/m, "");
	if (metadata.description) {
		processedMarkdown = processedMarkdown.trimStart();
		const firstParagraphRegex = /^[^\n]+(?:\n\n|\n##|$)/m;
		const match = processedMarkdown.match(firstParagraphRegex);
		if (match) {
			const firstPara = match[0].replace(/\n\n$/, "").trim();
			const firstParaText = firstPara.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
			const descText = metadata.description.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");
			if (firstParaText.trim() === descText.trim()) {
				processedMarkdown = processedMarkdown.replace(firstParagraphRegex, "").trimStart();
			}
		}
	}
	processedMarkdown = processCodeBlocks(processedMarkdown);
	const escapedMarkdown = processedMarkdown
		.replace(/\\/g, "\\\\")
		.replace(/`/g, "\\`")
		.replace(/\${/g, "\\${");

	return `/**
 * ${metadata.title}
 * ${metadata.description}
 * Auto-generated from markdown. Do not edit directly.
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/markdown-components";

const ${componentName} = () => {
  const markdown = \`${escapedMarkdown}\`;
  return (
    <article className="max-w-none">
      <h1 className="text-4xl font-bold text-foreground mb-4">${metadata.title}</h1>
      ${metadata.description ? `<p className="text-xl text-muted-foreground mb-8">${metadata.description}</p>` : ""}
      <div className="prose prose-invert max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-code:text-foreground prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-pre:p-4">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {markdown}
        </ReactMarkdown>
      </div>
    </article>
  );
};

export default ${componentName};
`;
}

interface ProcessedFile {
	componentName: string;
	exportName: string;
	filePath: string;
	isPackage: boolean;
}

const processedFiles: ProcessedFile[] = [];

async function processMarkdownFile(filePath: string, relativePath: string): Promise<void> {
	const content = await readFile(filePath, "utf-8");
	const { metadata, body } = parseFrontmatter(content);
	const basenameWithoutExt = basename(filePath, ".md");
	const isPackage = relativePath.startsWith("packages/");

	let componentName: string;
	let exportName: string;
	let outputPath: string;

	if (isPackage) {
		const fileName = basenameWithoutExt
			.split("-")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join("");
		componentName = `${fileName}Package`;
		exportName = componentName;
		const outputDir = join(OUTPUT_DIR, "packages");
		if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });
		outputPath = join(outputDir, `${fileName}.tsx`);
	} else {
		const guidePath = relativePath.replace(/^guides\//, "").replace(/\.md$/, "");
		const pathParts = guidePath.split("/").map((p) => p.replace(/\.md$/, ""));

		if (basenameWithoutExt === "index" && pathParts.length > 1) {
			componentName = pathParts[0]
				.split("-")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join("");
		} else {
			componentName = pathParts
				.map((part) => {
					const name = part === "index" ? "" : part;
					return name
						.split("-")
						.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
						.join("");
				})
				.filter(Boolean)
				.join("");
		}
		exportName = componentName;

		if (pathParts.length > 1) {
			const outputDir = join(OUTPUT_DIR, pathParts[0]);
			if (!existsSync(outputDir)) await mkdir(outputDir, { recursive: true });
			const fileName =
				basenameWithoutExt === "index"
					? "index"
					: basenameWithoutExt
							.split("-")
							.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
							.join("");
			outputPath = join(outputDir, `${fileName}.tsx`);
		} else {
			const fileName = basenameWithoutExt
				.split("-")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join("");
			outputPath = join(OUTPUT_DIR, `${fileName}.tsx`);
		}
	}

	const component = await markdownToReactComponent(metadata, body, componentName);
	await writeFile(outputPath, component, "utf-8");
	processedFiles.push({ componentName, exportName, filePath: outputPath, isPackage });
	console.log(`✓ Generated ${outputPath}`);
}

async function processDirectory(dir: string, relativePath: string = ""): Promise<void> {
	const entries = await readdir(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		const newRelative = relativePath ? join(relativePath, entry.name) : entry.name;
		if (entry.isDirectory()) {
			await processDirectory(fullPath, newRelative);
		} else if (entry.name.endsWith(".md")) {
			await processMarkdownFile(fullPath, newRelative);
		}
	}
}

async function generateIndexFile(): Promise<void> {
	const guides = processedFiles.filter((f) => !f.isPackage).sort((a, b) => a.componentName.localeCompare(b.componentName));
	const packages = processedFiles.filter((f) => f.isPackage).sort((a, b) => a.componentName.localeCompare(b.componentName));
	const exports: string[] = [];
	for (const file of guides) {
		const rel = relative(OUTPUT_DIR, file.filePath).replace(/\\/g, "/");
		const importPath = rel.replace(/\.tsx$/, ".js");
		exports.push(`export { default as ${file.exportName} } from "./${importPath}";`);
	}
	if (packages.length > 0) {
		exports.push("");
		for (const file of packages) {
			exports.push(`export { default as ${file.exportName} } from "./packages/${basename(file.filePath, ".tsx")}.js";`);
		}
	}
	const indexContent = `/**
 * Documentation pages - auto-generated. Do not edit directly.
 */

export { default as DocsLayout } from "./DocsLayout.js";

${exports.join("\n")}
`;
	await writeFile(join(OUTPUT_DIR, "index.ts"), indexContent, "utf-8");
	console.log("✓ Generated index.ts");
}

/** Remove generated files so each run leaves only current output. Keeps DocsLayout.tsx. */
async function cleanOutputDir(): Promise<void> {
	if (!existsSync(OUTPUT_DIR)) return;
	const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
	for (const entry of entries) {
		if (entry.name === "DocsLayout.tsx" || entry.name === "DocsLayout.ts") continue;
		const full = join(OUTPUT_DIR, entry.name);
		await rm(full, { recursive: true });
	}
}

async function build(): Promise<void> {
	console.log("📚 Building docs for site...\n");
	console.log(`  Source: ${DOCS_DIR}`);
	console.log(`  Output: ${OUTPUT_DIR}\n`);

	processedFiles.length = 0;

	if (!existsSync(OUTPUT_DIR)) {
		await mkdir(OUTPUT_DIR, { recursive: true });
	} else {
		await cleanOutputDir();
	}

	await processDirectory(join(DOCS_DIR, "guides"), "guides");
	await processDirectory(join(DOCS_DIR, "packages"), "packages");
	await generateIndexFile();

	console.log(`\n✅ Site docs build complete! (${processedFiles.length} files)`);
}

build().catch((err) => {
	console.error("❌ Build failed:", err);
	process.exit(1);
});

import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Guides must teach the current (0.4) API. Each entry is an API that was
 * removed in 0.4.0, as recorded in the synced package docs.
 */
const REMOVED_APIS: ReadonlyArray<{ name: string; pattern: RegExp }> = [
	{ name: "BunaryApp", pattern: /\bBunaryApp\b/ },
	{
		name: "createApp from @bunary/http (use createRouter)",
		pattern: /import\s*\{[^}]*\bcreateApp\b[^}]*\}\s*from\s*["']@bunary\/http["']/,
	},
	{ name: "ctx.request.json/text/formData (use ctx.body.*)", pattern: /ctx\.request\.(json|text|formData)\(/ },
	{ name: "Environment constant (core)", pattern: /\bEnvironment\.(DEVELOPMENT|PRODUCTION|TEST)\b/ },
	{ name: "setOrmConfig", pattern: /\bsetOrmConfig\b/ },
	{ name: "defineOrmConfig", pattern: /\bdefineOrmConfig\b/ },
	{ name: "BaseModel", pattern: /\bBaseModel\b/ },
	{ name: "Model.table", pattern: /\bModel\.table\(/ },
	{ name: "Schema.create (orm schema builder)", pattern: /\bSchema\.(create|table|drop)/ },
	{ name: "createMigrator", pattern: /\bcreateMigrator\b/ },
	{ name: "enableCoreConfig", pattern: /\benableCoreConfig\b/ },
	{ name: "bunary migrate (use bunary db:migrate)", pattern: /\bbunary migrate\b/ },
	{ name: "bunary route:make (use bunary make:route)", pattern: /\bbunary route:make\b/ },
	{ name: "global auth helpers", pattern: /\b(setAuthManager|getAuthManager|clearAuthManager)\b/ },
	{ name: "installAuthPlugin", pattern: /\binstallAuthPlugin\b/ },
	{ name: "createCookieStorage", pattern: /\bcreateCookieStorage\b/ },
];

const GUIDES_DIR = join(import.meta.dir, "..", "guides");

function listMarkdown(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return listMarkdown(path);
		return entry.name.endsWith(".md") ? [path] : [];
	});
}

describe("guides: 0.4 API", () => {
	const guides = listMarkdown(GUIDES_DIR);

	test("guides exist", () => {
		expect(guides.length).toBeGreaterThan(0);
	});

	for (const { name, pattern } of REMOVED_APIS) {
		test(`no guide uses ${name}`, () => {
			const offenders = guides
				.filter((file) => pattern.test(readFileSync(file, "utf8")))
				.map((file) => relative(GUIDES_DIR, file));
			expect(offenders).toEqual([]);
		});
	}
});

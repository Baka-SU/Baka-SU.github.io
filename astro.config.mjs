import { copyFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { satteri } from "@astrojs/markdown-satteri";
import { docsMarkdown } from "./scripts/docs-plugin.mjs";

// Pagefind index plus legacy `/path.html` aliases for bookmarked VitePress URLs.
function postBuild() {
  const walk = (dir) =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  return {
    name: "bakasu-post-build",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const out = resolve(fileURLToPath(dir));
        const pagefind = await import("pagefind");
        const { index } = await pagefind.createIndex();
        const { page_count } = await index.addDirectory({ path: out });
        await index.writeFiles({ outputPath: join(out, "pagefind") });
        await pagefind.close();
        logger.info(`Indexed ${page_count} pages with Pagefind`);
        for (const file of walk(out)) {
          if (!file.endsWith(`${"/"}index.html`) || dirname(file) === out) continue;
          copyFileSync(file, `${dirname(file)}.html`);
        }
      },
    },
  };
}

export default defineConfig({
  site: "https://bakasu.org",
  output: "static",
  publicDir: "./docs/public",
  integrations: [
    vue(),
    sitemap({
      filter: (page) => !page.endsWith("/404"),
      i18n: { defaultLocale: "en", locales: { en: "en", "zh-Hans": "zh-CN" } },
    }),
    postBuild(),
  ],
  markdown: {
    processor: satteri({ features: { smartPunctuation: false }, mdastPlugins: [docsMarkdown] }),
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" }, wrap: false },
  },
  vite: { plugins: [tailwindcss()], worker: { format: "es" } },
  devToolbar: { enabled: false },
});

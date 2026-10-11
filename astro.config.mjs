import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { prepareDocs } from "./scripts/prepare-docs.mjs";
import { satteri } from "@astrojs/markdown-satteri";
import { docsMarkdown } from "./scripts/docs-markdown.mjs";

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
    {
      name: "bakasu-content",
      hooks: {
        "astro:config:setup": () => prepareDocs(),
        "astro:server:setup": ({ server }) => {
          server.watcher.add("docs");
          server.watcher.on("all", (event, path) => {
            if (/docs\/.*\.(md|json)$/.test(path) && ["add", "change", "unlink"].includes(event))
              prepareDocs();
          });
        },
      },
    },
  ],
  markdown: {
    processor: satteri({ features: { smartPunctuation: false }, mdastPlugins: [docsMarkdown] }),
    shikiConfig: { themes: { light: "github-light", dark: "github-dark" }, wrap: false },
  },
  vite: { plugins: [tailwindcss()], worker: { format: "es" } },
  devToolbar: { enabled: false },
});

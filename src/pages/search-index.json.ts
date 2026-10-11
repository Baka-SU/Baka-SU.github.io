import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
// Dev requests read the current generated Markdown, so edits are searchable immediately.
export const GET: APIRoute = async () => {
  const pages = await getCollection("docs", ({ data }) => !data.part);
  const entries = pages.map((page) => ({
    url: `/${page.id}`,
    lang: page.data.lang,
    title: page.data.title,
    text: readFileSync(resolve(".generated/markdown", `${page.id}.md`), "utf8")
      .replace(/^:::[^\n]*$/gm, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
      .replace(/[#*`|]/g, "")
      .replace(/\s+/g, " ")
      .trim(),
  }));
  return new Response(JSON.stringify(entries), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
  });
};

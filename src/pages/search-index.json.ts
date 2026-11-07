import type { APIRoute } from "astro";
import { getAllPortable } from "../lib/docs";

// Dev-only: lets the search UI work without a Pagefind build. Production uses Pagefind.
export const GET: APIRoute = async () => {
  const entries = import.meta.env.DEV
    ? (await getAllPortable()).map(({ content, path, lang }) => ({
        url: path === "/" && lang === "zh" ? "/zh-Hans" : lang === "zh" ? `/zh-Hans${path}` : path,
        lang,
        title: content.match(/^# (.+)$/m)?.[1] ?? "",
        text: content
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<[^>]*>/g, "")
          .replace(/!?\[([^\]]+)\]\([^)]*\)/g, "$1")
          .replace(/[#*`|]/g, "")
          .replace(/\s+/g, " ")
          .trim(),
      }))
    : [];
  return new Response(JSON.stringify(entries), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-cache" },
  });
};

import { getCollection } from "astro:content";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { APIRoute } from "astro";
export async function getStaticPaths() {
  const docs = await getCollection("docs", ({ data }) => !data.part);
  return [
    ...docs.map((entry) => ({ params: { slug: entry.id } })),
    { params: { slug: "index" } },
    { params: { slug: "zh-Hans/index" } },
  ];
}
export const GET: APIRoute = ({ params }) =>
  new Response(readFileSync(resolve(".generated/markdown", `${params.slug}.md`), "utf8"), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });

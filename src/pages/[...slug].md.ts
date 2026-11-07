import { getCollection } from "astro:content";
import type { APIRoute } from "astro";
import { portableMarkdown } from "../lib/docs";

export async function getStaticPaths() {
  return (await getCollection("docs")).map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}
export const GET: APIRoute = ({ props }) =>
  new Response(portableMarkdown(props.entry), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });

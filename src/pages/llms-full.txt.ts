import type { APIRoute } from "astro";
import { SITE, getAllPortable, llmsSummary } from "../lib/docs";

export const GET: APIRoute = async () => {
  const entries = await getAllPortable();
  return new Response(
    `${llmsSummary}\n${entries.map((e) => `\n---\n\nSource: ${SITE}/${e.id}.md\n\n${e.content}`).join("\n")}`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};

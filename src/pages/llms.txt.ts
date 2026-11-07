import type { APIRoute } from "astro";
import { SITE, getAllPortable, llmsSummary } from "../lib/docs";

export const GET: APIRoute = async () => {
  const entries = await getAllPortable();
  const list = (zh: boolean) =>
    entries
      .filter((e) => e.id.startsWith("zh-Hans/") === zh)
      .map((e) => `- [${e.content.match(/^# (.+)$/m)?.[1]}](${SITE}/${e.id}.md)`)
      .join("\n");
  return new Response(
    `${llmsSummary}\n## Documentation (English)\n\n${list(false)}\n\n## Documentation (简体中文)\n\n${list(true)}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};

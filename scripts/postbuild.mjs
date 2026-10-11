import { readdirSync, writeFileSync, readFileSync, copyFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
const dist = resolve("dist");
function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(resolve(dir, e.name)) : [resolve(dir, e.name)],
  );
}
// Retain bookmarked legacy .html URLs and their original fragments.
for (const file of walk(dist)) {
  if (!file.endsWith("/index.html") || file === resolve(dist, "index.html")) continue;
  const path = "/" + relative(dist, dirname(file)).replaceAll("\\", "/");
  copyFileSync(file, resolve(dist, path.slice(1) + ".html"));
}
const entries = walk(resolve(".generated/markdown"))
  .filter((p) => p.endsWith(".md"))
  .map((file) => ({
    path: relative(resolve(".generated/markdown"), file).replaceAll("\\", "/"),
    content: readFileSync(file, "utf8"),
  }));
const summary =
  "# BakaSU\n\n> KernelSU-based ROOT with enhanced Non-GKI compatibility, minimal hooks, and multi-manager support.\n\nOfficial documentation: https://bakasu.org. Project: https://github.com/Baka-SU/BakaSU.\nEach page has a clean Markdown version at its URL plus `.md`. Installation requirements and warnings are included in the linked pages.\n";
const lists = (zh) =>
  entries
    .filter((e) => e.path.startsWith("zh-Hans/") === zh)
    .map((e) => `- [${e.content.match(/^# (.+)$/m)?.[1]}](https://bakasu.org/${e.path})`)
    .join("\n");
writeFileSync(
  resolve(dist, "llms.txt"),
  summary +
    "\n## Documentation (English)\n\n" +
    lists(false) +
    "\n\n## Documentation (简体中文)\n\n" +
    lists(true) +
    "\n",
);
writeFileSync(
  resolve(dist, "llms-full.txt"),
  summary +
    "\n" +
    entries.map((e) => `\n---\n\nSource: https://bakasu.org/${e.path}\n\n${e.content}`).join("\n"),
);

import { getCollection, type CollectionEntry } from "astro:content";
import { markdownToMdast } from "satteri";
import { rebrand } from "../../scripts/rebrand.mjs";

export type Doc = CollectionEntry<"docs">;

export const SITE = "https://bakasu.org";
export const isHome = (doc: Doc) => doc.data.layout === "home";
export const isChinese = (doc: Doc) => doc.id.startsWith("zh-Hans/");
// Pages are routed by id; `foo/index` is served as `foo`.
export const pagePath = (id: string) => "/" + id.replace(/(^|\/)index$/, "");
// Route without the language prefix, shared by both translations.
export const sharedPath = (doc: Doc) => pagePath(doc.id).replace(/^\/zh-Hans(?=\/|$)/, "") || "/";

export async function getPages() {
  return (await getCollection("docs")).filter((doc) => !isHome(doc));
}

interface Node {
  type: string;
  value?: string;
  depth?: number;
  children?: Node[];
}
const plain = (node: Node): string =>
  node.value ?? (node.children ?? []).map(plain).join("");

const cache = new WeakMap<Doc, ReturnType<typeof extract>>();

function extract(doc: Doc) {
  const tree = markdownToMdast(doc.body ?? "") as unknown as Node;
  const heading = tree.children?.find((node) => node.type === "heading" && node.depth === 1);
  const headingText = heading ? plain(heading) : "";
  const title = rebrand(
    (doc.data.title || headingText.replace(/\s*\{#[^}]+\}\s*$/, "") || doc.id).trim(),
  );
  const anchor = headingText.match(/\{#([^}]+)\}\s*$/)?.[1] ?? "";
  // CJK characters carry roughly twice the information of Latin ones.
  const width = (line: string) => line.length + (line.match(/[\u3040-\u30ff\u3400-\u9fff\uff00-\uffef]/g)?.length ?? 0);
  const lines = (tree.children ?? [])
    .filter((node) => node.type === "paragraph")
    .flatMap((node) => plain(node).split("\n"))
    .filter((line) => !/^[#:<|]/.test(line));
  const summary = lines.find((line) => width(line) > 50) ?? lines[0];
  const description = rebrand(doc.data.description || summary?.slice(0, 165) || title);
  return { title, anchor, description };
}

export function docMeta(doc: Doc) {
  if (!cache.has(doc)) cache.set(doc, extract(doc));
  return {
    ...cache.get(doc)!,
    zh: isChinese(doc),
    lang: isChinese(doc) ? ("zh" as const) : ("en" as const),
    source: `docs/${doc.id}.md`,
    path: sharedPath(doc),
  };
}

// Apply `fn` to prose only; fenced code blocks are copied verbatim.
function outsideFences(text: string, fn: (chunk: string) => string) {
  const out: string[] = [];
  let prose: string[] = [];
  let fence: string | undefined;
  const flush = () => {
    if (prose.length) out.push(fn(prose.join("\n")));
    prose = [];
  };
  for (const line of text.split("\n")) {
    if (fence) {
      out.push(line);
      const close = line.match(/^ {0,3}(`+|~+)[ \t]*$/);
      if (close && close[1][0] === fence[0] && close[1].length >= fence.length) fence = undefined;
      continue;
    }
    const open = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (open && !(open[1][0] === "`" && open[2].includes("`"))) {
      flush();
      fence = open[1];
      out.push(line);
    } else prose.push(line);
  }
  flush();
  return out.join("\n");
}

const deviceFiles = import.meta.glob<Record<string, string>[]>("../../docs/*.json", {
  eager: true,
  import: "default",
});

function deviceTable(file: string, zh: boolean) {
  const repos = deviceFiles[`../../docs/${file}`];
  if (!repos) throw new Error(`Unknown device list: ${file}`);
  const cell = (value: unknown) => String(value).replaceAll("|", "\\|");
  return (
    `| ${zh ? "支持设备" : "Supported devices"} | ${zh ? "仓库" : "Repository"} | ${zh ? "维护者" : "Maintainer"} |\n| --- | --- | --- |\n` +
    repos
      .map(
        (r) =>
          `| ${cell(r.devices)} | [${cell(r.kernel_name || r.repo_name)}](${r.kernel_link || r.repo_link}) | [${cell(r.maintainer)}](${r.maintainer_link}) |`,
      )
      .join("\n")
  );
}

// Clean Markdown for `.md` exports, llms.txt and search.
export function portableMarkdown(doc: Doc) {
  const { title, zh, path } = docMeta(doc);
  if (isHome(doc)) {
    const { hero, features = [] } = doc.data;
    const actions = hero!.actions
      .map((a) => `[${a.text}](${a.link.replace("./", SITE + "/")})`)
      .join(" · ");
    return (
      rebrand(
        `# ${hero!.name}\n\n${hero!.text}\n\n${hero!.tagline}\n\n${actions}\n\n${features.map((f) => `## ${f.title}\n\n${f.details}\n`).join("\n")}`,
      ).trim() + "\n"
    );
  }
  const base = `${SITE}/${doc.id.replace(/\/index$/, "/")}`;
  let titleRemoved = false;
  const body = outsideFences(
    doc.body ?? "",
    (chunk) =>
      rebrand(
        titleRemoved ? chunk : chunk.replace(/^#[ \t]+.+\n?/m, () => ((titleRemoved = true), "")),
      )
        .replace(/<!-- patcher -->/g, `[Online LKM patching](${SITE}/${doc.id}#lkm)`)
        .replace(/<!-- devices: ([a-zA-Z0-9_-]+\.json) -->/g, (_, file) => deviceTable(file, zh))
        .replace(/<Badge\s+type="[^"]+"\s+text="([^"]+)"\s*\/>/g, "$1")
        .replace(/\s*\{#[^}]+\}/g, "")
        .replace(/\]\((?!https?:|mailto:|#)([^)\s]+)\)/g, (_, link) =>
          `](${new URL(link.replace(/\.md(?=#|$)/, ""), base).href})`,
        )
        .replaceAll("#input-hooks", "#input-hook"),
  );
  const exported = `# ${title}\n\n${body}`;
  return (
    (path === "/sponsors"
      ? exported
          .replaceAll("bakasu.org domain", "resukisu.org domain")
          .replaceAll("bakasu.org 域名", "resukisu.org 域名")
      : exported
    ).trim() + "\n"
  );
}

export const llmsSummary =
  "# BakaSU\n\n> KernelSU-based ROOT with enhanced Non-GKI compatibility, minimal hooks, and multi-manager support.\n\nOfficial documentation: https://bakasu.org. Project: https://github.com/Baka-SU/BakaSU.\nEach page has a clean Markdown version at its URL plus `.md`. Installation requirements and warnings are included in the linked pages.\n";

export async function getAllPortable() {
  const docs = (await getCollection("docs")).sort((a, b) => (a.id < b.id ? -1 : 1));
  return docs.map((doc) => ({
    doc,
    id: doc.id,
    content: portableMarkdown(doc),
    path: docMeta(doc).path,
    lang: docMeta(doc).lang,
  }));
}

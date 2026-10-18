import { parse } from "yaml";
import { buildNavigation } from "./navigation.mjs";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  unlinkSync,
} from "node:fs";
import { resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(import.meta.dirname, "..");
const docs = resolve(root, "docs");
const output = resolve(root, ".generated/docs");
const markdownOutput = resolve(root, ".generated/markdown");
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
// Keep authored prose intact; apply branding and Markdown display extensions at build time.
const rebrand = (value) =>
  value
    .replaceAll("github.com/BakaSU/BakaSU.github.io", "github.com/Baka-SU/Baka-SU.github.io")
    .replaceAll("github.com/ReSukiSU/ReSukiSU.github.io", "github.com/Baka-SU/Baka-SU.github.io")
    .replaceAll("github.com/BakaSU/", "github.com/Baka-SU/")
    .replaceAll("github.com/ReSukiSU/ReSukiSU", "github.com/Baka-SU/BakaSU")
    .replaceAll("raw.githubusercontent.com/BakaSU/", "raw.githubusercontent.com/Baka-SU/")
    .replaceAll(
      "raw.githubusercontent.com/ReSukiSU/ReSukiSU",
      "raw.githubusercontent.com/Baka-SU/BakaSU",
    )
    .replaceAll("githubusercontent.com/ReSukiSU/ReSukiSU", "githubusercontent.com/Baka-SU/BakaSU")
    .replaceAll("nightly.link/BakaSU/", "nightly.link/Baka-SU/")
    .replaceAll("nightly.link/ReSukiSU/ReSukiSU", "nightly.link/Baka-SU/BakaSU")
    .replaceAll("resukisu.org", "bakasu.org")
    .replaceAll("ReSukiSU", "BakaSU");
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.name.startsWith(".") || entry.name === "public"
      ? []
      : entry.isDirectory()
        ? files(resolve(dir, entry.name))
        : entry.name.endsWith(".md")
          ? [resolve(dir, entry.name)]
          : [],
  );
}
function table(path, zh) {
  const repos = JSON.parse(readFileSync(resolve(docs, path), "utf8"));
  return `<div class="device-directory"><label class="directory-search">${zh ? "筛选设备" : "Filter devices"}<input type="search" data-device-filter placeholder="${zh ? "搜索设备、仓库或维护者…" : "Search device, repository, or maintainer…"}" /></label><p class="directory-count" aria-live="polite" data-device-count>${repos.length} ${zh ? "个社区项目" : "community projects"}</p><div class="table-scroll"><table><thead><tr><th>${zh ? "支持设备" : "Supported devices"}</th><th>${zh ? "仓库" : "Repository"}</th><th>${zh ? "维护者" : "Maintainer"}</th></tr></thead><tbody>${repos.map((repo) => `<tr><td>${escape(repo.devices)}</td><td><a href="${escape(repo.kernel_link || repo.repo_link)}" target="_blank" rel="noopener noreferrer">${escape(repo.kernel_name || repo.repo_name)}</a></td><td><a href="${escape(repo.maintainer_link)}" target="_blank" rel="noopener noreferrer">${escape(repo.maintainer)}</a></td></tr>`).join("")}</tbody></table></div><p data-device-empty hidden>${zh ? "没有找到匹配的设备。" : "No matching devices. Try another name or maintainer."}</p></div>`;
}
function transform(body, zh) {
  body = body.replace(/<!-- devices: ([a-zA-Z0-9_-]+\.json) -->/g, (_, filename) =>
    table(filename, zh),
  );
  body = body.replace(
    /<Badge\s+type="([^"]+)"\s+text="([^"]+)"\s*\/>/g,
    '<span class="badge badge-$1">$2</span>',
  );
  body = body.replace(
    /^(### .*\{#input-hook\})$/m,
    '<span id="input-hooks" aria-hidden="true"></span>\n\n$1',
  );
  // Fences must remain untouched: directives may appear inside code examples.
  let fence = false;
  let codePanel = false;
  const containers = [];
  return body
    .split("\n")
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fence = !fence;
        if (fence && containers.includes("code-group")) {
          const label = line.match(/\[([^\]]+)\]/)?.[1];
          if (label) {
            codePanel = true;
            return `\n<div class="code-panel" data-tab-label="${escape(label)}"><p class="code-panel-label">${escape(label)}</p>\n\n${line.replace(/\s*\[[^\]]+\]/, "")}`;
          }
        }
        if (!fence && codePanel) {
          codePanel = false;
          return `${line}\n\n</div>\n`;
        }
        return line;
      }
      if (fence) return line;
      const open = line.match(/^:::\s*(tip|info|warning|danger|details|code-group)\s*(.*)$/);
      if (open) {
        const [, type, title] = open;
        containers.push(type);
        if (type === "details")
          return `\n<details class="doc-details"><summary>${escape(title || (zh ? "详细信息" : "Details"))}</summary>\n`;
        if (type === "code-group") return '\n<div class="code-group">\n';
        const defaults = {
          tip: zh ? "提示" : "Tip",
          info: zh ? "说明" : "Note",
          warning: zh ? "注意" : "Warning",
          danger: zh ? "重要" : "Important",
        };
        return `\n<aside class="callout callout-${type}" aria-label="${escape(title || defaults[type])}"><p class="callout-title">${escape(title || defaults[type])}</p>\n`;
      }
      if (/^:::\s*$/.test(line)) {
        const type = containers.pop();
        return `\n</${type === "details" ? "details" : type === "code-group" ? "div" : "aside"}>\n`;
      }
      return line;
    })
    .join("\n");
}
export function prepareDocs() {
  mkdirSync(output, { recursive: true });
  mkdirSync(markdownOutput, { recursive: true });
  const markdownFiles = new Set();
  const routes = [];
  const writeMarkdown = (path, content) => {
    const dest = resolve(markdownOutput, path + ".md");
    mkdirSync(dirname(dest), { recursive: true });
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== content) writeFileSync(dest, content);
    markdownFiles.add(dest);
  };
  const written = new Set();
  const navigationPages = [];
  const write = (path, metadata, body) => {
    const dest = resolve(output, `${path}.md`);
    mkdirSync(dirname(dest), { recursive: true });
    const content = `---\n${Object.entries(metadata)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join("\n")}\n---\n\n${body}\n`;
    if (!existsSync(dest) || readFileSync(dest, "utf8") !== content) writeFileSync(dest, content);
    written.add(dest);
  };
  for (const file of files(docs)) {
    const path = relative(docs, file).replaceAll("\\", "/").replace(/\.md$/, "");
    // Normalize CRLF checkouts (core.autocrlf on Windows) before parsing frontmatter.
    const raw = readFileSync(file, "utf8").replaceAll("\r\n", "\n");
    if (path === "index" || path === "zh-Hans/index") {
      const { hero, features } = parse(raw.match(/^---\n([\s\S]*?)\n---/)[1]);
      writeMarkdown(
        path,
        rebrand(
          `# ${hero.name}\n\n${hero.text}\n\n${hero.tagline}\n\n${hero.actions.map((a) => `[${a.text}](${a.link.replace("./", "https://bakasu.org/")})`).join(" · ")}\n\n${features.map((f) => `## ${f.title}\n\n${f.details}\n`).join("\n")}`,
        ),
      );
      routes.push(path === "index" ? "/" : "/zh-Hans");
      continue;
    }
    const zh = path.startsWith("zh-Hans/");
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    const options = frontmatter ? parse(frontmatter[1]) || {} : {};
    let body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/, "");
    const heading = body.match(/^# (.+)$/m);
    const anchor = heading?.[1].match(/\{#([^}]+)\}/)?.[1] || "";
    const title = rebrand(
      (options.title || heading?.[1] || path).replace(/\s*\{#[^}]+\}/, "").trim(),
    );
    body = rebrand(body.replace(/^# .+\n/m, ""));
    if (path.endsWith("sponsors"))
      body = body
        .replaceAll("bakasu.org domain", "resukisu.org domain")
        .replaceAll("bakasu.org 域名", "resukisu.org 域名");
    const route = "/" + path.replace(/^zh-Hans\//, "").replace(/\/index$/, "");
    routes.push("/" + path.replace(/\/index$/, ""));
    let portable = `# ${title}\n\n` + body;
    portable = portable.replace(
      /<!-- patcher -->/g,
      `[Online LKM patching](https://bakasu.org/${path}#lkm)`,
    );
    portable = portable.replace(/<!-- devices: ([a-zA-Z0-9_-]+\.json) -->/g, (_, filename) => {
      const repos = JSON.parse(readFileSync(resolve(docs, filename), "utf8"));
      return (
        `| ${zh ? "支持设备" : "Supported devices"} | ${zh ? "仓库" : "Repository"} | ${zh ? "维护者" : "Maintainer"} |\n| --- | --- | --- |\n` +
        repos
          .map(
            (r) =>
              `| ${String(r.devices).replaceAll("|", "\\|")} | [${r.kernel_name || r.repo_name}](${r.kernel_link || r.repo_link}) | [${r.maintainer}](${r.maintainer_link}) |`,
          )
          .join("\n")
      );
    });
    portable = portable
      .replace(/<Badge\s+type="[^"]+"\s+text="([^"]+)"\s*\/>/g, "$1")
      .replace(/\s*\{#[^}]+\}/g, "");
    portable = portable.replace(
      /\]\((?!https?:|mailto:|#)([^)]+)\)/g,
      (_, link) =>
        `](${new URL(link.replace(/\.md(?=#|$)/, ""), "https://bakasu.org/" + path.replace(/\/index$/, "/")).href})`,
    );
    writeMarkdown(
      path.replace(/\/index$/, ""),
      portable.replaceAll("#input-hooks", "#input-hook").trim() + "\n",
    );
    navigationPages.push({
      path: route,
      title,
      zh,
      hidden: options.nav === false || options.layout === "page",
      ...(options.sidebar || {}),
    });
    const metadata = {
      title,
      source: `docs/${path}.md`,
      lang: zh ? "zh" : "en",
      anchor,
      description:
        options.description ||
        portable
          .split("\n")
          .find((line) => line.length > 50 && !/^(#|:|<|\||```|~~~)/.test(line))
          ?.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
          .replace(/[*`_]/g, "")
          .slice(0, 165) ||
        title,
      layout: options.layout === "page" ? "page" : "docs",
      part: false,
    };
    const split = body.split(/<!-- patcher -->/);
    write(
      path.replace(/\/index$/, ""),
      { ...metadata, patcher: split.length > 1 },
      transform(split[0], zh),
    );
    if (split.length > 1)
      write(
        `${path.replace(/\/index$/, "")}--after`,
        { ...metadata, part: true, patcher: false },
        transform(split[1], zh),
      );
  }
  const navFile = resolve(root, ".generated/navigation.json");
  const navContent = JSON.stringify(buildNavigation(navigationPages), null, 2) + "\n";
  if (!existsSync(navFile) || readFileSync(navFile, "utf8") !== navContent)
    writeFileSync(navFile, navContent);
  const routesFile = resolve(root, ".generated/routes.json");
  const routesContent = JSON.stringify(routes) + "\n";
  if (!existsSync(routesFile) || readFileSync(routesFile, "utf8") !== routesContent)
    writeFileSync(routesFile, routesContent);
  for (const file of files(markdownOutput)) if (!markdownFiles.has(file)) unlinkSync(file);
  for (const file of files(output)) if (!written.has(file)) unlinkSync(file);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) prepareDocs();

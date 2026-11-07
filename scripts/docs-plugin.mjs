import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import GithubSlugger from "github-slugger";
import { defineMdastPlugin } from "satteri";
import { escapeHtml, rebrand } from "./rebrand.mjs";

const docs = resolve(dirname(fileURLToPath(import.meta.url)), "../docs");
const require = createRequire(import.meta.url);
const CONTAINER = /^:::[ \t]*(tip|info|warning|danger|details|code-group)[ \t]*([^\n]*)(?:\n|$)/;
const CLOSER = /(^|\n):::[ \t]*$/;
const textOf = (node) =>
  node.type === "html"
    ? node.value.replace(/<Badge[^>]*\btext="([^"]*)"[^>]*>|<[^>]*>/g, "$1")
    : (node.value ?? (node.children ?? []).map(textOf).join(""));
const ABSOLUTE = /^(?:[a-z][a-z\d+.-]*:|\/\/)/i;

let patcherIcons;
const icons = () =>
  (patcherIcons ??= (() => {
    const { icons } = JSON.parse(
      readFileSync(require.resolve("@iconify-json/tabler/icons.json"), "utf8"),
    );
    return { upload: icons.upload.body, check: icons.check.body, loader: icons["loader-2"].body };
  })());

const defaults = (zh) => ({
  tip: zh ? "提示" : "Tip",
  info: zh ? "说明" : "Note",
  warning: zh ? "注意" : "Warning",
  danger: zh ? "重要" : "Important",
  details: zh ? "详细信息" : "Details",
});

function opening(type, title, zh) {
  const label = escapeHtml(title || defaults(zh)[type] || "");
  if (type === "details") return `<details class="doc-details"><summary>${label}</summary>`;
  if (type === "code-group") return '<div class="code-group">';
  return `<aside class="callout callout-${type}" aria-label="${label}"><p class="callout-title">${label}</p>`;
}

const closing = (type) =>
  type === "details" ? "</details>" : type === "code-group" ? "</div>" : "</aside>";

function deviceTable(file, zh) {
  const repos = JSON.parse(readFileSync(resolve(docs, file), "utf8"));
  const rows = repos
    .map(
      (repo) =>
        `<tr><td>${escapeHtml(repo.devices)}</td><td><a href="${escapeHtml(repo.kernel_link || repo.repo_link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.kernel_name || repo.repo_name)}</a></td><td><a href="${escapeHtml(repo.maintainer_link)}" target="_blank" rel="noopener noreferrer">${escapeHtml(repo.maintainer)}</a></td></tr>`,
    )
    .join("");
  return `<div class="device-directory"><label class="directory-search">${zh ? "筛选设备" : "Filter devices"}<input type="search" data-device-filter placeholder="${zh ? "搜索设备、仓库或维护者…" : "Search device, repository, or maintainer…"}" /></label><p class="directory-count" aria-live="polite" data-device-count>${repos.length} ${zh ? "个社区项目" : "community projects"}</p><div class="table-scroll"><table><thead><tr><th>${zh ? "支持设备" : "Supported devices"}</th><th>${zh ? "仓库" : "Repository"}</th><th>${zh ? "维护者" : "Maintainer"}</th></tr></thead><tbody>${rows}</tbody></table></div><p data-device-empty hidden>${zh ? "没有找到匹配的设备。" : "No matching devices. Try another name or maintainer."}</p></div>`;
}

const html = (value) => ({ type: "html", value });

// Handles the VitePress-style authoring syntax (`::: tip Title`, `<Badge />`, `{#id}`,
// `<!-- patcher -->`) on the parsed AST, so code blocks are never touched by accident.
export const docsMarkdown = (context) => {
  const path = context.fileURL ? fileURLToPath(context.fileURL) : "";
  const zh = path.startsWith(resolve(docs, "zh-Hans") + "/");
  const containers = [];
  let titleRemoved = false;

  return defineMdastPlugin({
    name: "bakasu-docs",
    heading(node, ctx) {
      if (node.depth === 1 && !titleRemoved) {
        titleRemoved = true;
        ctx.removeNode(node);
        return;
      }
      const tail = node.children.at(-1);
      const match = tail?.type === "text" && tail.value.match(/\s*\{#([^}]+)\}\s*$/);
      if (!match) {
        // Inline HTML (badges) is invisible to Astro's slugger; keep its label in the id.
        if (!node.children.some((c) => c.type === "html")) return;
        const text = textOf(node);
        ctx.setProperty(node, "data", {
          ...node.data,
          hProperties: { ...node.data?.hProperties, id: new GithubSlugger().slug(text) },
        });
        return;
      }
      ctx.setProperty(tail, "value", rebrand(tail.value.slice(0, match.index)));
      ctx.setProperty(node, "data", {
        ...node.data,
        hProperties: { ...node.data?.hProperties, id: match[1] },
      });
      if (match[1] === "input-hook")
        ctx.insertBefore(node, html('<span id="input-hooks" aria-hidden="true"></span>'));
    },
    paragraph(node, ctx) {
      const children = [...node.children];
      const before = [];
      const after = [];
      const head = children[0];
      const opener = head?.type === "text" ? head.value.match(CONTAINER) : null;
      if (opener) {
        containers.push(opener[1]);
        before.push(html(opening(opener[1], rebrand(opener[2].trim()), zh)));
        const rest = head.value.slice(opener[0].length);
        if (rest) children[0] = { type: "text", value: rebrand(rest) };
        else children.shift();
      }
      const tail = children.at(-1);
      const closer = containers.length && tail?.type === "text" ? tail.value.match(CLOSER) : null;
      if (closer) {
        after.push(html(closing(containers.pop())));
        const rest = tail.value.slice(0, closer.index);
        if (rest) children[children.length - 1] = { type: "text", value: rebrand(rest) };
        else children.pop();
      }
      if (!before.length && !after.length) return;
      ctx.replaceNode(node, [
        ...before,
        ...(children.length ? [{ type: "paragraph", children }] : []),
        ...after,
      ]);
    },
    code(node, ctx) {
      const label = containers.includes("code-group") ? node.meta?.match(/\[([^\]]+)\]/)?.[1] : "";
      const meta = label ? node.meta.replace(/\s*\[[^\]]+\]/, "").trim() || null : node.meta;
      const value = rebrand(node.value);
      if (!label) {
        if (value !== node.value) ctx.setProperty(node, "value", value);
        return;
      }
      ctx.replaceNode(node, [
        html(
          `<div class="code-panel" data-tab-label="${escapeHtml(label)}"><p class="code-panel-label">${escapeHtml(label)}</p>`,
        ),
        { type: "code", lang: node.lang, meta, value },
        html("</div>"),
      ]);
    },
    html(node, ctx) {
      const device = node.value.match(/^<!-- devices: ([a-zA-Z0-9_-]+\.json) -->$/);
      if (device) return ctx.replaceNode(node, html(deviceTable(device[1], zh)));
      if (/^<!-- patcher -->$/.test(node.value))
        return ctx.replaceNode(
          node,
          html(
            `<div class="patcher-slot" data-patcher data-lang="${zh ? "zh-CN" : "en"}" data-icons="${escapeHtml(JSON.stringify(icons()))}"></div>`,
          ),
        );
      const value = rebrand(node.value).replace(
        /<Badge\s+type="([^"]+)"\s+text="([^"]+)"\s*\/>/g,
        '<span class="badge badge-$1">$2</span>',
      );
      if (value !== node.value) ctx.replaceNode(node, html(value));
    },
    text(node, ctx) {
      const parent = ctx.parent(node);
      // Heading text is rewritten with its id by the heading visitor.
      if (parent?.type === "heading" && /\{#[^}]+\}\s*$/.test(node.value)) return;
      const value = rebrand(node.value);
      if (value !== node.value) ctx.setProperty(node, "value", value);
    },
    inlineCode(node, ctx) {
      const value = rebrand(node.value);
      if (value !== node.value) ctx.setProperty(node, "value", value);
    },
    link(node, ctx) {
      let url = rebrand(node.url);
      if (!ABSOLUTE.test(url) && !url.startsWith("#")) url = url.replace(/\.md(?=#|$)/, "");
      if (url !== node.url) ctx.setProperty(node, "url", url);
    },
    image(node, ctx) {
      const url = rebrand(node.url);
      if (url !== node.url) ctx.setProperty(node, "url", url);
    },
  });
};

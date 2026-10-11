import { defineMdastPlugin } from "satteri";

// Native Sätteri visitors preserve published anchors without a Unified pipeline.
export const docsMarkdown = defineMdastPlugin({
  name: "bakasu-docs",
  heading(node, ctx) {
    const tail = node.children.at(-1);
    if (tail?.type !== "text") return;
    const match = tail.value.match(/\s*\{#([^}]+)\}\s*$/);
    if (!match) return;
    ctx.setProperty(tail, "value", tail.value.slice(0, match.index));
    ctx.setProperty(node, "data", {
      ...node.data,
      hProperties: { ...node.data?.hProperties, id: match[1] },
    });
  },
  link(node, ctx) {
    if (!/^(https?:|mailto:)/.test(node.url))
      ctx.setProperty(node, "url", node.url.replace(/\.md(?=#|$)/, ""));
  },
});

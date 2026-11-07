const humanize = (value) =>
  value
    .split("/")
    .at(-1)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export function buildNavigation(pages) {
  const nodes = new Map();
  for (const page of pages) {
    if (page.hidden) continue;
    const node = nodes.get(page.path) || {
      path: page.path,
      title: [page.title, page.title],
      items: [],
      order: page.order ?? 100,
      group: page.group,
      parent: page.parent,
      collapsed: page.collapsed ?? false,
    };
    node.title[page.zh ? 1 : 0] = page.label || page.title;
    if (!page.zh)
      Object.assign(node, {
        order: page.order ?? 100,
        group: page.group,
        parent: page.parent,
        collapsed: page.collapsed ?? false,
      });
    nodes.set(page.path, node);
  }
  // Give folders without an index page their own non-linking disclosure.
  for (const node of [...nodes.values()]) {
    let folder = node.path.slice(0, node.path.lastIndexOf("/"));
    while (folder.split("/").length > 2) {
      if (!nodes.has(folder))
        nodes.set(folder, {
          path: folder,
          title: [humanize(folder), humanize(folder)],
          items: [],
          order: node.order,
          group: node.group,
          collapsed: false,
          folder: true,
        });
      folder = folder.slice(0, folder.lastIndexOf("/"));
    }
  }
  const roots = [];
  for (const node of nodes.values()) {
    const inferred = node.path.slice(0, node.path.lastIndexOf("/"));
    const parent = nodes.get(node.parent || inferred);
    if (parent && parent !== node) parent.items.push(node);
    else roots.push(node);
  }
  // Catch malformed explicit parents before a page silently vanishes from navigation.
  const visiting = new Set();
  const visited = new Set();
  const visit = (node) => {
    if (visiting.has(node.path)) throw new Error(`Circular sidebar parent: ${node.path}`);
    if (visited.has(node.path)) return;
    visiting.add(node.path);
    node.items.forEach(visit);
    visiting.delete(node.path);
    visited.add(node.path);
  };
  nodes.forEach(visit);
  const sort = (items) =>
    items
      .sort((a, b) => a.order - b.order || a.path.localeCompare(b.path))
      .map((node) => ({
        title: node.title,
        ...(node.folder ? {} : { path: node.path }),
        collapsed: node.collapsed,
        ...(node.items.length ? { items: sort(node.items) } : {}),
      }));
  const groups = new Map();
  const result = [];
  for (const node of roots.sort((a, b) => a.order - b.order || a.path.localeCompare(b.path))) {
    if (node.group === false) {
      result.push(...sort([node]));
      continue;
    }
    const group =
      node.group ||
      (node.path.startsWith("/guide/") ? "Get started" : humanize(node.path.split("/")[1]));
    if (!groups.has(group)) {
      const section = { title: [group, group === "Get started" ? "开始使用" : group], items: [] };
      groups.set(group, section);
      result.push(section);
    }
    groups.get(group).items.push(...sort([node]));
  }
  return result;
}

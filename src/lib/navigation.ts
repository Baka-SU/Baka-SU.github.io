import routes from "../../.generated/routes.json";
import generatedNavigation from "../../.generated/navigation.json";
export { topNavigation } from "./top-navigation";
export type Language = "en" | "zh";
export const prefix = (lang: Language) => (lang === "zh" ? "/zh-Hans" : "");
export const href = (path: string, lang: Language) =>
  path === "/"
    ? lang === "zh"
      ? "/zh-Hans"
      : "/"
    : lang === "zh" && !routes.includes(`/zh-Hans${path === "/" ? "" : path}`)
      ? path
      : `${prefix(lang)}${path}`;
export interface NavItem {
  title: [string, string];
  path?: string;
  collapsed?: boolean;
  items?: NavItem[];
}
export const navigation = generatedNavigation as NavItem[];
function flatten(items: NavItem[]): { path: string; label: [string, string] }[] {
  return items.flatMap((item) => [
    ...(item.path ? [{ path: item.path, label: item.title }] : []),
    ...flatten(item.items || []),
  ]);
}
export const allPages = flatten(navigation);
export const copy = (lang: Language) => ({
  docs: lang === "zh" ? "指导" : "Guide",
  search: lang === "zh" ? "搜索文档" : "Search docs",
  menu: lang === "zh" ? "菜单" : "Menu",
  onPage: lang === "zh" ? "本页目录" : "On this page",
  edit: lang === "zh" ? "在 GitHub 上编辑此页面" : "Edit page on GitHub",
  previous: lang === "zh" ? "上一页" : "Previous page",
  next: lang === "zh" ? "下一页" : "Next page",
});

export function breadcrumbItems(path: string, lang: Language) {
  const find = (items: NavItem[], parents: NavItem[] = []): NavItem[] | undefined => {
    for (const item of items) {
      if (item.path === path) return [...parents, item];
      const found = item.items && find(item.items, item.path ? [...parents, item] : parents);
      if (found) return found;
    }
  };
  const index = lang === "zh" ? 1 : 0;
  return [
    { name: lang === "zh" ? "首页" : "Home", path: href("/", lang) },
    ...(
      find(navigation) ||
      (path === "/sponsors" ? [{ title: ["Sponsors", "赞助"] as [string, string], path }] : [])
    ).map((item) => ({ name: item.title[index], path: href(item.path!, lang) })),
  ];
}

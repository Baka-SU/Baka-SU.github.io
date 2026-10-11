interface Page {
  url: string;
  lang: string;
  title: string;
  text: string;
}
const escape = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export async function loadDevelopmentSearch(lang: string) {
  return {
    async search(query: string) {
      const response = await fetch("/search-index.json", { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load documentation search");
      const pages: Page[] = await response.json();
      const terms = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
      const ranked = pages
        .filter((page) => page.lang === lang)
        .map((page) => {
          const title = page.title.toLocaleLowerCase();
          const text = page.text.toLocaleLowerCase();
          if (!terms.every((term) => text.includes(term) || title.includes(term))) return undefined;
          const position = Math.max(0, text.indexOf(terms[0]));
          return {
            page,
            score: terms.reduce((score, term) => score + (title.includes(term) ? 10 : 1), 0),
            position,
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => !!entry)
        .sort((a, b) => b.score - a.score || a.position - b.position);
      return {
        results: ranked.map(({ page, position }) => ({
          data: async () => ({
            url: page.url,
            meta: { title: page.title },
            excerpt: escape(page.text.slice(Math.max(0, position - 60), position + 180)),
          }),
        })),
      };
    },
  };
}

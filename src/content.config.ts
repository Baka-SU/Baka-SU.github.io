import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./.generated/docs",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    description: z.string().default(""),
    layout: z.enum(["docs", "page"]).default("docs"),
    title: z.string(),
    source: z.string(),
    lang: z.enum(["en", "zh"]),
    anchor: z.string().default(""),
    part: z.boolean().default(false),
    patcher: z.boolean().default(false),
  }),
});
export const collections = { docs };

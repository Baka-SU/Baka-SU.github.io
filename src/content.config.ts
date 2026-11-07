import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

const link = z.object({ text: z.string(), link: z.string(), theme: z.string().optional() });

const docs = defineCollection({
  loader: glob({
    pattern: ["**/*.md", "!public/**"],
    base: "./docs",
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    layout: z.enum(["docs", "page", "home"]).default("docs"),
    nav: z.boolean().default(true),
    sidebar: z
      .object({
        label: z.string(),
        order: z.number(),
        group: z.union([z.string(), z.literal(false)]),
        parent: z.string(),
        collapsed: z.boolean(),
      })
      .partial()
      .default({}),
    hero: z.object({ name: z.string(), text: z.string(), tagline: z.string(), actions: z.array(link) }).optional(),
    features: z.array(z.object({ title: z.string(), details: z.string(), link: z.string().optional() })).optional(),
  }),
});
export const collections = { docs };

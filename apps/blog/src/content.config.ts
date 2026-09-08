import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content" }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
    latest_edit_at: z.date().optional(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    published: z.boolean(),
  }),
});

export const collections = { blog };

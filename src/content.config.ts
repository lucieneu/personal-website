// Content collections, validated at build time: an error in the frontmatter fails the build.
// The content model is described in docs/project-spec.md (Content model).
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Text that appears in both languages within a single entry
const localized = z.object({ nl: z.string(), en: z.string() });

const projects = defineCollection({
  // Files live in nl/ and en/ subfolders, so ids look like 'nl/my-project'.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      summary: z.string().max(160),
      date: z.coerce.date(),
      role: z.string(),
      stack: z.array(z.string()),
      cover: image(),
      coverAlt: z.string().min(1),
      links: z
        .object({
          live: z.url().optional(),
          repo: z.url().optional(),
        })
        .default({}),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    }),
});

const posts = defineCollection({
  // Like projects: nl/ and en/ subfolders, so ids look like 'nl/my-post'.
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(160),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

const experience = defineCollection({
  loader: file('./src/content/experience.json'),
  schema: z.object({
    company: z.string(),
    role: localized,
    start: z.coerce.date(),
    end: z.coerce.date().optional(),
    summary: localized,
    stack: z.array(z.string()),
  }),
});

export const collections = { projects, posts, experience };

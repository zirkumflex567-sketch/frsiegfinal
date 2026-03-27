import { z } from "zod";

const panelSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  text: z.string().max(5000).default(""),
  color: z.string().max(32).optional(),
  imageAssetId: z.string().uuid().nullable().optional(),
  linkLabel: z.string().max(120).optional(),
  linkHref: z.string().max(512).optional(),
});

const partnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(180),
  url: z.string().max(512).optional(),
  logoAssetId: z.string().uuid().nullable().optional(),
});

const heroSchema = z
  .object({
    heading: z.string().max(180).optional(),
    subheading: z.string().max(500).optional(),
    ctaLabel: z.string().max(120).optional(),
    ctaHref: z.string().max(512).optional(),
    backgroundAssetId: z.string().uuid().nullable().optional(),
  })
  .default({});

const typographySchema = z
  .object({
    fontFamily: z.string().max(120).optional(),
    headingWeight: z.string().max(20).optional(),
    bodyWeight: z.string().max(20).optional(),
  })
  .default({});

export const pageContentSchema = z
  .object({
    hero: heroSchema.optional(),
    typography: typographySchema.optional(),
    panels: z.array(panelSchema).default([]),
    partners: z.array(partnerSchema).default([]),
    colors: z.record(z.string(), z.string()).default({}),
    links: z.record(z.string(), z.string()).default({}),
  })
  .catchall(z.unknown())
  .default(() => ({
    hero: {},
    typography: {},
    panels: [],
    partners: [],
    colors: {},
    links: {},
  }));

const pageStatusSchema = z.enum(["draft", "published"]);

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, "Slug darf nur a-z, 0-9 und - enthalten");

export const createPageInputSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(1).max(160),
  status: pageStatusSchema.default("draft"),
  content: pageContentSchema,
});

export const updatePageInputSchema = z
  .object({
    slug: slugSchema.optional(),
    title: z.string().trim().min(1).max(160).optional(),
    status: pageStatusSchema.optional(),
    content: pageContentSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Mindestens ein Feld muss geändert werden.",
  });

export type PageContent = z.infer<typeof pageContentSchema>;
export type CreatePageInput = z.infer<typeof createPageInputSchema>;
export type UpdatePageInput = z.infer<typeof updatePageInputSchema>;

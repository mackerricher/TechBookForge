import { z } from "zod";

export const bookSpecSchema = z.object({
  title: z.string().min(3),
  subtitle: z.string().optional(),
  description: z.string().optional(),
  genre: z.enum(["non-fiction", "fiction"]).default("non-fiction"),
  specialization: z.string().optional(),
  key_message: z.string(),
  tone_voice: z.string().optional(),
  style_guidelines: z.object({
    reading_level: z.string().optional(),
    complexity_level: z.enum(["introductory", "intermediate", "advanced"]).optional(),
    preferred_person: z.enum(["first", "second", "third"]).optional()
  }).optional(),
  unique_selling_points: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  comparable_titles: z.array(z.object({
    title: z.string(),
    author: z.string().optional(),
    publisher: z.string().optional(),
    year: z.number().optional()
  })).optional(),
  estimated_word_count: z.number().min(100),
  chapter_count: z.number().min(1).optional(),
  sections_per_chapter: z.number().min(2).optional(),
  language: z.string().default("en"),
  deepseek_model: z.string().default("deepseek-chat"),
  github_repo_visibility: z.enum(["public", "private"]).default("private"),
  author: z.object({
    name: z.string(),
    bio: z.string().optional(),
    credentials: z.string().optional(),
    website: z.string().optional(),
    contact_email: z.string().email().optional(),
    social_handles: z.record(z.string()).optional()
  }),
  target_audience: z.object({
    persona_name: z.string().optional(),
    description: z.string(),
    technical_level: z.enum(["layperson", "beginner", "intermediate", "advanced"]).optional(),
    familiarity_with_topic: z.string().optional(),
    age_range: z.string().optional(),
    professional_background: z.string().optional(),
    primary_goal: z.string().optional()
  }),
  additional_notes: z.string().optional()
});

export type BookSpec = z.infer<typeof bookSpecSchema>;

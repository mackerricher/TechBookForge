import { pgTable, text, serial, integer, boolean, timestamp, jsonb, smallint, varchar, pgEnum, primaryKey, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Reference / lookup tables
export const audiences = pgTable("audiences", {
  id: serial("id").primaryKey(),
  personaName: varchar("persona_name", { length: 100 }),
  description: text("description").notNull(),
  technicalLevel: varchar("technical_level", { length: 20 }),
  familiarity: text("familiarity"),
  ageRange: varchar("age_range", { length: 50 }),
  professionalBackground: varchar("professional_background", { length: 100 }),
  primaryGoal: text("primary_goal"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const authors = pgTable("authors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 150 }).notNull(),
  bio: text("bio"),
  credentials: text("credentials"),
  website: text("website"),
  contactEmail: text("contact_email"),
  socialHandles: jsonb("social_handles"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// Core book & ownership
export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  subtitle: varchar("subtitle", { length: 250 }),
  description: text("description"),
  genre: varchar("genre", { length: 50 }).default("non-fiction"),
  specialization: varchar("specialization", { length: 150 }),
  keyMessage: text("key_message"),
  toneVoice: text("tone_voice"),
  styleGuidelines: jsonb("style_guidelines"),
  estimatedWordCount: integer("estimated_word_count"),
  chapterCount: integer("chapter_count"),
  sectionsPerChapter: integer("sections_per_chapter"),
  deepseekModel: varchar("deepseek_model", { length: 100 }),
  audienceId: integer("audience_id").references(() => audiences.id),
  language: varchar("language", { length: 10 }).default("en"),
  additionalNotes: text("additional_notes"),
  status: varchar("status", { length: 30 }).default("created"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

export const bookAuthors = pgTable("book_authors", {
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  authorId: integer("author_id").references(() => authors.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 75 }),
  isPrimary: boolean("is_primary").default(false),
  authorOrder: smallint("author_order")
});

// GitHub integration
export const githubRepos = pgTable("github_repos", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").unique().references(() => books.id, { onDelete: "cascade" }),
  owner: varchar("owner", { length: 100 }),
  repoName: varchar("repo_name", { length: 200 }),
  url: text("url"),
  visibility: varchar("visibility", { length: 10 }).default("private"),
  defaultBranch: varchar("default_branch", { length: 50 }).default("main"),
  createdAt: timestamp("created_at").defaultNow()
});

// Keywords & comps
export const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  keyword: varchar("keyword", { length: 60 }).unique()
});

export const bookKeywords = pgTable("book_keywords", {
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  keywordId: integer("keyword_id").references(() => keywords.id, { onDelete: "cascade" })
});

export const comparableTitles = pgTable("comparable_titles", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  author: varchar("author", { length: 150 }),
  publisher: varchar("publisher", { length: 150 }),
  year: smallint("year")
});

export const bookComparableTitles = pgTable("book_comparable_titles", {
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  comparableId: integer("comparable_id").references(() => comparableTitles.id, { onDelete: "cascade" })
});

// Content hierarchy
export const chapters = pgTable("chapters", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  chapterNumber: smallint("chapter_number").notNull(),
  title: varchar("title", { length: 200 }),
  outlinePath: text("outline_path"),
  createdAt: timestamp("created_at").defaultNow()
});

export const sections = pgTable("sections", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id").references(() => chapters.id, { onDelete: "cascade" }),
  sectionNumber: smallint("section_number").notNull(),
  title: varchar("title", { length: 200 }),
  outlinePath: text("outline_path"),
  draftPath: text("draft_path"),
  summaryPath: text("summary_path"),
  createdAt: timestamp("created_at").defaultNow()
});

export const sectionDetails = pgTable("section_details", {
  id: serial("id").primaryKey(),
  sectionId: integer("section_id").references(() => sections.id, { onDelete: "cascade" }),
  personName: varchar("person_name", { length: 100 }),
  businessName: varchar("business_name", { length: 100 }),
  cityName: varchar("city_name", { length: 100 }),
  jobRole: varchar("job_role", { length: 100 }),
  businessType: varchar("business_type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow()
});

// DeepSeek request/response ledger
export const deepseekRequestTypeEnum = pgEnum("deepseek_request_type", [
  "book_outline",
  "chapter_outline", 
  "section_outline",
  "section_draft",
  "section_summary",
  "section_details",
  "front_matter"
]);

export const deepseekRequests = pgTable("deepseek_requests", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  chapterId: integer("chapter_id").references(() => chapters.id),
  sectionId: integer("section_id").references(() => sections.id),
  requestType: deepseekRequestTypeEnum("request_type").notNull(),
  promptText: text("prompt_text"),
  responsePath: text("response_path"),
  status: varchar("status", { length: 20 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});

// Relations
export const audiencesRelations = relations(audiences, ({ many }) => ({
  books: many(books)
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  bookAuthors: many(bookAuthors)
}));

export const booksRelations = relations(books, ({ one, many }) => ({
  audience: one(audiences, {
    fields: [books.audienceId],
    references: [audiences.id]
  }),
  bookAuthors: many(bookAuthors),
  githubRepo: one(githubRepos),
  bookKeywords: many(bookKeywords),
  bookComparableTitles: many(bookComparableTitles),
  chapters: many(chapters),
  deepseekRequests: many(deepseekRequests),
  progressHistory: many(bookProgressHistory)
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, {
    fields: [bookAuthors.bookId],
    references: [books.id]
  }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id]
  })
}));

export const githubReposRelations = relations(githubRepos, ({ one }) => ({
  book: one(books, {
    fields: [githubRepos.bookId],
    references: [books.id]
  })
}));

export const keywordsRelations = relations(keywords, ({ many }) => ({
  bookKeywords: many(bookKeywords)
}));

export const bookKeywordsRelations = relations(bookKeywords, ({ one }) => ({
  book: one(books, {
    fields: [bookKeywords.bookId],
    references: [books.id]
  }),
  keyword: one(keywords, {
    fields: [bookKeywords.keywordId],
    references: [keywords.id]
  })
}));

export const comparableTitlesRelations = relations(comparableTitles, ({ many }) => ({
  bookComparableTitles: many(bookComparableTitles)
}));

export const bookComparableTitlesRelations = relations(bookComparableTitles, ({ one }) => ({
  book: one(books, {
    fields: [bookComparableTitles.bookId],
    references: [books.id]
  }),
  comparableTitle: one(comparableTitles, {
    fields: [bookComparableTitles.comparableId],
    references: [comparableTitles.id]
  })
}));

export const chaptersRelations = relations(chapters, ({ one, many }) => ({
  book: one(books, {
    fields: [chapters.bookId],
    references: [books.id]
  }),
  sections: many(sections),
  deepseekRequests: many(deepseekRequests)
}));

export const sectionsRelations = relations(sections, ({ one, many }) => ({
  chapter: one(chapters, {
    fields: [sections.chapterId],
    references: [chapters.id]
  }),
  deepseekRequests: many(deepseekRequests),
  sectionDetails: many(sectionDetails)
}));

export const sectionDetailsRelations = relations(sectionDetails, ({ one }) => ({
  section: one(sections, {
    fields: [sectionDetails.sectionId],
    references: [sections.id]
  })
}));

export const deepseekRequestsRelations = relations(deepseekRequests, ({ one }) => ({
  book: one(books, {
    fields: [deepseekRequests.bookId],
    references: [books.id]
  }),
  chapter: one(chapters, {
    fields: [deepseekRequests.chapterId],
    references: [chapters.id]
  }),
  section: one(sections, {
    fields: [deepseekRequests.sectionId],
    references: [sections.id]
  })
}));

// Book Progress History table for tracking generation steps
export const progressStepEnum = pgEnum("progress_step", [
  "input_validation",
  "database_storage", 
  "github_repository",
  "book_outline",
  "chapter_outlines",
  "content_generation",
  "content_compilation",
  "front_matter_generation"
]);

export const progressStatusEnum = pgEnum("progress_status", [
  "started",
  "in_progress", 
  "completed",
  "failed"
]);

export const bookProgressHistory = pgTable("book_progress_history", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  step: progressStepEnum("step").notNull(),
  status: progressStatusEnum("status").notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata"), // Additional step-specific data
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});

export const bookProgressHistoryRelations = relations(bookProgressHistory, ({ one }) => ({
  book: one(books, {
    fields: [bookProgressHistory.bookId],
    references: [books.id]
  }),
}));

// Schemas for validation
export const insertAudienceSchema = createInsertSchema(audiences).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertAuthorSchema = createInsertSchema(authors).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertBookSchema = createInsertSchema(books).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertChapterSchema = createInsertSchema(chapters).omit({
  id: true,
  createdAt: true
});

export const insertSectionSchema = createInsertSchema(sections).omit({
  id: true,
  createdAt: true
});

export const insertSectionDetailSchema = createInsertSchema(sectionDetails).omit({
  id: true,
  createdAt: true
});

export const insertDeepseekRequestSchema = createInsertSchema(deepseekRequests).omit({
  id: true,
  createdAt: true,
  completedAt: true
});

export const insertBookProgressHistorySchema = createInsertSchema(bookProgressHistory).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type Audience = typeof audiences.$inferSelect;
export type InsertAudience = z.infer<typeof insertAudienceSchema>;

export type Author = typeof authors.$inferSelect;
export type InsertAuthor = z.infer<typeof insertAuthorSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;

export type BookAuthor = typeof bookAuthors.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type InsertChapter = z.infer<typeof insertChapterSchema>;

export type Section = typeof sections.$inferSelect;
export type InsertSection = z.infer<typeof insertSectionSchema>;

export type SectionDetail = typeof sectionDetails.$inferSelect;
export type InsertSectionDetail = z.infer<typeof insertSectionDetailSchema>;

export type DeepseekRequest = typeof deepseekRequests.$inferSelect;
export type InsertDeepseekRequest = z.infer<typeof insertDeepseekRequestSchema>;

export type GithubRepo = typeof githubRepos.$inferSelect;
export type Keyword = typeof keywords.$inferSelect;
export type ComparableTitle = typeof comparableTitles.$inferSelect;

export type BookProgressHistory = typeof bookProgressHistory.$inferSelect;
export type InsertBookProgressHistory = z.infer<typeof insertBookProgressHistorySchema>;

// Keep users table for compatibility
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

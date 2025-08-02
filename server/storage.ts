import { 
  users, books, authors, audiences, chapters, sections, sectionDetails, githubRepos, 
  keywords, comparableTitles, bookKeywords, bookComparableTitles, bookAuthors,
  deepseekRequests, bookProgressHistory,
  type User, type InsertUser, type Book, type InsertBook, type Author, type InsertAuthor,
  type Audience, type InsertAudience, type Chapter, type InsertChapter,
  type Section, type InsertSection, type SectionDetail, type InsertSectionDetail,
  type GithubRepo, type DeepseekRequest, type InsertDeepseekRequest,
  type BookProgressHistory, type InsertBookProgressHistory
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  
  // Book generation methods
  createAudience(audienceData: InsertAudience): Promise<Audience>;
  createAuthor(authorData: InsertAuthor): Promise<Author>;
  createBook(bookData: InsertBook): Promise<Book>;
  getBook(id: number): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  updateBookStatus(bookId: number, status: string): Promise<void>;
  
  // Author-Book linking
  linkAuthorToBook(bookId: number, authorId: number, role: string, isPrimary: boolean): Promise<void>;
  
  // Keywords and comparable titles
  storeBookKeywords(bookId: number, keywords: string[]): Promise<void>;
  storeComparableTitles(bookId: number, titles: Array<{title: string, author?: string, publisher?: string, year?: number}>): Promise<void>;
  
  // GitHub integration
  storeGithubRepo(bookId: number, repoData: any): Promise<void>;
  getGithubRepo(bookId: number): Promise<any | undefined>;
  
  // Content hierarchy
  createChapter(bookId: number, chapterNumber: number, title: string, outlinePath: string): Promise<Chapter>;
  createSection(chapterId: number, sectionNumber: number, title: string, outlinePath: string): Promise<Section>;
  getBookChapters(bookId: number): Promise<Chapter[]>;
  getChapterSections(chapterId: number): Promise<Section[]>;
  updateSectionDraftPath(sectionId: number, draftPath: string): Promise<void>;
  updateSectionSummaryPath(sectionId: number, summaryPath: string): Promise<void>;
  
  // Section details methods
  storeSectionDetails(sectionId: number, details: Array<{personName?: string, businessName?: string, cityName?: string, jobRole?: string, businessType?: string}>): Promise<void>;
  getSectionDetails(sectionId: number): Promise<SectionDetail[]>;
  getBookSectionDetails(bookId: number): Promise<Array<SectionDetail & { sectionId: number; chapterId: number; sectionNumber: number; chapterNumber: number }>>;
  
  // DeepSeek tracking
  recordDeepseekRequest(bookId: number, chapterId: number | null, sectionId: number | null, requestType: string, promptText: string, responsePath: string): Promise<void>;
  
  // Generation logs and progress
  addGenerationLog(bookId: number, type: string, title: string, description: string): Promise<void>;
  getGenerationLogs(bookId: number): Promise<any[]>;
  getGenerationProgress(bookId: number): Promise<any>;
  
  // Book Progress History methods
  startProgressStep(bookId: number, step: string, metadata?: any): Promise<BookProgressHistory>;
  completeProgressStep(bookId: number, step: string, metadata?: any): Promise<void>;
  failProgressStep(bookId: number, step: string, errorMessage: string, metadata?: any): Promise<void>;
  getBookProgressHistory(bookId: number): Promise<BookProgressHistory[]>;
  getCurrentProgressStep(bookId: number): Promise<BookProgressHistory | undefined>;
  cleanupProgressHistoryAfterStep(bookId: number, targetStep: string): Promise<void>;

  // Book deletion (cascade)
  deleteBook(bookId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createAudience(audienceData: InsertAudience): Promise<Audience> {
    const [audience] = await db
      .insert(audiences)
      .values(audienceData)
      .returning();
    return audience;
  }

  async createAuthor(authorData: InsertAuthor): Promise<Author> {
    const [author] = await db
      .insert(authors)
      .values(authorData)
      .returning();
    return author;
  }

  async createBook(bookData: InsertBook): Promise<Book> {
    const [book] = await db
      .insert(books)
      .values(bookData)
      .returning();
    return book;
  }

  async getBook(id: number): Promise<Book | undefined> {
    const [book] = await db.select().from(books).where(eq(books.id, id));
    return book || undefined;
  }

  async getAllBooks(): Promise<Book[]> {
    return await db.select().from(books).orderBy(desc(books.createdAt));
  }

  async updateBookStatus(bookId: number, status: string): Promise<void> {
    await db
      .update(books)
      .set({ status, updatedAt: new Date() })
      .where(eq(books.id, bookId));
  }

  async linkAuthorToBook(bookId: number, authorId: number, role: string, isPrimary: boolean): Promise<void> {
    await db
      .insert(bookAuthors)
      .values({
        bookId,
        authorId,
        role,
        isPrimary,
        authorOrder: 1
      });
  }

  async storeBookKeywords(bookId: number, keywordList: string[]): Promise<void> {
    for (const keyword of keywordList) {
      // Insert or get existing keyword
      let [keywordRecord] = await db
        .select()
        .from(keywords)
        .where(eq(keywords.keyword, keyword));
      
      if (!keywordRecord) {
        [keywordRecord] = await db
          .insert(keywords)
          .values({ keyword })
          .returning();
      }

      // Link keyword to book
      await db
        .insert(bookKeywords)
        .values({
          bookId,
          keywordId: keywordRecord.id
        })
        .onConflictDoNothing();
    }
  }

  async storeComparableTitles(bookId: number, titles: Array<{title: string, author?: string, publisher?: string, year?: number}>): Promise<void> {
    for (const titleData of titles) {
      // Insert comparable title
      const [comparable] = await db
        .insert(comparableTitles)
        .values(titleData)
        .returning();

      // Link to book
      await db
        .insert(bookComparableTitles)
        .values({
          bookId,
          comparableId: comparable.id
        });
    }
  }

  async storeGithubRepo(bookId: number, repoData: any): Promise<void> {
    await db
      .insert(githubRepos)
      .values({
        bookId,
        owner: repoData.owner,
        repoName: repoData.name,
        url: repoData.url,
        visibility: "private",
        defaultBranch: "main"
      });
  }

  async getGithubRepo(bookId: number): Promise<any | undefined> {
    const [repo] = await db.select().from(githubRepos).where(eq(githubRepos.bookId, bookId));
    return repo || undefined;
  }

  async createChapter(bookId: number, chapterNumber: number, title: string, outlinePath: string): Promise<Chapter> {
    const [chapter] = await db
      .insert(chapters)
      .values({
        bookId,
        chapterNumber,
        title,
        outlinePath
      })
      .returning();
    return chapter;
  }

  async createSection(chapterId: number, sectionNumber: number, title: string, outlinePath: string): Promise<Section> {
    const [section] = await db
      .insert(sections)
      .values({
        chapterId,
        sectionNumber,
        title,
        outlinePath
      })
      .returning();
    return section;
  }

  async getBookChapters(bookId: number): Promise<Chapter[]> {
    return await db
      .select()
      .from(chapters)
      .where(eq(chapters.bookId, bookId))
      .orderBy(chapters.chapterNumber);
  }

  async getChapterSections(chapterId: number): Promise<Section[]> {
    return await db
      .select()
      .from(sections)
      .where(eq(sections.chapterId, chapterId))
      .orderBy(sections.sectionNumber);
  }

  async updateSectionDraftPath(sectionId: number, draftPath: string): Promise<void> {
    await db
      .update(sections)
      .set({ draftPath })
      .where(eq(sections.id, sectionId));
  }

  async updateSectionSummaryPath(sectionId: number, summaryPath: string): Promise<void> {
    await db
      .update(sections)
      .set({ summaryPath })
      .where(eq(sections.id, sectionId));
  }

  async recordDeepseekRequest(bookId: number, chapterId: number | null, sectionId: number | null, requestType: string, promptText: string, responsePath: string): Promise<void> {
    await db
      .insert(deepseekRequests)
      .values({
        bookId,
        chapterId,
        sectionId,
        requestType: requestType as any,
        promptText,
        responsePath,
        status: "completed"
      });
  }

  async addGenerationLog(bookId: number, type: string, title: string, description: string): Promise<void> {
    // For now, we'll store logs as DeepSeek requests with a special type
    // In a real application, you might want a separate logs table
    await db
      .insert(deepseekRequests)
      .values({
        bookId,
        chapterId: null,
        sectionId: null,
        requestType: "book_outline" as any, // placeholder
        promptText: `${type}: ${title}`,
        responsePath: description,
        status: "completed"
      });
  }

  async getGenerationLogs(bookId: number): Promise<any[]> {
    const logs = await db
      .select()
      .from(deepseekRequests)
      .where(eq(deepseekRequests.bookId, bookId))
      .orderBy(desc(deepseekRequests.createdAt));

    return logs.map(log => ({
      id: log.id.toString(),
      type: log.promptText?.startsWith('error:') ? 'error' : 
            log.promptText?.startsWith('success:') ? 'success' :
            log.promptText?.startsWith('warning:') ? 'warning' : 'info',
      title: log.promptText?.split(':')[1]?.trim() || 'Generation Step',
      description: log.responsePath || '',
      timestamp: log.createdAt?.toLocaleString() || new Date().toLocaleString()
    }));
  }

  async getGenerationProgress(bookId: number): Promise<any> {
    const book = await this.getBook(bookId);
    if (!book) return null;

    const logs = await this.getGenerationLogs(bookId);
    const totalSteps = 10;
    let currentStep = 1;
    
    // Calculate progress based on generation logs with step tracking
    const completedSteps = logs.filter(log => 
      log.type === 'success' && log.title.includes('Step')
    );
    
    const errorSteps = logs.filter(log => 
      log.type === 'error'
    );
    
    if (errorSteps.length > 0) {
      // If there are errors, find the last completed step
      currentStep = completedSteps.length;
    } else if (book.status === 'completed') {
      currentStep = totalSteps;
    } else if (book.status === 'processing') {
      // Determine current step based on latest log entries
      const latestSuccessStep = completedSteps.length;
      const activeSteps = logs.filter(log => 
        log.type === 'info' && log.title.includes('Step')
      );
      
      if (activeSteps.length > latestSuccessStep) {
        currentStep = latestSuccessStep + 1;
      } else {
        currentStep = Math.max(1, latestSuccessStep);
      }
    } else {
      currentStep = 1;
    }

    return {
      currentStep,
      totalSteps,
      percentage: Math.round((currentStep / totalSteps) * 100),
      status: book.status,
      hasErrors: errorSteps.length > 0
    };
  }

  // Book Progress History implementation
  async startProgressStep(bookId: number, step: string, metadata?: any): Promise<BookProgressHistory> {
    const progressData: InsertBookProgressHistory = {
      bookId,
      step: step as any,
      status: "started",
      metadata: metadata ? JSON.stringify(metadata) : null
    };

    const [progress] = await db
      .insert(bookProgressHistory)
      .values(progressData)
      .returning();
    
    return progress;
  }

  async completeProgressStep(bookId: number, step: string, metadata?: any): Promise<void> {
    await db
      .update(bookProgressHistory)
      .set({
        status: "completed",
        completedAt: new Date(),
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date()
      })
      .where(and(
        eq(bookProgressHistory.bookId, bookId),
        eq(bookProgressHistory.step, step as any)
      ));
  }

  async failProgressStep(bookId: number, step: string, errorMessage: string, metadata?: any): Promise<void> {
    await db
      .update(bookProgressHistory)
      .set({
        status: "failed",
        completedAt: new Date(),
        errorMessage,
        metadata: metadata ? JSON.stringify(metadata) : undefined,
        updatedAt: new Date()
      })
      .where(and(
        eq(bookProgressHistory.bookId, bookId),
        eq(bookProgressHistory.step, step as any)
      ));
  }

  async getBookProgressHistory(bookId: number): Promise<BookProgressHistory[]> {
    const history = await db
      .select()
      .from(bookProgressHistory)
      .where(eq(bookProgressHistory.bookId, bookId))
      .orderBy(bookProgressHistory.startedAt);
    
    return history;
  }

  async getCurrentProgressStep(bookId: number): Promise<BookProgressHistory | undefined> {
    const [currentStep] = await db
      .select()
      .from(bookProgressHistory)
      .where(eq(bookProgressHistory.bookId, bookId))
      .orderBy(desc(bookProgressHistory.startedAt))
      .limit(1);
    
    return currentStep || undefined;
  }

  async cleanupProgressHistoryAfterStep(bookId: number, targetStep: string): Promise<void> {
    // Define step order for comparison
    const stepOrder = [
      "input_validation",
      "database_storage", 
      "github_repository",
      "book_outline",
      "chapter_outlines",
      "content_generation",
      "content_compilation",
      "front_matter_generation"
    ];
    
    // Handle special case where book is already completed
    if (targetStep === "completed") {
      // Book is complete, no cleanup needed
      return;
    }
    
    const targetIndex = stepOrder.indexOf(targetStep);
    if (targetIndex === -1) {
      throw new Error(`Unknown step: ${targetStep}`);
    }
    
    // Get all steps after the target step
    const stepsToDelete = stepOrder.slice(targetIndex + 1);
    
    if (stepsToDelete.length === 0) {
      return; // Nothing to clean up
    }
    
    // Delete progress entries for future steps
    await db.transaction(async (tx) => {
      for (const step of stepsToDelete) {
        await tx
          .delete(bookProgressHistory)
          .where(
            and(
              eq(bookProgressHistory.bookId, bookId),
              eq(bookProgressHistory.step, step as any)
            )
          );
      }
    });
    
    console.log(`Cleaned up future progress entries after step: ${targetStep}`);
  }

  async storeSectionDetails(sectionId: number, details: Array<{personName?: string, businessName?: string, cityName?: string, jobRole?: string, businessType?: string}>): Promise<void> {
    // First, delete existing section details for this section
    await db.delete(sectionDetails).where(eq(sectionDetails.sectionId, sectionId));
    
    // Insert new section details
    for (const detail of details) {
      const insertData: InsertSectionDetail = {
        sectionId,
        personName: detail.personName || null,
        businessName: detail.businessName || null,
        cityName: detail.cityName || null,
        jobRole: detail.jobRole || null,
        businessType: detail.businessType || null
      };
      
      await db.insert(sectionDetails).values(insertData);
    }
  }
  
  async getSectionDetails(sectionId: number): Promise<SectionDetail[]> {
    return await db.select().from(sectionDetails).where(eq(sectionDetails.sectionId, sectionId));
  }
  
  async getBookSectionDetails(bookId: number): Promise<Array<SectionDetail & { sectionId: number; chapterId: number; sectionNumber: number; chapterNumber: number }>> {
    const result = await db
      .select({
        id: sectionDetails.id,
        sectionId: sectionDetails.sectionId,
        personName: sectionDetails.personName,
        businessName: sectionDetails.businessName,
        cityName: sectionDetails.cityName,
        jobRole: sectionDetails.jobRole,
        businessType: sectionDetails.businessType,
        createdAt: sectionDetails.createdAt,
        chapterId: sections.chapterId,
        sectionNumber: sections.sectionNumber,
        chapterNumber: chapters.chapterNumber
      })
      .from(sectionDetails)
      .innerJoin(sections, eq(sectionDetails.sectionId, sections.id))
      .innerJoin(chapters, eq(sections.chapterId, chapters.id))
      .where(eq(chapters.bookId, bookId))
      .orderBy(chapters.chapterNumber, sections.sectionNumber);
    
    return result;
  }

  async deleteBook(bookId: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Delete progress history
      await tx.delete(bookProgressHistory).where(eq(bookProgressHistory.bookId, bookId));
      
      // Delete DeepSeek requests
      await tx.delete(deepseekRequests).where(eq(deepseekRequests.bookId, bookId));
      
      // Get chapters to delete sections
      const bookChapters = await tx
        .select({ id: chapters.id })
        .from(chapters)
        .where(eq(chapters.bookId, bookId));
      
      // Delete section details and sections for each chapter
      for (const chapter of bookChapters) {
        const chapterSections = await tx
          .select({ id: sections.id })
          .from(sections)
          .where(eq(sections.chapterId, chapter.id));
        
        // Delete section details for each section
        for (const section of chapterSections) {
          await tx.delete(sectionDetails).where(eq(sectionDetails.sectionId, section.id));
        }
        
        await tx.delete(sections).where(eq(sections.chapterId, chapter.id));
      }
      
      // Delete chapters
      await tx.delete(chapters).where(eq(chapters.bookId, bookId));
      
      // Delete book-keyword relationships
      await tx.delete(bookKeywords).where(eq(bookKeywords.bookId, bookId));
      
      // Delete book-comparable titles relationships
      await tx.delete(bookComparableTitles).where(eq(bookComparableTitles.bookId, bookId));
      
      // Delete book-author relationships
      await tx.delete(bookAuthors).where(eq(bookAuthors.bookId, bookId));
      
      // Delete GitHub repository record
      await tx.delete(githubRepos).where(eq(githubRepos.bookId, bookId));
      
      // Finally delete the book itself
      await tx.delete(books).where(eq(books.id, bookId));
    });
  }
}

export const storage = new DatabaseStorage();
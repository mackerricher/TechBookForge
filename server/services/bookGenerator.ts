import { storage } from "../storage";
import { GitHubService } from "./github";
import { DeepSeekService } from "./deepseek";
import { ClaudeService } from "./claude";
import { LoggerService } from "./logger";
import { SectionDetailsExtractor } from "./sectionDetailsExtractor";
import type { InsertBook, InsertAuthor, InsertAudience } from "@shared/schema";

export interface BookSpec {
  title: string;
  subtitle?: string;
  description?: string;
  genre?: string;
  specialization?: string;
  key_message: string;
  tone_voice?: string;
  style_guidelines?: {
    reading_level?: string;
    complexity_level?: string;
    preferred_person?: string;
  };
  unique_selling_points?: string[];
  keywords?: string[];
  comparable_titles?: Array<{
    title: string;
    author?: string;
    publisher?: string;
    year?: number;
  }>;
  estimated_word_count: number;
  chapter_count?: number;
  sections_per_chapter?: number;
  language?: string;
  deepseek_model?: string;
  github_repo_visibility?: string;
  author: {
    name: string;
    bio?: string;
    credentials?: string;
    website?: string;
    contact_email?: string;
    social_handles?: Record<string, string>;
  };
  target_audience: {
    persona_name?: string;
    description: string;
    technical_level?: string;
    familiarity_with_topic?: string;
    age_range?: string;
    professional_background?: string;
    primary_goal?: string;
  };
  additional_notes?: string;
  author_snippets?: Record<string, string>;
}

export class BookGeneratorService {
  private github: GitHubService;
  private deepseek: DeepSeekService;
  private claude?: ClaudeService;
  private useClaude: boolean;
  private sectionDetailsExtractor: SectionDetailsExtractor;

  constructor() {
    this.github = new GitHubService();
    this.deepseek = new DeepSeekService();
    this.sectionDetailsExtractor = new SectionDetailsExtractor();
    
    // Initialize Claude service - now required for section drafts and fact-gathering
    try {
      this.claude = new ClaudeService();
      this.useClaude = true;
    } catch (error) {
      console.warn('Claude service initialization failed - Claude 4.0 Sonnet required for section drafts and fact-gathering');
      this.useClaude = false;
    }
  }

  private getAIService() {
    return this.useClaude && this.claude ? this.claude : this.deepseek;
  }

  async startGeneration(bookSpec: BookSpec) {
    let bookId: number | undefined;
    
    try {
      LoggerService.log('info', `Starting book generation: "${bookSpec.title}"`, undefined, 1);
      
      // Step 1: Input Validation & Database Storage
      LoggerService.log('info', 'Step 1: Input validation and database storage', undefined, 1);
      
      bookId = await this.storeBookData(bookSpec);
      
      // Track progress steps
      await storage.startProgressStep(bookId, "input_validation", { title: bookSpec.title });
      await storage.completeProgressStep(bookId, "input_validation", { bookId });
      await storage.startProgressStep(bookId, "database_storage", { bookId });
      await storage.completeProgressStep(bookId, "database_storage", { bookId });
      
      LoggerService.log('success', 'Step 1: Complete', bookId, 1, `Book data successfully stored in database`);
      await storage.addGenerationLog(bookId, "success", "Step 1", "Book data successfully stored in database");
      await storage.updateBookStatus(bookId, "processing");
      
      // Start the generation process (async)
      this.processBookGeneration(bookId, bookSpec).catch(async (error) => {
        if (bookId) {
          LoggerService.log('error', 'Generation process failed', bookId, undefined, (error as any).message);
          await storage.updateBookStatus(bookId, "error");
          await storage.addGenerationLog(bookId, "error", "Generation process failed", `Error: ${(error as any).message}`);
        }
        
        // Mark current step as failed
        if (bookId) {
          const currentStep = await storage.getCurrentProgressStep(bookId);
          if (currentStep && currentStep.status !== "failed") {
            await storage.failProgressStep(bookId, currentStep.step, (error as any).message);
          }
        }
      });

      return { bookId, status: "started" };
    } catch (error) {
      LoggerService.log('error', 'Failed to start book generation', undefined, undefined, `Error: ${(error as any).message}\nStack: ${(error as any).stack}`);
      
      if (bookId) {
        await storage.failProgressStep(bookId, "input_validation", (error as any).message);
      }
      
      throw error;
    }
  }

  async resumeGeneration(bookId: number) {
    // Get book data and current progress
    const book = await storage.getBook(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    // Get GitHub repository info from storage
    const repoData = await storage.getGithubRepo(bookId);
    if (!repoData) {
      throw new Error("No GitHub repository found for this book");
    }

    const repo = {
      owner: repoData.owner,
      name: repoData.repoName,
      url: repoData.url
    };

    LoggerService.log('info', `Analyzing GitHub repository state for resume`, bookId);
    LoggerService.log('info', `Repository: ${repo.owner}/${repo.name}`, bookId);
    LoggerService.log('info', `Repository URL: ${repo.url}`, bookId);
    
    // Analyze actual GitHub state to determine true progress
    const githubState = await this.github.analyzeRepositoryState(repo.owner, repo.name);
    
    LoggerService.log('info', `GitHub analysis complete: ${githubState.recommendation}`, bookId);
    LoggerService.log('info', `Next file to create: ${githubState.nextFile}`, bookId);
    
    // Compare with BookProgressHistory for validation
    const currentStep = await storage.getCurrentProgressStep(bookId);
    if (currentStep && currentStep.step !== githubState.step && githubState.step !== "completed") {
      LoggerService.log('warning', `Progress history mismatch detected`, bookId, undefined, 
        `Database shows: ${currentStep.step}, GitHub shows: ${githubState.step}`);
      
      // Clean up future progress entries that are ahead of GitHub reality
      await storage.cleanupProgressHistoryAfterStep(bookId, githubState.step);
      
      // Update progress history to match GitHub reality
      await storage.startProgressStep(bookId, githubState.step, { 
        syncedFromGitHub: true, 
        previousStep: currentStep.step,
        githubAnalysis: githubState.recommendation
      });
    }

    // Get book specification data from database
    const spec = await this.reconstructBookSpec(bookId);
    
    // Handle special case for completed books - but verify front matter actually exists
    if (githubState.step === "completed") {
      try {
        // Double-check that front_matter.md actually exists
        const frontMatterFile = await this.github.getFile(repo.owner, repo.name, "front_matter.md");
        if (frontMatterFile && 'content' in frontMatterFile) {
          LoggerService.log('success', 'Book generation already completed', bookId);
          await storage.updateBookStatus(bookId, "completed");
          await storage.addGenerationLog(bookId, "success", "Book generation completed", "All steps completed successfully");
          
          // Complete the current progress step if it exists
          if (currentStep && currentStep.status !== "completed") {
            await storage.completeProgressStep(bookId, currentStep.step, { 
              verifiedComplete: true,
              frontMatterExists: true 
            });
          }
          
          return {
            resumedFromStep: "completed",
            githubAnalysis: "Book generation already completed",
            syncRequired: false
          };
        } else {
          // Front matter reported as existing but file not found - force regeneration
          LoggerService.log('warning', 'Front matter file missing despite analysis', bookId);
          githubState.step = "front_matter_generation";
          githubState.recommendation = "Regenerate missing front matter";
        }
      } catch (error) {
        // Front matter doesn't exist - need to generate it
        LoggerService.log('warning', 'Front matter verification failed', bookId, undefined, (error as any).message);
        githubState.step = "front_matter_generation";
        githubState.recommendation = "Generate missing front matter";
      }
    }

    // Continue processing from GitHub-determined step
    this.processBookGenerationFromStep(bookId, spec, githubState.step).catch(async (error) => {
      LoggerService.log('error', 'Resume generation process failed', bookId, undefined, (error as any).message);
      await storage.updateBookStatus(bookId, "error");
      await storage.failProgressStep(bookId, githubState.step, (error as any).message);
    });
    
    return { 
      success: true, 
      bookId, 
      resumedFromStep: githubState.step,
      githubAnalysis: githubState,
      syncRequired: currentStep?.step !== githubState.step
    };
  }

  private async reconstructBookSpec(bookId: number): Promise<BookSpec> {
    const book = await storage.getBook(bookId);
    if (!book) {
      throw new Error("Book not found");
    }

    // Always use standardized tone for consistency
    const standardToneVoice = `Write as one who has a seamless blend of three archetypes: **PersonA** — intensely private, profoundly empathetic; meticulous, quietly humble, artisanal precision. **PersonB** — effortlessly charming, Midwestern warmth, humble with polished poise. **PersonC** — fiercely intelligent, contrarian, street-wise savant; guarded skepticism, razor-sharp insight and fighter against injustice. And blend all three personas into a single one with the congenial grace and confidence of a person who has seen it all but remains optimistic, someone who speaks truth with gentleness but without compromise.`;

    // Reconstruct BookSpec from database data
    const bookSpec: BookSpec = {
      title: book.title,
      subtitle: book.subtitle || undefined,
      description: book.description || undefined,
      genre: book.genre || undefined,
      key_message: book.keyMessage || "",
      tone_voice: standardToneVoice, // Always use standardized tone
      style_guidelines: book.styleGuidelines || undefined,
      estimated_word_count: book.estimatedWordCount ?? 42000,
      chapter_count: book.chapterCount || 21,
      sections_per_chapter: book.sectionsPerChapter || 8,
      language: book.language || "English",
      deepseek_model: book.deepseekModel || "deepseek-reasoner",
      author: {
        name: "Retrieved Author",
        bio: undefined,
      },
      target_audience: {
        description: "Retrieved Audience",
      },
      additional_notes: book.additionalNotes || undefined,
    };

    return bookSpec;
  }

  private async processBookGenerationFromStep(bookId: number, bookSpec: BookSpec, currentStep: string) {
    await storage.updateBookStatus(bookId, "generating");
    
    // Get GitHub repo info from database
    const repoData = await storage.getGithubRepo(bookId);
    let repo: any = null;
    
    if (repoData) {
      // Use stored repository information
      repo = {
        owner: repoData.owner,
        name: repoData.repoName,
        url: repoData.url
      };
    } else {
      throw new Error("No GitHub repository found for this book - cannot continue generation");
    }

    try {
      // Resume from specific step (streamlined 6-step workflow)
      switch (currentStep) {
        case "github_repository":
          // Skip - already done, move to next
          await storage.completeProgressStep(bookId, "github_repository", { resumed: true });
          await this.continueFromBookOutline(bookId, bookSpec, repo);
          break;
          
        case "book_outline":
          await this.continueFromBookOutline(bookId, bookSpec, repo);
          break;
          
        case "content_generation":
          await this.continueFromContentGeneration(bookId, bookSpec, repo);
          break;
          
        case "content_compilation":
          await this.continueFromContentCompilation(bookId, repo);
          break;
          
        case "front_matter_generation":
          await this.continueFromFrontMatter(bookId, bookSpec, repo);
          break;
          
        default:
          throw new Error(`Unknown step: ${currentStep}`);
      }
    } catch (error) {
      LoggerService.log('error', 'Step continuation failed', bookId, undefined, (error as any).message);
      await storage.updateBookStatus(bookId, "error");
      throw error;
    }
  }

  private async continueFromBookOutline(bookId: number, bookSpec: BookSpec, repo: any) {
    // Step 3: Generate book outline
    await storage.startProgressStep(bookId, "book_outline", { title: bookSpec.title });
    LoggerService.log('info', 'Generating book outline with Claude Sonnet 4', bookId, 3);
    
    const bookOutline = await this.claude.generateBookOutline(bookSpec);
    LoggerService.log('success', 'Book outline generated', bookId, 3, `${bookOutline.length} characters`);
    
    await this.github.createFile(repo.owner, repo.name, "main_outline.md", bookOutline, "Add main book outline");
    await storage.completeProgressStep(bookId, "book_outline", { outlineLength: bookOutline.length });

    // Skip chapter and section outlines - go directly to content generation
    await this.continueFromContentGeneration(bookId, bookSpec, repo);
  }



  private async createChapterAndSectionEntries(bookId: number, bookSpec: BookSpec) {
    const chapterCount = bookSpec.chapter_count || 21;
    const sectionsPerChapter = bookSpec.sections_per_chapter || 8;
    
    for (let i = 1; i <= chapterCount; i++) {
      const chapterTitle = `Chapter ${i}`;
      
      // Check if chapter already exists
      const existingChapters = await storage.getBookChapters(bookId);
      const existingChapter = existingChapters.find(ch => ch.chapterNumber === i);
      
      let chapter;
      if (existingChapter) {
        chapter = existingChapter;
      } else {
        chapter = await storage.createChapter(bookId, i, chapterTitle, ""); // No outline file
      }
      
      // Create sections for this chapter
      for (let j = 1; j <= sectionsPerChapter; j++) {
        const sectionTitle = `Section ${j}`;
        
        // Check if section already exists
        const existingSections = await storage.getChapterSections(chapter.id);
        const existingSection = existingSections.find(s => s.sectionNumber === j);
        
        if (!existingSection) {
          await storage.createSection(chapter.id, j, sectionTitle, ""); // No outline file
        }
      }
    }
  }

  private async continueFromContentGeneration(bookId: number, bookSpec: BookSpec, repo: any) {
    await storage.startProgressStep(bookId, "content_generation", { totalSections: (bookSpec.chapter_count || 21) * (bookSpec.sections_per_chapter || 8) });
    
    const bookOutlineFile = await this.github.getFile(repo.owner, repo.name, "main_outline.md");
    const bookOutline = bookOutlineFile?.content || "";
    
    // Create database entries for chapters and sections based on book spec
    await this.createChapterAndSectionEntries(bookId, bookSpec);
    
    await this.generateSectionContent(bookId, bookSpec, repo, bookOutline);
    await storage.completeProgressStep(bookId, "content_generation", { completed: true });

    // Continue to compilation
    await this.continueFromContentCompilation(bookId, repo);
  }

  private async continueFromContentCompilation(bookId: number, repo: any) {
    await storage.startProgressStep(bookId, "content_compilation", {});
    LoggerService.log('info', 'Starting content compilation', bookId, 7);
    
    await this.compileBookContent(bookId, repo);
    await storage.completeProgressStep(bookId, "content_compilation", { compiledFile: "content_draft.md" });

    // Continue to front matter
    const bookSpec = await this.reconstructBookSpec(bookId);
    await this.continueFromFrontMatter(bookId, bookSpec, repo);
  }

  private async continueFromFrontMatter(bookId: number, bookSpec: BookSpec, repo: any) {
    await storage.startProgressStep(bookId, "front_matter_generation", {});
    LoggerService.log('info', 'Starting front matter generation', bookId, 8);
    
    await this.generateFrontMatter(bookId, bookSpec, repo);
    await storage.completeProgressStep(bookId, "front_matter_generation", { frontMatterFile: "front_matter.md" });

    // Mark as completed
    LoggerService.log('success', 'Book generation completed successfully', bookId, 10);
    await storage.updateBookStatus(bookId, "completed");
    await storage.addGenerationLog(bookId, "success", "Book generation completed", "All steps completed successfully");
  }

  private async storeBookData(bookSpec: BookSpec): Promise<number> {
    // Create audience
    const audienceData: InsertAudience = {
      personaName: bookSpec.target_audience.persona_name,
      description: bookSpec.target_audience.description,
      technicalLevel: bookSpec.target_audience.technical_level,
      familiarity: bookSpec.target_audience.familiarity_with_topic,
      ageRange: bookSpec.target_audience.age_range,
      professionalBackground: bookSpec.target_audience.professional_background,
      primaryGoal: bookSpec.target_audience.primary_goal
    };
    const audience = await storage.createAudience(audienceData);

    // Create author
    const authorData: InsertAuthor = {
      name: bookSpec.author.name,
      bio: bookSpec.author.bio,
      credentials: bookSpec.author.credentials,
      website: bookSpec.author.website,
      contactEmail: bookSpec.author.contact_email,
      socialHandles: bookSpec.author.social_handles
    };
    const author = await storage.createAuthor(authorData);

    // Always use standardized tone for consistency
    const standardToneVoice = `Write as one who has a seamless blend of three archetypes: **PersonA** — intensely private, profoundly empathetic; meticulous, quietly humble, artisanal precision. **PersonB** — effortlessly charming, Midwestern warmth, humble with polished poise. **PersonC** — fiercely intelligent, contrarian, street-wise savant; guarded skepticism, razor-sharp insight and fighter against injustice. And blend all three personas into a single one with the congenial grace and confidence of a person who has seen it all but remains optimistic, someone who speaks truth with gentleness but without compromise.`;

    // Create book
    const bookData: InsertBook = {
      title: bookSpec.title,
      subtitle: bookSpec.subtitle,
      description: bookSpec.description,
      genre: bookSpec.genre || "non-fiction",
      specialization: bookSpec.specialization,
      keyMessage: bookSpec.key_message,
      toneVoice: standardToneVoice, // Always use standardized tone
      styleGuidelines: bookSpec.style_guidelines,
      estimatedWordCount: bookSpec.estimated_word_count || 420000,
      chapterCount: bookSpec.chapter_count || 21,
      sectionsPerChapter: bookSpec.sections_per_chapter || 8,
      deepseekModel: bookSpec.deepseek_model || "deepseek-chat",
      audienceId: audience.id,
      language: bookSpec.language || "en",
      additionalNotes: bookSpec.additional_notes
    };
    const book = await storage.createBook(bookData);

    // Link author to book
    await storage.linkAuthorToBook(book.id, author.id, "primary", true);

    // Store keywords
    if (bookSpec.keywords) {
      await storage.storeBookKeywords(book.id, bookSpec.keywords);
    }

    // Store comparable titles
    if (bookSpec.comparable_titles) {
      await storage.storeComparableTitles(book.id, bookSpec.comparable_titles);
    }

    return book.id;
  }

  private async processBookGeneration(bookId: number, bookSpec: BookSpec) {
    try {
      // Step 2: Create GitHub repository
      await storage.startProgressStep(bookId, "github_repository", { title: bookSpec.title });
      LoggerService.log('info', 'Creating GitHub repository', bookId, 2);
      await storage.addGenerationLog(bookId, "info", "Step 2: Creating GitHub repository", `Repository for: "${bookSpec.title}"`);
      
      const repo = await this.github.createRepository(
        bookSpec.title,
        bookSpec.description || `Non-fiction book: ${bookSpec.title}`,
        bookSpec.github_repo_visibility === "private"
      );
      
      LoggerService.log('success', 'GitHub repository created', bookId, 2, repo.url);
      await storage.storeGithubRepo(bookId, repo);
      await storage.addGenerationLog(bookId, "success", "Step 2: GitHub repository created", `URL: ${repo.url}`);
      await storage.completeProgressStep(bookId, "github_repository", { repoUrl: repo.url, repoName: repo.name });

      // Step 3: Generate book outline
      await storage.startProgressStep(bookId, "book_outline", { title: bookSpec.title });
      LoggerService.log('info', 'Generating book outline with Claude Sonnet 4', bookId, 3);
      await storage.addGenerationLog(bookId, "info", "Step 3: Generating book outline", "Using Claude Sonnet 4 to create comprehensive book structure");
      
      const bookOutline = await this.claude.generateBookOutline(bookSpec);
      LoggerService.log('success', 'Book outline generated', bookId, 3, `${bookOutline.length} characters`);
      
      await this.github.createFile(repo.owner, repo.name, "main_outline.md", bookOutline, "Add main book outline");
      
      await storage.addGenerationLog(bookId, "success", "Step 3: Book outline generated", "Main structure created and saved to repository");
      await storage.completeProgressStep(bookId, "book_outline", { outlineLength: bookOutline.length, filePath: "main_outline.md" });

      // Step 4: Generate section content (streamlined workflow)
      const chapterCount = bookSpec.chapter_count || 8;
      try {
        console.log(`🔵 [Book ${bookId}] Starting Step 4: Content Generation (${chapterCount} chapters, ${bookSpec.sections_per_chapter || 8} sections each)`);
        
        await storage.startProgressStep(bookId, "content_generation", { totalSections: chapterCount * (bookSpec.sections_per_chapter || 8) });
        LoggerService.log('info', 'Starting section content generation', bookId, 4);
        await storage.addGenerationLog(bookId, "info", "Step 4: Generating section content", "Creating detailed content for all sections");
        
        // Create database entries for chapters and sections based on book spec
        console.log(`🔵 [Book ${bookId}] Creating chapter and section entries...`);
        await this.createChapterAndSectionEntries(bookId, bookSpec);
        console.log(`🔵 [Book ${bookId}] Chapter and section entries created successfully`);
        
        console.log(`🔵 [Book ${bookId}] Starting section content generation...`);
        await this.generateSectionContent(bookId, bookSpec, repo, bookOutline);
        console.log(`🔵 [Book ${bookId}] Section content generation completed`);
        
        await storage.addGenerationLog(bookId, "success", "Step 4: Section content generated", "All section drafts created with Claude");
        LoggerService.log('success', 'Section content generation completed', bookId, 4, `${chapterCount} chapters with ${bookSpec.sections_per_chapter || 8} sections each`);
      } catch (error) {
        console.error(`❌ [Book ${bookId}] Error in Step 4 (Content Generation):`, error);
        await storage.addGenerationLog(bookId, "error", "Step 4 failed", `Content generation error: ${error.message}`);
        await storage.failProgressStep(bookId, "content_generation", error.message);
        throw error; // Re-throw to trigger main error handler
      }

      await storage.completeProgressStep(bookId, "content_generation", { chaptersCompleted: chapterCount, totalSections: chapterCount * (bookSpec.sections_per_chapter || 8) });

      // Step 5: Compile all content into single file
      await storage.startProgressStep(bookId, "content_compilation", { totalChapters: chapterCount });
      LoggerService.log('info', 'Starting content compilation', bookId, 5);
      await storage.addGenerationLog(bookId, "info", "Step 5: Compiling complete book", "Stitching all sections into single content_draft.md file");
      
      await this.compileBookContent(bookId, repo);
      
      LoggerService.log('success', 'Content compilation completed', bookId, 5);
      await storage.completeProgressStep(bookId, "content_compilation", { compiledFile: "content_draft.md" });

      // Step 6: Generate front matter
      await storage.startProgressStep(bookId, "front_matter_generation", { includesPreface: true, includesIntroduction: true, includesTableOfContents: true });
      LoggerService.log('info', 'Starting front matter generation', bookId, 6);
      await storage.addGenerationLog(bookId, "info", "Step 6: Generating front matter", "Creating preface, introduction, and table of contents");
      
      await this.generateFrontMatter(bookId, bookSpec, repo);
      
      LoggerService.log('success', 'Front matter generation completed', bookId, 6);
      await storage.completeProgressStep(bookId, "front_matter_generation", { frontMatterFile: "front_matter.md" });

      LoggerService.log('success', 'Book generation completed successfully', bookId, 10, `${chapterCount} chapters generated with front matter`);
      await storage.updateBookStatus(bookId, "completed");
      await storage.addGenerationLog(bookId, "success", "Book generation completed", `All ${chapterCount} chapters with content, compilation, and front matter generated successfully`);

    } catch (error) {
      LoggerService.log('error', 'Book generation failed', bookId, undefined, (error as any).message);
      await storage.updateBookStatus(bookId, "error");
      await storage.addGenerationLog(bookId, "error", "Generation process failed", `Error: ${(error as any).message}`);
    }
  }

  private async generateSectionContent(bookId: number, bookSpec: BookSpec, repo: any, bookOutline: string) {
    const chapters = await storage.getBookChapters(bookId);
    const allPreviousSummaries: string[] = []; // Accumulate ALL previous summaries from section drafts
    
    // Load existing summaries from GitHub repository (generated from section drafts)
    LoggerService.log('info', 'Loading existing summaries from repository', bookId, 6, 'Checking for previously generated summaries');
    for (const chapter of chapters) {
      const sections = await storage.getChapterSections(chapter.id);
      for (const section of sections) {
        const summaryFileName = `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_summary.md`;
        try {
          const existingSummary = await this.github.getFile(repo.owner, repo.name, summaryFileName);
          if (existingSummary?.content) {
            allPreviousSummaries.push(`Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}: ${existingSummary.content}`);
            LoggerService.log('info', `Loaded existing summary for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 6);
          }
        } catch (error) {
          // Summary doesn't exist yet, which is fine - will be generated after section draft
        }
      }
    }
    
    LoggerService.log('info', `Loaded ${allPreviousSummaries.length} existing summaries from repository`, bookId, 6, 'Ready to use for context');
    
    // Generate section drafts sequentially, creating summaries AFTER each draft
    let globalSectionIndex = 0;
    for (const chapter of chapters) {
      const sections = await storage.getChapterSections(chapter.id);

      for (const section of sections) {
        const draftFileName = `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_draft.md`;
        
        // Check if section draft already exists
        try {
          const existingDraft = await this.github.getFile(repo.owner, repo.name, draftFileName);
          if (existingDraft?.content) {
            LoggerService.log('info', `Skipping existing draft: Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 7);
            
            // If we already have a summary for this section, it should be in allPreviousSummaries
            // If not, generate one from the existing draft
            const summaryFileName = `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_summary.md`;
            const existingSummaryIndex = allPreviousSummaries.findIndex(s => s.startsWith(`Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}:`));
            
            if (existingSummaryIndex === -1) {
              // Generate summary from existing draft
              try {
                const summaryFromDraft = await this.deepseek.generateContent(
                  `Create a comprehensive single-paragraph summary (4-6 sentences) of this section based on its actual content:

Section: Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}
Section Content:
${existingDraft.content}

Generate a detailed summary that captures the main topics covered, key concepts explained, practical applications provided, and important takeaways. This summary will be used to provide context for subsequent sections.

Focus on what was actually covered in the content, not what was planned. Include specific details that would help maintain narrative consistency across the book.`,
                  "deepseek-reasoner"
                );
                
                await this.github.createFile(repo.owner, repo.name, summaryFileName, summaryFromDraft, `Add Chapter ${chapter.chapterNumber} Section ${section.sectionNumber} summary`);
                await storage.updateSectionSummaryPath(section.id, summaryFileName);
                allPreviousSummaries.push(`Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}: ${summaryFromDraft}`);
                
                LoggerService.log('success', `Summary generated from existing draft for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 7);
              } catch (error) {
                console.error(`Error generating summary from existing draft for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}:`, error);
              }
            }
            
            globalSectionIndex++;
            continue;
          }
        } catch (error) {
          // Draft doesn't exist, continue to generate
        }
        
        try {
          // Generate section draft
          LoggerService.log('info', `Writing Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 7, 'Creating detailed content with accumulated context');
          await storage.addGenerationLog(bookId, "info", `Writing Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}...`, "Creating detailed content with accumulated previous summaries");
          
          // Get section details context for consistency
          const sectionDetailsContext = await this.sectionDetailsExtractor.formatPreviousSectionDetailsForPrompt(
            bookId, 
            chapter.chapterNumber, 
            section.sectionNumber
          );

          // Generate section draft using Claude with accumulated previous summaries
          LoggerService.log('info', `Writing section with Claude`, bookId, 7, `Using ${allPreviousSummaries.length} previous summaries for context`);
          await storage.addGenerationLog(bookId, "info", `Creating section draft...`, `Using Claude with accumulated context: ${allPreviousSummaries.length} previous summaries`);
          
          if (!this.claude) {
            throw new Error('Claude service not available - hybrid workflow requires Claude API key');
          }
          
          // Check for author snippets and prepare replacement function
          const processAuthorSnippets = (content: string): string => {
            if (!bookSpec.author_snippets) return content;
            
            let processedContent = content;
            const snippetRegex = /{{AUTHOR_NOTE:([^}]+)}}/g;
            
            processedContent = processedContent.replace(snippetRegex, (match, identifier) => {
              const snippet = bookSpec.author_snippets?.[identifier];
              if (snippet) {
                console.log(`🖊️  Replacing author snippet: ${identifier}`);
                return snippet;
              }
              console.warn(`⚠️  Author snippet not found: ${identifier}`);
              return match; // Keep original if not found
            });
            
            return processedContent;
          };

          // Get number of draft variants from environment
          const draftVariants = parseInt(process.env.DRAFT_VARIANTS || '1');
          const variants: string[] = [];
          
          // Generate multiple draft variants
          for (let variant = 1; variant <= draftVariants; variant++) {
            console.log(`🎯 Generating draft variant ${variant}/${draftVariants}`);
            
            let sectionDraft = await this.claude.generateSectionDraft(
              bookSpec,
              bookOutline, // Complete book outline (removed redundancy)
              [], // No facts - removed fact-gathering system
              allPreviousSummaries, // ALL previous section summaries for context
              [], // No subsequent summaries (generated after drafts)
              chapter.chapterNumber, // Current chapter number
              section.sectionNumber, // Current section number
              bookSpec.chapter_count || 21, // Total chapters
              bookSpec.sections_per_chapter || 8, // Sections per chapter
              sectionDetailsContext, // Section details for consistency
              bookId // Pass bookId for dynamic name tracking
            );
            
            // Process author snippets in the draft
            sectionDraft = processAuthorSnippets(sectionDraft);
            
            variants.push(sectionDraft);
            
            // Create variant file
            const variantFileName = `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_draft_v${variant}.md`;
            await this.github.createFile(repo.owner, repo.name, variantFileName, sectionDraft, `Add Chapter ${chapter.chapterNumber} Section ${section.sectionNumber} draft variant ${variant}`);
            
            LoggerService.log('success', `Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber} draft variant ${variant} generated`, bookId, 8, `${sectionDraft.length} characters`);
          }
          
          // Create variants README
          const variantsReadme = `# Draft Variants for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}

This section has been generated with ${draftVariants} different variants to give you options:

${variants.map((_, index) => `- **Variant ${index + 1}**: \`chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_draft_v${index + 1}.md\``).join('\n')}

## How to Choose:
1. Review each variant for tone, content depth, and style
2. Pick the one that best fits your book's flow
3. You can also merge elements from different variants
4. Replace the main draft file with your chosen version

## Next Steps:
- Copy your preferred variant to: \`chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_draft.md\`
- Or merge multiple variants into a custom version
- The book compilation process will use the main draft file`;
          
          await this.github.createFile(repo.owner, repo.name, `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_variants_README.md`, variantsReadme, `Add variants README for Chapter ${chapter.chapterNumber} Section ${section.sectionNumber}`);
          
          // Use the first variant as the default for system processing
          const defaultDraft = variants[0];
          await this.github.createFile(repo.owner, repo.name, draftFileName, defaultDraft, `Add Chapter ${chapter.chapterNumber} Section ${section.sectionNumber} draft (default from variant 1)`);
          
          await storage.updateSectionDraftPath(section.id, draftFileName);
          // Note: Section drafts are generated by Claude, summaries by DeepSeek
          await storage.recordDeepseekRequest(bookId, chapter.id, section.id, "section_draft", `Generated draft for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber} (Claude)`, draftFileName);

          // Extract section details for consistency tracking
          try {
            await this.sectionDetailsExtractor.extractSectionDetails(section.id, defaultDraft);
            LoggerService.log('info', `Section details extracted for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 7);
          } catch (error) {
            console.error(`Error extracting section details for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}:`, error);
            // Continue without failing the whole process
          }

          // Generate summary from the section draft for next sections' context
          try {
            // Get the just-extracted section details to include in summary
            const extractedDetails = await storage.getSectionDetails(section.id);
            const detailsText = extractedDetails.length > 0 
              ? extractedDetails.map(detail => {
                  const parts = [];
                  if (detail.personName) parts.push(`Person: ${detail.personName}`);
                  if (detail.businessName) parts.push(`Business: ${detail.businessName}`);
                  if (detail.cityName) parts.push(`City: ${detail.cityName}`);
                  if (detail.jobRole) parts.push(`Role: ${detail.jobRole}`);
                  if (detail.businessType) parts.push(`Industry: ${detail.businessType}`);
                  return parts.join(', ');
                }).join('; ')
              : "No specific details extracted";

            const summaryFromDraft = await this.deepseek.generateContent(
              `Create a comprehensive single-paragraph summary (4-6 sentences) of this section based on its actual content:

Section: Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}

Section Content:
${defaultDraft}

Extracted Section Details:
${detailsText}

Generate a detailed summary that captures the main topics covered, key concepts explained, practical applications provided, and important takeaways. This summary will be used to provide context for subsequent sections.

IMPORTANT: Include the specific details (names, businesses, cities, roles, industries) that were mentioned in the section content. This helps maintain narrative consistency across the book. Focus on what was actually covered in the content, not what was planned.`,
              "deepseek-reasoner"
            );
            
            const summaryFileName = `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_summary.md`;
            await this.github.createFile(repo.owner, repo.name, summaryFileName, summaryFromDraft, `Add Chapter ${chapter.chapterNumber} Section ${section.sectionNumber} summary`);
            
            await storage.updateSectionSummaryPath(section.id, summaryFileName);
            
            // Add to accumulating previous summaries for next sections
            allPreviousSummaries.push(`Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}: ${summaryFromDraft}`);
            
            LoggerService.log('success', `Summary generated from draft for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, bookId, 7);
            
          } catch (error) {
            console.error(`Error generating summary for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}:`, error);
            // Continue without failing the whole process
          }
          
          await storage.addGenerationLog(bookId, "success", `Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber} completed`, `Content and summary generated with ${allPreviousSummaries.length} accumulated summaries`);

          globalSectionIndex++;

        } catch (error) {
          console.error(`Error generating content for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}:`, error);
          await storage.addGenerationLog(bookId, "error", `Failed to generate Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`, (error as any).message);
          globalSectionIndex++;
        }
      }
    }
  }

  private async compileBookContent(bookId: number, repo: any) {
    try {
      // Get all chapters and sections for the book
      const chapters = await storage.getBookChapters(bookId);
      
      // Build the structure needed for compilation
      const chapterData = [];
      for (const chapter of chapters) {
        const sections = await storage.getChapterSections(chapter.id);
        const sectionData = sections.map(section => ({
          sectionNumber: section.sectionNumber,
          draftPath: section.draftPath || `chapter_${chapter.chapterNumber}_section_${section.sectionNumber}_draft.md`
        }));
        
        chapterData.push({
          chapterNumber: chapter.chapterNumber,
          sections: sectionData
        });
      }
      
      // Use GitHub service to compile all content into single file
      const compiledFilePath = await this.github.compileBookContent(repo.owner, repo.name, chapterData);
      
      LoggerService.log('success', 'Book content compiled successfully', bookId, 7, `Created ${compiledFilePath}`);
      await storage.addGenerationLog(bookId, "success", "Content compilation complete", `All sections compiled into ${compiledFilePath}`);
      
    } catch (error) {
      LoggerService.log('error', 'Content compilation failed', bookId, 7, (error as any).message);
      await storage.addGenerationLog(bookId, "error", "Content compilation failed", `Error: ${(error as any).message}`);
      throw error;
    }
  }

  private async generateFrontMatter(bookId: number, bookSpec: BookSpec, repo: any) {
    try {
      LoggerService.log('info', 'Generating front matter', bookId, 8, 'Creating preface, introduction, and table of contents');
      await storage.addGenerationLog(bookId, "info", "Generating front matter...", "Creating preface, introduction, and table of contents");

      // Get book outline
      const bookOutlineFile = await this.github.getFile(repo.owner, repo.name, "main_outline.md");
      if (!bookOutlineFile || !('content' in bookOutlineFile)) {
        throw new Error("Book outline not found");
      }

      // Get all section summaries for context
      const chapters = await storage.getBookChapters(bookId);
      const allSummaries: string[] = [];
      
      for (const chapter of chapters) {
        const sections = await storage.getChapterSections(chapter.id);
        for (const section of sections) {
          if (section.summaryPath) {
            try {
              const summaryFile = await this.github.getFile(repo.owner, repo.name, section.summaryPath);
              if (summaryFile && 'content' in summaryFile) {
                allSummaries.push(`Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}: ${summaryFile.content}`);
              }
            } catch (error) {
              console.warn(`Could not fetch summary for Chapter ${chapter.chapterNumber}, Section ${section.sectionNumber}`);
            }
          }
        }
      }

      // Generate front matter using DeepSeek reasoner
      const frontMatter = await this.deepseek.generateFrontMatter(
        bookSpec, 
        bookOutlineFile.content, 
        allSummaries
      );

      // Create front matter file
      const frontMatterPath = "front_matter.md";
      await this.github.createFile(repo.owner, repo.name, frontMatterPath, frontMatter, "Add book front matter with preface and introduction");
      
      // Try to record DeepSeek request, but don't fail if enum issue occurs
      try {
        await storage.recordDeepseekRequest(bookId, null, null, "front_matter", "Generated front matter with preface, introduction, and table of contents", frontMatterPath);
      } catch (enumError) {
        console.warn('Non-critical enum error when recording DeepSeek request:', (enumError as any).message);
        LoggerService.log('warning', 'Database enum issue (non-critical)', bookId, 8, 'Front matter file created successfully despite database logging error');
      }

      LoggerService.log('success', 'Front matter generated successfully', bookId, 8, `${frontMatter.length} characters`);
      await storage.addGenerationLog(bookId, "success", "Front matter generation complete", `Created ${frontMatterPath} with preface, introduction, and table of contents`);
      
    } catch (error) {
      LoggerService.log('error', 'Front matter generation failed', bookId, 8, (error as any).message);
      await storage.addGenerationLog(bookId, "error", "Front matter generation failed", `Error: ${(error as any).message}`);
      throw error;
    }
  }
}

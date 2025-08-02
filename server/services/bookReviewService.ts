import { ClaudeService } from './claude';
import { GitHubService } from './github';

export class BookReviewService {
  private claude: ClaudeService;
  private github: GitHubService;

  constructor() {
    this.claude = new ClaudeService();
    this.github = new GitHubService();
  }

  async reviewBook(bookTitle: string, bookContent: string): Promise<{ repoUrl: string; reviewContent: string; repoOwner: string; repoName: string }> {
    // Create GitHub repository for the review
    const sanitizedTitle = this.sanitizeRepoName(bookTitle);
    const repoName = `${sanitizedTitle}-review-${Date.now()}`;
    
    const repo = await this.github.createRepository(
      repoName,
      `Book review for: ${bookTitle}`,
      true // private repository
    );

    // Add the original book to the repository first
    await this.github.createFile(
      repo.owner,
      repo.name,
      'original_book.md',
      bookContent,
      'Add original book manuscript for review'
    );

    // Generate comprehensive book review using Claude Sonnet 4
    const reviewContent = await this.claude.generateBookReview(bookTitle, bookContent);

    // Save the review to the repository
    await this.github.createFile(
      repo.owner,
      repo.name,
      'book_review.md',
      reviewContent,
      'Add comprehensive book review analysis'
    );

    return {
      repoUrl: repo.url,
      reviewContent,
      repoOwner: repo.owner,
      repoName: repo.name
    };
  }



  private sanitizeRepoName(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s\-\.]/g, '') // Keep only ASCII letters, digits, spaces, hyphens, periods
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/--+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
      .substring(0, 50); // Limit length
  }

  async rewriteBook(bookTitle: string, originalBookContent: string, reviewContent: string, repoOwner: string, repoName: string, toneVoice?: string): Promise<{ repoUrl: string; rewrittenContent: string }> {
    // Generate rewritten book using Claude Sonnet 4 with high token limit
    const rewrittenContent = await this.claude.rewriteBookFromReview(bookTitle, originalBookContent, reviewContent, toneVoice);

    // Save the rewritten book to the repository
    await this.github.createFile(
      repoOwner,
      repoName,
      'rewritten_book.md',
      rewrittenContent,
      'Add Claude-rewritten book based on review recommendations'
    );

    const repoUrl = `https://github.com/${repoOwner}/${repoName}`;

    return {
      repoUrl,
      rewrittenContent
    };
  }
}
import { Octokit } from "@octokit/rest";

export class GitHubService {
  private octokit: Octokit;

  constructor() {
    const token = process.env.GITHUB_API_KEY || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error("GitHub API key not found in environment variables");
    }
    
    this.octokit = new Octokit({
      auth: token,
    });
  }

  // Utility to generate valid GitHub repository names
  static generateRepoName(title: string, timestamp?: number): string {
    const ts = timestamp || Date.now();
    const baseName = title.toLowerCase()
      .replace(/[^a-z0-9.\-_]/g, '-')  // Only allow ASCII letters, digits, ., -, _
      .replace(/^[-._]+|[-._]+$/g, '') // Remove leading/trailing special chars
      .replace(/[-._]{2,}/g, '-');     // Replace multiple consecutive special chars with single dash
    
    // Keep repository names at 50 characters or less
    const maxNameLength = 37; // Leave room for timestamp suffix (13 chars)
    const truncatedBaseName = baseName.length > maxNameLength 
      ? baseName.substring(0, maxNameLength) 
      : baseName;
    
    return `${truncatedBaseName}-${ts}`;
  }

  async createRepository(name: string, description: string, isPrivate: boolean = true) {
    try {
      // Generate valid repository name using utility function
      const repoName = GitHubService.generateRepoName(name);
      
      // Keep descriptions at 50 characters or less
      const maxDescriptionLength = 50;
      const truncatedDescription = description.length > maxDescriptionLength
        ? description.substring(0, 47) + "..."
        : description;
      
      console.log(`Creating GitHub repository: ${repoName} (${repoName.length} chars)`);
      console.log(`Description length: ${truncatedDescription.length} chars`);
      
      const response = await this.octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description: truncatedDescription,
        private: isPrivate,
        auto_init: true
      });

      console.log(`GitHub repository created successfully: ${response.data.html_url}`);

      return {
        id: response.data.id,
        name: response.data.name,
        fullName: response.data.full_name,
        url: response.data.html_url,
        cloneUrl: response.data.clone_url,
        owner: response.data.owner.login
      };
    } catch (error) {
      console.error("GitHub repository creation error:", error);
      throw new Error(`Failed to create GitHub repository: ${(error as any).message}`);
    }
  }

  async createFile(owner: string, repo: string, path: string, content: string, message: string, branch: string = "main") {
    try {
      // Try to create the file first (for new files)
      try {
        console.log(`🔵 [GitHub] Attempting to create new file: ${path}`);
        const response = await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          branch
        });
        console.log(`🔵 [GitHub] Successfully created new file ${path}`);
        return response.data;
      } catch (createError: any) {
        // If file already exists (422 error), get its SHA and update
        if (createError.status === 422 && createError.message.includes("sha")) {
          console.log(`🔵 [GitHub] File ${path} exists, getting SHA for update`);
          
          try {
            const existingFile = await this.octokit.repos.getContent({
              owner,
              repo,
              path,
              ref: branch
            });
            
            let sha: string | undefined;
            if (!Array.isArray(existingFile.data) && 'sha' in existingFile.data) {
              sha = (existingFile.data as any).sha;
              console.log(`🔵 [GitHub] Retrieved SHA for ${path}: ${sha?.substring(0, 8)}...`);
              
              // Now update the file with the SHA
              const response = await this.octokit.repos.createOrUpdateFileContents({
                owner,
                repo,
                path,
                message,
                content: Buffer.from(content).toString('base64'),
                branch,
                sha
              });
              console.log(`🔵 [GitHub] Successfully updated existing file ${path}`);
              return response.data;
            } else {
              throw new Error(`Could not retrieve SHA for existing file ${path}`);
            }
          } catch (shaError: any) {
            console.error(`🔵 [GitHub] Failed to get SHA for ${path}:`, shaError);
            throw new Error(`Failed to update existing file ${path}: ${shaError.message}`);
          }
        } else {
          // Re-throw other errors
          throw createError;
        }
      }
    } catch (error: any) {
      console.error("GitHub file creation error:", error);
      throw new Error(`Failed to create file ${path}: ${error.message}`);
    }
  }

  async updateFile(owner: string, repo: string, path: string, content: string, message: string, sha: string, branch: string = "main") {
    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch
      });

      return response.data;
    } catch (error) {
      console.error("GitHub file update error:", error);
      throw new Error(`Failed to update file ${path}: ${error.message}`);
    }
  }

  async getFile(owner: string, repo: string, path: string, branch: string = "main") {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });

      if (Array.isArray(response.data) || response.data.type !== 'file') {
        throw new Error(`${path} is not a file`);
      }

      return {
        content: Buffer.from(response.data.content, 'base64').toString(),
        sha: response.data.sha
      };
    } catch (error) {
      if (error.status === 404) {
        return null;
      }
      console.error("GitHub file fetch error:", error);
      throw new Error(`Failed to fetch file ${path}: ${error.message}`);
    }
  }

  async fileExists(owner: string, repo: string, path: string, branch: string = "main"): Promise<boolean> {
    try {
      await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      return true;
    } catch (error) {
      if (error.status === 404) {
        return false;
      }
      throw error;
    }
  }

  async getAllFiles(owner: string, repo: string, path: string = "", branch: string = "main") {
    try {
      console.log(`🔵 [GitHub API] GET /repos/${owner}/${repo}/contents?ref=${branch}&path=${path}`);
      
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch
      });
      
      console.log(`🔵 [GitHub API] Response status: ${response.status}`);
      console.log(`🔵 [GitHub API] Files found: ${Array.isArray(response.data) ? response.data.length : 1}`);
      
      return response.data;
    } catch (error) {
      console.error(`🔴 [GitHub API] Error getting repository contents: ${(error as any).message}`);
      console.error(`🔴 [GitHub API] Status: ${(error as any).status || 'unknown'}`);
      console.error(`🔴 [GitHub API] URL: GET /repos/${owner}/${repo}/contents?ref=${branch}`);
      throw error;
    }
  }

  async analyzeRepositoryState(owner: string, repo: string): Promise<{
    step: string;
    progress: {
      hasMainOutline: boolean;
      chapterOutlines: number;
      sectionOutlines: number;
      sectionDrafts: number;
      sectionSummaries: number;
      hasContentDraft: boolean;
      hasFrontMatter: boolean;
    };
    nextFile: string;
    recommendation: string;
  }> {
    try {
      console.log(`🔵 [GitHub] Analyzing repository: ${owner}/${repo}`);
      console.log(`🔵 [GitHub] API endpoint: GET /repos/${owner}/${repo}/contents?ref=main`);
      
      const files = await this.getAllFiles(owner, repo) as any[];
      
      if (!Array.isArray(files)) {
        throw new Error("Repository is empty or inaccessible");
      }

      const fileNames = files.map(file => file.name);
      
      // Analyze what exists (streamlined workflow without chapter/section outlines)
      const hasMainOutline = fileNames.includes('main_outline.md');
      const sectionDrafts = fileNames.filter(name => name.match(/^chapter_\d+_section_\d+_draft\.md$/)).length;
      const sectionSummaries = fileNames.filter(name => name.match(/^chapter_\d+_section_\d+_summary\.md$/)).length;
      const hasContentDraft = fileNames.includes('content_draft.md');
      const hasFrontMatter = fileNames.includes('front_matter.md');

      // Determine current step and next action (streamlined 6-step workflow)
      let step: string;
      let nextFile: string;
      let recommendation: string;

      if (!hasMainOutline) {
        step = "book_outline";
        nextFile = "main_outline.md";
        recommendation = "Generate main book outline";
      } else if (sectionDrafts === 0) {
        step = "content_generation";
        nextFile = "chapter_1_section_1_draft.md";
        recommendation = "Start generating section drafts";
      } else if (sectionSummaries < sectionDrafts) {
        step = "content_generation";
        const missingChapter = Math.floor(sectionSummaries / 2) + 1;
        const missingSection = (sectionSummaries % 2) + 1;
        nextFile = `chapter_${missingChapter}_section_${missingSection}_summary.md`;
        recommendation = "Continue generating section summaries from drafts";
      } else if (!hasContentDraft) {
        step = "content_compilation";
        nextFile = "content_draft.md";
        recommendation = "Compile all sections into complete book";
      } else if (!hasFrontMatter) {
        step = "front_matter_generation";
        nextFile = "front_matter.md";
        recommendation = "Generate front matter (preface, introduction, TOC)";
      } else {
        step = "completed";
        nextFile = "";
        recommendation = "Book generation is complete";
      }

      return {
        step,
        progress: {
          hasMainOutline,
          chapterOutlines: 0, // No longer generated
          sectionOutlines: 0, // No longer generated
          sectionDrafts,
          sectionSummaries,
          hasContentDraft,
          hasFrontMatter
        },
        nextFile,
        recommendation
      };

    } catch (error) {
      throw new Error(`Failed to analyze repository state: ${(error as any).message}`);
    }
  }

  async compileBookContent(owner: string, repo: string, chapters: Array<{chapterNumber: number, sections: Array<{sectionNumber: number, draftPath: string}>}>) {
    try {
      let compiledContent = "# Complete Book Draft\n\n";
      compiledContent += `*Generated on ${new Date().toISOString().split('T')[0]}*\n\n`;
      
      // Sort chapters by number
      const sortedChapters = chapters.sort((a, b) => a.chapterNumber - b.chapterNumber);
      
      for (const chapter of sortedChapters) {
        console.log(`📚 Compiling Chapter ${chapter.chapterNumber}...`);
        
        // Sort sections by number
        const sortedSections = chapter.sections.sort((a, b) => a.sectionNumber - b.sectionNumber);
        
        for (const section of sortedSections) {
          try {
            console.log(`📄 Fetching ${section.draftPath}...`);
            // Use raw format to get UTF-8 text directly, avoiding base64 encoding issues
            const { data: content } = await this.octokit.rest.repos.getContent({
              owner,
              repo,
              path: section.draftPath,
              ref: "main",
              mediaType: { format: "raw" }
            });
            
            compiledContent += content as string + "\n\n";
            compiledContent += "---\n\n"; // Section separator
          } catch (error) {
            console.warn(`⚠️ Could not fetch ${section.draftPath}: ${(error as any).message}`);
            compiledContent += `*[Section ${chapter.chapterNumber}.${section.sectionNumber} content unavailable]*\n\n`;
          }
        }
        
        compiledContent += "\n"; // Extra space between chapters
      }
      
      // Create the compiled file
      const compiledPath = "content_draft.md";
      console.log(`📝 Creating ${compiledPath}...`);
      
      const fileExists = await this.fileExists(owner, repo, compiledPath);
      
      if (fileExists) {
        const existingFile = await this.getFile(owner, repo, compiledPath);
        if (existingFile && 'sha' in existingFile) {
          await this.updateFile(
            owner, 
            repo, 
            compiledPath, 
            compiledContent, 
            "Update complete book draft with all sections", 
            existingFile.sha
          );
        }
      } else {
        await this.createFile(
          owner, 
          repo, 
          compiledPath, 
          compiledContent, 
          "Create complete book draft with all sections"
        );
      }
      
      console.log(`✅ Successfully compiled book content to ${compiledPath}`);
      return compiledPath;
      
    } catch (error) {
      console.error('Error compiling book content:', (error as any).message);
      throw error;
    }
  }
}

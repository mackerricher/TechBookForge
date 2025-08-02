export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string = "https://api.deepseek.com/v1";

  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_TOKEN || "";
    if (!this.apiKey) {
      throw new Error("DeepSeek API key not found in environment variables");
    }
  }

  async generateContent(prompt: string, model: string = "deepseek-reasoner"): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 DeepSeek API call - Model: ${model}, Prompt length: ${prompt.length} chars${attempt > 1 ? ` (Attempt ${attempt}/${maxRetries})` : ''}`);
        
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            max_tokens: 8000, // Increased to allow longer outlines
            temperature: 0.7
          })
        });

        console.log(`🤖 DeepSeek API response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`DeepSeek API error response (Attempt ${attempt}/${maxRetries}): ${errorData}`);
          
          const isRetryableError = response.status === 429 || // Rate limit
                                  response.status === 503 || // Service unavailable
                                  response.status === 502 || // Bad gateway
                                  response.status === 500; // Internal server error
          
          if (attempt === maxRetries || !isRetryableError) {
            throw new Error(`DeepSeek API error: ${response.status} - ${errorData}`);
          }
          
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
          console.log(`⏳ Retrying DeepSeek API call in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const data = await response.json();
        
        // Debug: Log the full response structure
        console.log("DeepSeek API response structure:", JSON.stringify(data, null, 2));
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error("Invalid DeepSeek API response structure:", data);
          throw new Error("Invalid response format from DeepSeek API");
        }

        const content = data.choices[0].message.content;
        
        // Debug: Check if content is null, undefined, or empty
        if (content === null || content === undefined) {
          console.error("DeepSeek API returned null/undefined content");
          console.error("Full message object:", JSON.stringify(data.choices[0].message, null, 2));
          throw new Error("DeepSeek API returned null/undefined content");
        }
        
        const trimmedContent = content.trim();
        console.log(`✓ DeepSeek API success - Generated ${trimmedContent.length} characters`);
        
        if (trimmedContent.length === 0) {
          console.warn("DeepSeek API returned empty content after trimming");
          console.warn("Original content:", JSON.stringify(content));
          console.warn("Prompt length:", prompt.length);
        }
        
        return trimmedContent;
      } catch (error) {
        console.error(`DeepSeek API error (Attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          throw new Error(`DeepSeek API request failed after ${attempt} attempts: ${(error as any).message}`);
        }
        
        // Exponential backoff with jitter for network errors
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`⏳ Retrying DeepSeek API call in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error("DeepSeek API request failed: Maximum retries exceeded");
  }



  async generateBookOutline(bookData: any): Promise<string> {
    const isFiction = bookData.genre === 'fiction';
    
    // Increase key message limit to prevent truncation of important context
    const maxKeyMessageLength = 3000; // Increased from 1000 to 3000 characters
    const keyMessage = bookData.key_message.length > maxKeyMessageLength 
      ? (() => {
          console.log(`⚠️ Key message truncated from ${bookData.key_message.length} to ${maxKeyMessageLength} characters - this may affect outline quality`);
          return bookData.key_message.substring(0, maxKeyMessageLength) + '...';
        })()
      : bookData.key_message;
    
    console.log(`📝 Key message length: ${keyMessage.length} characters (limit: ${maxKeyMessageLength})`);
    console.log(`📝 Key message preview: ${keyMessage.substring(0, 200)}...`);
    
    const prompt = `
Create a comprehensive book outline for a ${isFiction ? 'fiction' : 'non-fiction'} book with the following specifications:

Title: ${bookData.title}
${bookData.subtitle ? `Subtitle: ${bookData.subtitle}` : ''}
Key Message: ${keyMessage}
Target Audience: ${bookData.target_audience.description}
Specialization: ${bookData.specialization || 'Technical for non-technical readers'}
Estimated Word Count: ${bookData.estimated_word_count}
Number of Chapters: ${bookData.chapter_count || 8}

Style Guidelines:
- Tone: ${bookData.tone_voice || 'Friendly and conversational'}
- Reading Level: ${bookData.style_guidelines?.reading_level || 'Professional'}
- Complexity: ${bookData.style_guidelines?.complexity_level || 'Introductory'}

Create a detailed book outline that includes:
${isFiction ? 
`1. A compelling opening that establishes character, setting, and conflict
2. ${bookData.chapter_count || 8} well-structured chapters that advance the plot
3. Character development arcs and story progression
4. Rising action, climax, and resolution
5. A satisfying conclusion that resolves the central conflict` :
`1. A compelling introduction that hooks the reader
2. ${bookData.chapter_count || 8} well-structured chapters with clear learning objectives
3. Each chapter should build upon the previous one
4. Include practical examples and case studies where appropriate
5. A strong conclusion that reinforces the key message`}

Format the outline in clear markdown with:
- # for the book title
- ## for chapter titles
- ### for major sections within chapters
- Brief descriptions of what each section will cover

IMPORTANT: Return ONLY the markdown outline. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure markdown content that will be used for automated processing.

FACTUAL ACCURACY REQUIREMENTS:
- Focus on timeless principles and concepts rather than current-state descriptions
- Avoid specific software versions, interface details, or current implementation specifics
- Use general workflows and conceptual frameworks instead of exact procedural steps
- When outlining technology topics, emphasize enduring principles over current features
- Prefer conditional language for evolving areas ("typically," "often," "generally")
`;

    return this.generateContent(prompt, "deepseek-reasoner");
  }

  async generateChapterOutline(bookData: any, chapterNumber: number, chapterTitle: string, bookOutline: string): Promise<string> {
    const isFiction = bookData.genre === 'fiction';
    const sectionsPerChapter = bookData.sections_per_chapter || 8;
    const maxCharsPerSection = Math.floor(1500 / sectionsPerChapter); // Distribute ~1500 chars across sections
    
    const prompt = `
Based on the following book outline and specifications, create a detailed outline for Chapter ${chapterNumber}: "${chapterTitle}"

Book Specifications:
- Title: ${bookData.title}
- Genre: ${bookData.genre || 'non-fiction'}
- ${isFiction ? 'Central Theme' : 'Key Message'}: ${bookData.key_message}
- Target Audience: ${bookData.target_audience.description}
- Sections per Chapter: ${sectionsPerChapter}

Book Outline Context:
${bookOutline}

Create a detailed chapter outline that includes:
${isFiction ? 
`1. Chapter opening that advances the plot from previous events
2. ${sectionsPerChapter} main scenes or sequences
3. Character development and dialogue opportunities
4. Conflict progression and tension building
5. Chapter ending that hooks readers for the next chapter` :
`1. Chapter introduction that connects to the overall book narrative
2. ${sectionsPerChapter} main sections with clear learning objectives
3. Key concepts to be covered in each section
4. Examples, case studies, or practical applications
5. Chapter summary and transition to the next chapter`}

Format in markdown with:
- # for the chapter title
- ## for section titles (MUST be labeled as "Section 1: Title", "Section 2: Title", etc.)
- ### for subsections
- Clear bullet points for key concepts

CRITICAL FORMATTING REQUIREMENT:
- Each section MUST be labeled exactly as "Section 1: [Title]", "Section 2: [Title]", etc.
- This numbering is essential for automated processing to split sections correctly
- Example: "## Section 1: Introduction to Core Concepts"

CONCISENESS REQUIREMENTS:
- Keep each section description to approximately ${maxCharsPerSection} characters maximum
- Be concise but comprehensive - focus on essential concepts only
- Use bullet points for clarity and brevity
- Total outline should stay under 1500 characters to prevent cutoff

IMPORTANT: Return ONLY the markdown outline. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure markdown content that will be used for automated processing.
`;

    return this.generateContent(prompt, "deepseek-reasoner");
  }

  async generateSectionOutline(bookData: any, chapterOutline: string, sectionNumber: number, sectionTitle: string): Promise<string> {
    const prompt = `
Create a detailed section outline based on the chapter context and specifications:

Book Title: ${bookData.title}
Target Audience: ${bookData.target_audience.description}
Section: ${sectionNumber} - "${sectionTitle}"

Chapter Context:
${chapterOutline}

Create a comprehensive section outline that includes:
1. Section introduction and objectives
2. Main concepts and key points to cover
3. Supporting examples or case studies
4. Practical applications or exercises
5. Section conclusion and key takeaways

Format in markdown with clear structure:
- # for section title
- ## for main topics
- ### for subtopics
- Bullet points for detailed content

IMPORTANT: Return ONLY the markdown outline. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure markdown content that will be used for automated processing.
`;

    return this.generateContent(prompt, "deepseek-reasoner");
  }

  async generateSectionDraft(bookData: any, chapterOutline: string, sectionOutline: string, previousSectionSummaries?: string[]): Promise<string> {
    const contextPrompt = previousSectionSummaries && previousSectionSummaries.length > 0
      ? `\nPrevious Section Summaries (for continuity and context):\n${previousSectionSummaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n')}\n\nEnsure this section builds naturally from all previous content and maintains narrative flow.`
      : '';

    const prompt = `
Write a complete, engaging section for the book based on the following specifications:

Book Title: ${bookData.title}
Target Audience: ${bookData.target_audience.description}
Tone: ${bookData.tone_voice || 'Friendly and conversational'}
Writing Style: ${bookData.style_guidelines?.preferred_person || 'Second person'} person

Chapter Outline Context:
${chapterOutline}

Section Outline:
${sectionOutline}${contextPrompt}

Write a complete section (approximately 1,500-2,500 words) that:
1. Engages the reader from the opening paragraph
2. Clearly explains concepts in an accessible way
3. Includes relevant examples and practical applications
4. Uses the specified tone and writing style
5. Flows naturally and maintains reader interest
6. Concludes with clear takeaways

Format in clean markdown with:
- Proper headings and subheadings
- Clear paragraphs with good flow
- Bullet points or numbered lists where appropriate
- Emphasis using **bold** and *italic* text

IMPORTANT: Return ONLY the markdown content. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure markdown content that will be used for automated processing.
`;

    return this.generateContent(prompt, "deepseek-reasoner");
  }

  async generateSectionSummary(sectionContent: string, sectionDetails?: string): Promise<string> {
    const detailsSection = sectionDetails ? `

Section Details:
${sectionDetails}` : '';

    const prompt = `
Create a concise, one-paragraph summary of the following book section content. The summary should:
1. Capture the main concepts and key points
2. Be approximately 3-5 sentences
3. Serve as context for the next section
4. Maintain the essential information without unnecessary details
5. Include specific details (names, businesses, cities, roles, industries) for narrative consistency

Section Content:
${sectionContent}${detailsSection}

IMPORTANT: Return ONLY the summary paragraph. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure text content that will be used for automated processing.

FACTUAL ACCURACY REQUIREMENTS:
- Focus on timeless principles and concepts rather than current-state descriptions
- Avoid specific software versions, interface details, or current implementation specifics
- Use general workflows and conceptual frameworks instead of exact procedural steps
- When summarizing technology topics, emphasize enduring principles over current features
- Prefer conditional language for evolving areas ("typically," "often," "generally")
`;

    return this.generateContent(prompt);
  }

  async generateFrontMatter(bookData: any, bookOutline: string, sectionSummaries: string[]): Promise<string> {
    const summariesText = sectionSummaries.length > 0 
      ? `\n\nSection Summaries:\n${sectionSummaries.join('\n\n')}`
      : '';

    const prompt = `
Generate comprehensive front matter for this book. Include:

1. Title page information
2. Table of Contents (based on book outline)
3. Preface (explaining the book's purpose and approach)
4. Introduction (setting context and what readers will learn)

Book Details:
- Title: ${bookData.title}
- Subtitle: ${bookData.subtitle || ''}
- Author: ${bookData.author?.name || 'Unknown Author'}
- Description: ${bookData.description || ''}
- Key Message: ${bookData.key_message}
- Target Audience: ${bookData.target_audience?.description || ''}
- Tone/Voice: ${bookData.tone_voice || 'Professional'}
- Estimated Word Count: ${bookData.estimated_word_count || 'Unknown'}

Book Outline:
${bookOutline}${summariesText}

Structure as professional front matter with:

# [Book Title]
## [Subtitle]

### By [Author Name]

---

## Table of Contents

[Generate based on outline with page number placeholders]

---

## Preface

[Write compelling preface explaining book purpose, approach, and what makes it unique. Match the specified tone and voice.]

---

## Introduction

[Write engaging introduction that sets context, explains what readers will learn, and how to use the book effectively. Address the target audience directly.]

IMPORTANT: Return ONLY the markdown content. Do not include any conversational text, suggestions, or phrases like "Let me know if you'd like adjustments" or similar. The response must be pure markdown content that will be used for automated processing.

FACTUAL ACCURACY REQUIREMENTS:
- Focus on timeless principles and concepts rather than current-state descriptions
- Avoid specific software versions, interface details, or current implementation specifics
- Use general workflows and conceptual frameworks instead of exact procedural steps
- When discussing technology topics, emphasize enduring principles over current features
- Prefer conditional language for evolving areas ("typically," "often," "generally")
`;

    return this.generateContent(prompt, "deepseek-reasoner");
  }
}

import OpenAI from 'openai';

export class PolishServiceX {
  private openai: OpenAI;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for content polishing');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Polish content using GPT-4.5 for clarity, concision, and varied syntax
   */
  async polishWithGPT(draft: string): Promise<string> {
    const maxRetries = 3;
    const baseDelay = 2000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🎨 Polishing content with GPT-4.5 (attempt ${attempt}/${maxRetries})`);
        
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o", // Using GPT-4o as the latest available model
          messages: [
            {
              role: "system",
              content: `You are an expert content editor specializing in polishing technical and business writing. Your task is to lightly polish the provided markdown content for:

1. CLARITY: Ensure concepts are explained clearly and logically
2. CONCISION: Remove redundancy and tighten prose without losing meaning
3. VARIED SYNTAX: Improve sentence structure variety and flow
4. READABILITY: Enhance overall readability and engagement

CRITICAL PRESERVATION REQUIREMENTS:
- Preserve ALL markdown formatting (headers, bold, italic, code blocks, etc.)
- Maintain the original tone and voice
- Keep all technical accuracy intact
- Preserve the structure and organization
- Do not add or remove substantive content
- Do not change the length significantly (±10%)

FORMATTING RULES:
- Keep GitHub-flavored markdown intact
- Preserve mathematical equations ($...$ and $$...$$)
- Maintain code block formatting with language tags
- Keep all headers, lists, and emphasis formatting

Return ONLY the polished markdown content with no additional commentary.`
            },
            {
              role: "user",
              content: `Please polish this content for clarity, concision, and varied syntax while preserving all formatting and tone:

${draft}`
            }
          ],
          max_tokens: 4000,
          temperature: 0.3,
          top_p: 0.9,
        });

        const polishedContent = response.choices[0]?.message?.content;
        
        if (!polishedContent) {
          throw new Error('OpenAI API returned empty response');
        }

        console.log(`✓ Content polished successfully - ${polishedContent.length} characters`);
        return polishedContent.trim();
        
      } catch (error) {
        console.error(`OpenAI API error (Attempt ${attempt}/${maxRetries}):`, error);
        
        if (attempt === maxRetries) {
          console.warn('⚠️ Content polishing failed after all attempts, returning original draft');
          return draft; // Return original draft if polishing fails
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
        console.log(`⏳ Retrying OpenAI API call in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Fallback to original draft if all retries fail
    return draft;
  }
}
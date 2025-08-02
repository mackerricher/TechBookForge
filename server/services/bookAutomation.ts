import type { BookSpec } from "./bookGenerator";
import { ClaudeService } from "./claude";

/**
 * Automated Book Specification Generator
 * Implements Step 0 + 14-step automation process for book creation
 */
export class BookAutomationService {
  private claude: ClaudeService;

  constructor() {
    this.claude = new ClaudeService();
  }
  
  /**
   * Step 0 + 1-14: Generate automated book specification from title and subtitle
   */
  async createAutomatedBookSpec(title: string, subtitle: string = "", uniqueValueProp: string = "", customToneVoice: string = ""): Promise<BookSpec> {
    
    // Step 2: Apply standardized tone and voice (or use custom if provided)
    const standardToneVoice = `Write as one who has a seamless blend of three archetypes: **PersonA** — intensely private, profoundly empathetic; meticulous, quietly humble, artisanal precision. **PersonB** — effortlessly charming, Midwestern warmth, humble with polished poise. **PersonC** — fiercely intelligent, contrarian, street-wise savant; guarded skepticism, razor-sharp insight and fighter against injustice. And blend all three personas into a single one with the congenial grace and confidence of a person who has seen it all but remains optimistic, someone who speaks truth with gentleness but without compromise.`;
    
    // Use custom tone/voice if provided, otherwise use standard
    const finalToneVoice = customToneVoice.trim() || standardToneVoice;

    // Step 3: Apply standardized additional notes
    const standardAdditionalNotes = `Research and discover the latest and most accurate info for all facts and figures. Double check all facts and figures, so that we're spot on. Mitigate all legal exposure. Have opinions. Be bold! 

FACTUAL ACCURACY REQUIREMENTS:
- Focus on timeless principles rather than current-state descriptions that may become outdated
- Avoid specific UI details, button names, or interface elements unless explicitly verified
- Use conditional language ("typically," "often," "generally") when discussing current practices
- Reference official documentation rather than describing specific procedures
- Emphasize workflows and concepts over exact steps or current interface states`;

    // Step 9: Apply fictional genius author credentials
    const standardAuthor = {
      name: "Dr. Alexandra Chen",
      bio: "Leading expert in innovative methodologies and strategic thinking with over 15 years of experience transforming complex concepts into actionable insights.",
      credentials: "PhD in Computer Science, MIT; Former Head of AI Strategy at Google",
      website: undefined,
      contact_email: undefined,
      social_handles: undefined
    };

    // Step 14: Generate unique value perspective and best-seller positioning
    const { description: baseDescription, keyMessage, uniqueSellingPoints, keywords } = await this.generateBestSellerPositioning(title, subtitle);
    
    // Step 15: Integrate user's unique value proposition if provided
    const finalKeyMessage = uniqueValueProp 
      ? `${keyMessage} ${uniqueValueProp}` 
      : keyMessage;

    // Step 0: Generate Claude-optimized description
    console.log('🎯 Step 0: Generating Claude-optimized book description...');
    const optimizedDescription = await this.claude.generateOptimizedDescription(
      baseDescription,
      finalToneVoice,
      finalKeyMessage,
      title,
      subtitle
    );
    console.log('✅ Step 0: Claude-optimized description generated');

    // Compile the automated book specification
    const automatedSpec: BookSpec = {
      title,
      subtitle: subtitle || undefined,
      description: optimizedDescription, // Step 0: Claude-optimized description
      genre: "non-fiction", // Default to non-fiction for automation
      specialization: "professional development and practical insights",
      key_message: finalKeyMessage, // Step 14: Enhanced messaging + user UVP
      tone_voice: finalToneVoice, // Step 2: Custom tone or standardized tone
      style_guidelines: {
        reading_level: "professional",
        complexity_level: "introductory", // Step 13: Introductory level
        preferred_person: "second"
      },
      unique_selling_points: uniqueSellingPoints, // Step 14: Best-seller USPs
      keywords, // Step 14: Strategic keywords
      comparable_titles: this.generateComparableTitles(title), // Strategic positioning
      estimated_word_count: 420000, // Step 4: 40K words across 16 sections (8 chapters × 2 sections = ~2,500 words per section)
      chapter_count: 21, // Step 5: Fixed chapter count
      sections_per_chapter: 8, // Step 6: Balanced sections per chapter for focused content
      language: "en",
      deepseek_model: "deepseek-reasoner", // Step 8: Fixed model
      github_repo_visibility: "private", // Step 7: Private repos
      author: standardAuthor, // Step 9: Fictional genius credentials
      target_audience: {
        persona_name: "Professional Growth Seeker",
        description: "Ambitious professionals, entrepreneurs, and leaders seeking actionable insights to advance their careers and personal development",
        technical_level: "intermediate",
        familiarity_with_topic: "some experience but seeking deeper understanding",
        age_range: "25-45",
        professional_background: "business, technology, and leadership roles",
        primary_goal: "practical knowledge application for career and personal advancement"
      },
      additional_notes: standardAdditionalNotes // Step 3: Standard research notes
    };

    return automatedSpec;
  }

  /**
   * Step 14: Generate best-seller positioning with unique value perspective
   */
  private async generateBestSellerPositioning(title: string, subtitle: string) {
    // Generate compelling description with unique angle
    const description = `A transformative guide that challenges conventional wisdom about ${this.extractMainTopic(title)}. This book offers a fresh perspective that cuts through industry noise to deliver practical, immediately actionable strategies. Written for professionals who demand both depth and accessibility, it bridges the gap between theoretical concepts and real-world application. ${subtitle ? `${subtitle} ` : ''}What sets this book apart is its unflinching examination of common misconceptions and its bold presentation of contrarian insights that actually work.`;

    // Generate compelling key message
    const keyMessage = `Success in ${this.extractMainTopic(title)} isn't about following the crowd—it's about understanding the underlying principles that most people miss and applying them with precision and courage.`;

    // Step 10 & 11: Remove supplemental material and use realistic simulated case studies
    const uniqueSellingPoints = [
      "Realistic simulated case studies that illustrate key concepts without relying on potentially inaccurate real-world data",
      "Contrarian insights that challenge industry conventional wisdom",
      "Immediately actionable strategies with step-by-step implementation guides",
      "Legal disclaimers and risk mitigation strategies built into every recommendation", // Step 12: Legal exposure mitigation
      "Bold opinions backed by rigorous analysis and practical testing"
    ];

    // Generate strategic keywords for discoverability
    const keywords = this.generateStrategicKeywords(title);

    return {
      description,
      keyMessage,
      uniqueSellingPoints,
      keywords
    };
  }

  /**
   * Extract main topic from title for positioning
   */
  private extractMainTopic(title: string): string {
    // Simple extraction - take the main subject after common words
    const cleanTitle = title.toLowerCase()
      .replace(/^(the|a|an|how to|guide to|introduction to|mastering|understanding)\s+/i, '')
      .replace(/:\s*.*$/, '') // Remove subtitle after colon
      .trim();
    
    return cleanTitle || "this subject";
  }

  /**
   * Generate strategic keywords for SEO and discoverability
   */
  private generateStrategicKeywords(title: string): string[] {
    const baseTopic = this.extractMainTopic(title);
    
    return [
      baseTopic,
      "professional development",
      "career advancement",
      "practical strategies",
      "leadership",
      "business growth",
      "actionable insights",
      "success principles"
    ];
  }

  /**
   * Generate comparable titles for market positioning
   */
  private generateComparableTitles(title: string) {
    // Generate strategic comparable titles based on the topic
    return [
      {
        title: "Atomic Habits",
        author: "James Clear",
        publisher: "Avery",
        year: 2018
      },
      {
        title: "Good to Great",
        author: "Jim Collins",
        publisher: "HarperBusiness",
        year: 2001
      },
      {
        title: "The 7 Habits of Highly Effective People",
        author: "Stephen R. Covey",
        publisher: "Free Press",
        year: 1989
      }
    ];
  }
}

/**
 * Factory function to create automated book specification
 */
export async function createAutomatedBookSpec(title: string, subtitle: string = "", uniqueValueProp: string = "", customToneVoice: string = ""): Promise<BookSpec> {
  const automationService = new BookAutomationService();
  return await automationService.createAutomatedBookSpec(title, subtitle, uniqueValueProp, customToneVoice);
}
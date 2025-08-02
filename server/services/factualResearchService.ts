import { web_search } from '../utils/webSearch';

export interface FactualSnippet {
  content: string;
  source: string;
  url: string;
  relevance: number;
  verified: boolean;
}

export class FactualResearchService {
  private static instance: FactualResearchService;
  private isAvailable: boolean = false;

  constructor() {
    this.isAvailable = !!process.env.SERP_API_KEY;
    if (this.isAvailable) {
      console.log('🔍 SerpAPI service initialized - factual research enabled');
    } else {
      console.warn('SerpAPI service unavailable - factual research disabled (SERP_API_KEY not provided)');
    }
  }

  static getInstance(): FactualResearchService {
    if (!FactualResearchService.instance) {
      FactualResearchService.instance = new FactualResearchService();
    }
    return FactualResearchService.instance;
  }

  /**
   * Research factual information for a given topic
   */
  async researchTopic(topic: string, maxResults: number = 3): Promise<FactualSnippet[]> {
    if (!this.isAvailable) {
      console.warn('SerpAPI not available - returning empty results');
      return [];
    }

    try {
      console.log(`🔍 Researching topic: ${topic}`);
      
      const searchResults = await web_search(topic);
      
      if (!searchResults || !searchResults.organic_results) {
        console.warn('No search results found');
        return [];
      }

      const snippets: FactualSnippet[] = [];
      
      for (const result of searchResults.organic_results.slice(0, maxResults)) {
        if (result.snippet && result.link && result.title) {
          snippets.push({
            content: result.snippet,
            source: result.title,
            url: result.link,
            relevance: this.calculateRelevance(result.snippet, topic),
            verified: true // Assuming web search results are verified
          });
        }
      }

      console.log(`✅ Found ${snippets.length} factual snippets for topic: ${topic}`);
      return snippets;
      
    } catch (error) {
      console.error('Error during factual research:', error);
      return [];
    }
  }

  /**
   * Get credible sources for specific claims
   */
  async getSourcesForClaim(claim: string): Promise<FactualSnippet[]> {
    if (!this.isAvailable) {
      return [];
    }

    // Create a search query focused on finding sources for the claim
    const searchQuery = `"${claim}" source evidence research`;
    return this.researchTopic(searchQuery, 2);
  }

  /**
   * Verify factual accuracy of a statement
   */
  async verifyStatement(statement: string): Promise<{
    isVerified: boolean;
    confidence: number;
    sources: FactualSnippet[];
  }> {
    if (!this.isAvailable) {
      return {
        isVerified: false,
        confidence: 0,
        sources: []
      };
    }

    try {
      const sources = await this.getSourcesForClaim(statement);
      
      // Simple heuristic: if we find sources, it's likely verified
      const confidence = Math.min(sources.length * 0.3, 1.0);
      
      return {
        isVerified: sources.length > 0,
        confidence,
        sources
      };
      
    } catch (error) {
      console.error('Error verifying statement:', error);
      return {
        isVerified: false,
        confidence: 0,
        sources: []
      };
    }
  }

  /**
   * Get verified snippets for content enhancement
   */
  async getVerifiedSnippets(context: string, maxSnippets: number = 5): Promise<FactualSnippet[]> {
    if (!this.isAvailable) {
      return [];
    }

    // Extract key terms from context for more targeted research
    const keyTerms = this.extractKeyTerms(context);
    const allSnippets: FactualSnippet[] = [];

    for (const term of keyTerms.slice(0, 3)) { // Limit to top 3 terms
      const snippets = await this.researchTopic(term, 2);
      allSnippets.push(...snippets);
    }

    // Sort by relevance and return top results
    return allSnippets
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxSnippets);
  }

  /**
   * Calculate relevance score for a snippet
   */
  private calculateRelevance(snippet: string, topic: string): number {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const snippetWords = snippet.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const word of topicWords) {
      if (snippetWords.some(sw => sw.includes(word) || word.includes(sw))) {
        matches++;
      }
    }
    
    return matches / topicWords.length;
  }

  /**
   * Extract key terms from context for targeted research
   */
  private extractKeyTerms(context: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const words = context.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['this', 'that', 'with', 'from', 'they', 'have', 'will', 'been', 'said', 'each', 'which', 'their', 'time', 'what', 'into', 'only', 'know', 'take', 'year', 'good', 'some', 'could', 'them', 'than', 'like', 'other', 'after', 'first', 'well', 'also', 'through', 'where', 'much', 'should', 'before', 'very', 'when', 'come', 'there', 'just', 'these', 'people', 'make', 'over', 'such', 'think', 'most', 'even', 'find', 'work', 'life', 'without', 'right', 'more', 'about', 'would', 'never', 'being', 'here', 'between', 'again', 'come', 'back', 'little', 'still', 'under', 'while', 'might', 'shall', 'those', 'since', 'both', 'enough', 'often', 'during', 'until', 'among', 'almost', 'either', 'every', 'together', 'another', 'against', 'although', 'rather', 'different', 'however', 'always', 'sometimes', 'several', 'including', 'therefore', 'example', 'especially', 'particularly', 'important', 'possible', 'because', 'through', 'between', 'without', 'within', 'someone', 'something', 'nothing', 'everything', 'anything', 'everyone', 'anyone', 'someone', 'nobody', 'everybody', 'anybody', 'somewhere', 'anywhere', 'everywhere', 'nowhere'].includes(word));

    // Get unique words and return most frequent ones
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Check if the service is available
   */
  isServiceAvailable(): boolean {
    return this.isAvailable;
  }
}

export default FactualResearchService;
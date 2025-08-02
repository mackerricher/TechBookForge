import { web_search } from '../utils/webSearch';

export interface FactualAccuracyIssue {
  type: 'outdated_ui' | 'specific_claim' | 'factual_error' | 'needs_verification';
  severity: 'high' | 'medium' | 'low';
  originalText: string;
  suggestedReplacement: string;
  reason: string;
  line?: number;
}

export class FactualAccuracyService {
  private static readonly PROBLEMATIC_PATTERNS = [
    // UI-specific patterns
    {
      pattern: /click.*?(?:button|link|menu|tab|icon)/gi,
      type: 'outdated_ui' as const,
      severity: 'high' as const,
      reason: 'Specific UI elements may change frequently',
      replacementTemplate: 'navigate to the relevant section'
    },
    {
      pattern: /you'll see.*?(?:interface|screen|page|window)/gi,
      type: 'outdated_ui' as const,
      severity: 'medium' as const,
      reason: 'Interface descriptions become outdated quickly',
      replacementTemplate: 'check the current interface'
    },
    {
      pattern: /navigate to.*?\.com.*?and/gi,
      type: 'outdated_ui' as const,
      severity: 'high' as const,
      reason: 'Website navigation instructions may be outdated',
      replacementTemplate: 'visit the website and follow the current navigation'
    },
    
    // Version-specific patterns
    {
      pattern: /version \d+\.\d+/gi,
      type: 'specific_claim' as const,
      severity: 'medium' as const,
      reason: 'Version numbers become outdated quickly',
      replacementTemplate: 'the current version'
    },
    {
      pattern: /as of \d{4}/gi,
      type: 'specific_claim' as const,
      severity: 'low' as const,
      reason: 'Date-specific claims need regular updates',
      replacementTemplate: 'in recent versions'
    },
    
    // Feature-specific patterns
    {
      pattern: /(?:new|latest|recently added|just released).*?feature/gi,
      type: 'specific_claim' as const,
      severity: 'medium' as const,
      reason: 'Temporal feature descriptions become outdated',
      replacementTemplate: 'available feature'
    }
  ];

  private static readonly DOMAIN_GUIDELINES = {
    'software': {
      avoid: ['specific button names', 'exact menu paths', 'version numbers'],
      prefer: ['general workflows', 'conceptual approaches', 'documentation references']
    },
    'websites': {
      avoid: ['interface descriptions', 'specific URLs', 'exact navigation steps'],
      prefer: ['general processes', 'official documentation', 'support resources']
    },
    'services': {
      avoid: ['current pricing', 'specific features', 'exact procedures'],
      prefer: ['general capabilities', 'typical workflows', 'official resources']
    },
    'technology': {
      avoid: ['current versions', 'specific implementations', 'exact specifications'],
      prefer: ['general principles', 'standard practices', 'fundamental concepts']
    }
  };

  /**
   * Analyze content for potential factual accuracy issues
   */
  async analyzeContent(content: string): Promise<FactualAccuracyIssue[]> {
    const issues: FactualAccuracyIssue[] = [];
    const lines = content.split('\n');

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      
      for (const pattern of FactualAccuracyService.PROBLEMATIC_PATTERNS) {
        const matches = line.match(pattern.pattern);
        if (matches) {
          for (const match of matches) {
            issues.push({
              type: pattern.type,
              severity: pattern.severity,
              originalText: match,
              suggestedReplacement: pattern.replacementTemplate,
              reason: pattern.reason,
              line: lineIndex + 1
            });
          }
        }
      }
    }

    return issues;
  }

  /**
   * Generate improved content with factual accuracy fixes
   */
  async improveContentAccuracy(content: string): Promise<string> {
    const issues = await this.analyzeContent(content);
    let improvedContent = content;

    // Apply automatic fixes for high-severity issues
    for (const issue of issues.filter(i => i.severity === 'high')) {
      improvedContent = improvedContent.replace(
        issue.originalText,
        this.generateGenericReplacement(issue.originalText, issue.type)
      );
    }

    return improvedContent;
  }

  /**
   * Generate generic replacement text for problematic patterns
   */
  private generateGenericReplacement(originalText: string, issueType: string): string {
    const lower = originalText.toLowerCase();
    
    if (issueType === 'outdated_ui') {
      if (lower.includes('click')) {
        return 'access the relevant option';
      }
      if (lower.includes('navigate to')) {
        return 'go to the appropriate section';
      }
      if (lower.includes('you\'ll see')) {
        return 'you can typically find';
      }
    }
    
    if (issueType === 'specific_claim') {
      if (lower.includes('version')) {
        return 'the current version';
      }
      if (lower.includes('new') || lower.includes('latest')) {
        return 'available';
      }
    }
    
    return originalText; // Fallback to original if no specific replacement found
  }

  /**
   * Verify factual claims using web search
   */
  async verifyFactualClaims(content: string, topic: string): Promise<FactualAccuracyIssue[]> {
    const issues: FactualAccuracyIssue[] = [];
    
    // Extract potentially verifiable claims
    const claims = this.extractVerifiableClaims(content);
    
    for (const claim of claims) {
      try {
        // Search for current information about the claim using LLM-powered web search
        const searchQuery = `${topic} ${claim.subject} current information fact check`;
        const searchResults = await web_search(searchQuery);
        
        // Analyze if the claim might be outdated
        const isOutdated = this.analyzeSearchResults(searchResults, claim.text);
        
        if (isOutdated) {
          issues.push({
            type: 'needs_verification',
            severity: 'medium',
            originalText: claim.text,
            suggestedReplacement: `${claim.text} (verify current information)`,
            reason: 'This claim may need verification with current sources'
          });
        }
      } catch (error) {
        console.warn(`Failed to verify claim: ${claim.text}`, error);
      }
    }
    
    return issues;
  }

  /**
   * Extract claims that can be fact-checked
   */
  private extractVerifiableClaims(content: string): Array<{text: string, subject: string}> {
    const claims: Array<{text: string, subject: string}> = [];
    const lines = content.split('\n');
    
    // Look for statements that make specific claims about products, services, or procedures
    const claimPatterns = [
      /(.+)\s+(?:offers|provides|includes|features|supports)\s+(.+)/gi,
      /(.+)\s+(?:allows|enables|helps)\s+you\s+to\s+(.+)/gi,
      /(.+)\s+(?:has|contains|uses)\s+(.+)/gi
    ];
    
    for (const line of lines) {
      for (const pattern of claimPatterns) {
        const matches = [...line.matchAll(pattern)];
        for (const match of matches) {
          if (match[1] && match[2]) {
            claims.push({
              text: match[0],
              subject: match[1].trim()
            });
          }
        }
      }
    }
    
    return claims;
  }

  /**
   * Analyze search results to determine if a claim might be outdated
   */
  private analyzeSearchResults(searchResults: string, claim: string): boolean {
    // Simple heuristic: if search results contain contradictory information
    // or mention recent changes, the claim might be outdated
    const contradictoryKeywords = [
      'changed', 'updated', 'new', 'different', 'no longer', 'removed',
      'deprecated', 'replaced', 'modified', 'current', 'now'
    ];
    
    const resultsLower = searchResults.toLowerCase();
    const claimLower = claim.toLowerCase();
    
    // Check if search results suggest changes
    for (const keyword of contradictoryKeywords) {
      if (resultsLower.includes(keyword) && resultsLower.includes(claimLower)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Generate content guidelines for specific domains
   */
  static getDomainGuidelines(domain: string): string {
    const guidelines = FactualAccuracyService.DOMAIN_GUIDELINES[domain] || 
                     FactualAccuracyService.DOMAIN_GUIDELINES['technology'];
    
    return `
DOMAIN-SPECIFIC ACCURACY GUIDELINES for ${domain.toUpperCase()}:

AVOID:
${guidelines.avoid.map(item => `- ${item}`).join('\n')}

PREFER:
${guidelines.prefer.map(item => `- ${item}`).join('\n')}

GENERAL PRINCIPLES:
- Use conditional language ("typically", "often", "generally")
- Reference official documentation instead of describing specifics
- Focus on concepts rather than implementation details
- Provide general workflows rather than exact steps
`;
  }
}
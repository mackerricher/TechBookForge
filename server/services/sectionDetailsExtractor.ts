import { DeepSeekService } from "./deepseek";
import { storage } from "../storage";

export interface ExtractedSectionDetail {
  personName?: string;
  businessName?: string;
  cityName?: string;
  jobRole?: string;
  businessType?: string;
}

export class SectionDetailsExtractor {
  private deepseek: DeepSeekService;

  constructor() {
    this.deepseek = new DeepSeekService();
  }

  /**
   * Extract section-specific details from a completed section draft
   */
  async extractSectionDetails(sectionId: number, draftContent: string): Promise<ExtractedSectionDetail[]> {
    try {
      // Use the provided draft content directly
      
      // Create prompt for DeepSeek reasoner to extract details
      const prompt = `Analyze the following section draft and extract all section-specific details that are mentioned. Focus on these 5 categories:

1. Person names (fictional or real people mentioned)
2. Business names (companies, organizations, brands)
3. City names (locations, places)
4. Job roles (specific positions like "marketing manager", "software developer", "CEO")
5. Business types (industries like "marketing", "banking", "law firm", "tech startup")

Return your response as a JSON array where each object contains only the fields that are present:

Example format:
[
  {
    "personName": "Sarah Johnson",
    "businessName": "TechCorp",
    "cityName": "Seattle",
    "jobRole": "marketing manager",
    "businessType": "technology"
  },
  {
    "personName": "Michael Chen",
    "jobRole": "software developer"
  }
]

IMPORTANT: Only include details that are explicitly mentioned in the text. If a category is not mentioned, omit that field entirely from the object.

Section Draft Content:
${draftContent}`;

      // Get response from DeepSeek reasoner
      const response = await this.deepseek.generateContent(prompt, "deepseek-reasoner");
      
      // Parse the JSON response
      let extractedDetails: ExtractedSectionDetail[] = [];
      try {
        // Clean response by removing markdown code blocks if present
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        extractedDetails = JSON.parse(cleanedResponse);
        
        // Validate the structure
        if (!Array.isArray(extractedDetails)) {
          console.warn("DeepSeek response is not an array, attempting to wrap in array");
          extractedDetails = [extractedDetails];
        }
        
        // Filter out invalid entries
        extractedDetails = extractedDetails.filter(detail => 
          detail && typeof detail === 'object' && 
          (detail.personName || detail.businessName || detail.cityName || detail.jobRole || detail.businessType)
        );
        
      } catch (parseError) {
        console.error("Failed to parse DeepSeek response as JSON:", parseError);
        console.error("Raw response:", response);
        return [];
      }
      
      // Store the extracted details in the database
      await storage.storeSectionDetails(sectionId, extractedDetails);
      
      console.log(`Extracted ${extractedDetails.length} section details for section ${sectionId}`);
      return extractedDetails;
      
    } catch (error) {
      console.error("Error extracting section details:", error);
      return [];
    }
  }

  /**
   * Get lists of existing names from all sections for avoidance
   */
  async getExistingNamesForAvoidance(bookId: number): Promise<{
    people: string[];
    jobTitles: string[];
    places: string[];
  }> {
    try {
      const allDetails = await storage.getBookSectionDetails(bookId);
      
      // Extract unique names from each category
      const people = [...new Set(allDetails
        .filter(detail => detail.personName && detail.personName.trim())
        .map(detail => detail.personName!.trim()))];
      
      const jobTitles = [...new Set(allDetails
        .filter(detail => detail.jobRole && detail.jobRole.trim())
        .map(detail => detail.jobRole!.trim()))];
      
      const places = [...new Set(allDetails
        .filter(detail => detail.cityName && detail.cityName.trim())
        .map(detail => detail.cityName!.trim()))];
      
      return {
        people,
        jobTitles,
        places
      };
    } catch (error) {
      console.error("Error getting existing names for avoidance:", error);
      return {
        people: [],
        jobTitles: [],
        places: []
      };
    }
  }

  /**
   * Get all section details for a book formatted for prompt context
   */
  async formatBookSectionDetailsForPrompt(bookId: number): Promise<string> {
    const allDetails = await storage.getBookSectionDetails(bookId);
    
    if (allDetails.length === 0) {
      return "No section details available yet.";
    }
    
    // Group details by chapter and section
    const groupedDetails: Record<string, Record<string, ExtractedSectionDetail[]>> = {};
    
    for (const detail of allDetails) {
      const chapterKey = `Chapter ${detail.chapterNumber}`;
      const sectionKey = `Section ${detail.sectionNumber}`;
      
      if (!groupedDetails[chapterKey]) {
        groupedDetails[chapterKey] = {};
      }
      
      if (!groupedDetails[chapterKey][sectionKey]) {
        groupedDetails[chapterKey][sectionKey] = [];
      }
      
      groupedDetails[chapterKey][sectionKey].push({
        personName: detail.personName || undefined,
        businessName: detail.businessName || undefined,
        cityName: detail.cityName || undefined,
        jobRole: detail.jobRole || undefined,
        businessType: detail.businessType || undefined
      });
    }
    
    // Format for prompt
    let formattedDetails = "SECTION DETAILS CONTEXT:\n";
    formattedDetails += "Use these details for narrative consistency across sections. Reuse names, businesses, and locations when appropriate.\n\n";
    
    for (const [chapterKey, chapterDetails] of Object.entries(groupedDetails)) {
      formattedDetails += `${chapterKey}:\n`;
      
      for (const [sectionKey, sectionDetails] of Object.entries(chapterDetails)) {
        formattedDetails += `  ${sectionKey}:\n`;
        
        for (const detail of sectionDetails) {
          const parts = [];
          if (detail.personName) parts.push(`Person: ${detail.personName}`);
          if (detail.businessName) parts.push(`Business: ${detail.businessName}`);
          if (detail.cityName) parts.push(`City: ${detail.cityName}`);
          if (detail.jobRole) parts.push(`Role: ${detail.jobRole}`);
          if (detail.businessType) parts.push(`Industry: ${detail.businessType}`);
          
          if (parts.length > 0) {
            formattedDetails += `    - ${parts.join(', ')}\n`;
          }
        }
      }
      formattedDetails += "\n";
    }
    
    return formattedDetails;
  }

  /**
   * Get section details for sections up to (but not including) the current section
   */
  async formatPreviousSectionDetailsForPrompt(bookId: number, currentChapterNumber: number, currentSectionNumber: number): Promise<string> {
    const allDetails = await storage.getBookSectionDetails(bookId);
    
    // Filter to only include details from previous sections
    const previousDetails = allDetails.filter(detail => {
      return (detail.chapterNumber < currentChapterNumber) || 
             (detail.chapterNumber === currentChapterNumber && detail.sectionNumber < currentSectionNumber);
    });
    
    if (previousDetails.length === 0) {
      return "No previous section details available.";
    }
    
    // Group and format similar to the above method
    const groupedDetails: Record<string, Record<string, ExtractedSectionDetail[]>> = {};
    
    for (const detail of previousDetails) {
      const chapterKey = `Chapter ${detail.chapterNumber}`;
      const sectionKey = `Section ${detail.sectionNumber}`;
      
      if (!groupedDetails[chapterKey]) {
        groupedDetails[chapterKey] = {};
      }
      
      if (!groupedDetails[chapterKey][sectionKey]) {
        groupedDetails[chapterKey][sectionKey] = [];
      }
      
      groupedDetails[chapterKey][sectionKey].push({
        personName: detail.personName || undefined,
        businessName: detail.businessName || undefined,
        cityName: detail.cityName || undefined,
        jobRole: detail.jobRole || undefined,
        businessType: detail.businessType || undefined
      });
    }
    
    // Format for prompt
    let formattedDetails = "PREVIOUS SECTION DETAILS:\n";
    formattedDetails += "For consistency, consider reusing these established names, businesses, and locations:\n\n";
    
    for (const [chapterKey, chapterDetails] of Object.entries(groupedDetails)) {
      formattedDetails += `${chapterKey}:\n`;
      
      for (const [sectionKey, sectionDetails] of Object.entries(chapterDetails)) {
        formattedDetails += `  ${sectionKey}:\n`;
        
        for (const detail of sectionDetails) {
          const parts = [];
          if (detail.personName) parts.push(`Person: ${detail.personName}`);
          if (detail.businessName) parts.push(`Business: ${detail.businessName}`);
          if (detail.cityName) parts.push(`City: ${detail.cityName}`);
          if (detail.jobRole) parts.push(`Role: ${detail.jobRole}`);
          if (detail.businessType) parts.push(`Industry: ${detail.businessType}`);
          
          if (parts.length > 0) {
            formattedDetails += `    - ${parts.join(', ')}\n`;
          }
        }
      }
      formattedDetails += "\n";
    }
    
    return formattedDetails;
  }
}
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, Info } from "lucide-react";

const jsonTemplate = `{
  // Core identity
  "title": "string (required, min 3 chars)",
  "subtitle": "string (optional)",
  "description": "string (optional)",
  "genre": "non-fiction/fiction (default: non-fiction)",
  "specialization": "string - Domain focus, e.g. 'technical for non-technical readers'",

  // Creative vision
  "key_message": "string (required) - One-sentence promise or takeaway",
  "tone_voice": "string - friendly/conversational/authoritative",
  "style_guidelines": {
    "reading_level": "string - 8th-grade/professional",
    "complexity_level": "introductory/intermediate/advanced",
    "preferred_person": "first/second/third"
  },
  "unique_selling_points": [
    "string array of selling points"
  ],

  // SEO / searchability
  "keywords": [
    "string array of keywords"
  ],
  "comparable_titles": [
    {
      "title": "string (required)",
      "author": "string (optional)",
      "publisher": "string (optional)",
      "year": "integer (optional)"
    }
  ],

  // Scope & logistics
  "estimated_word_count": "integer (required, min: 100)",
  "chapter_count": "integer (min: 1)",
  "sections_per_chapter": "integer (min: 2)",
  "language": "string (default: 'en')",

  // Runtime knobs
  "deepseek_model": "string (default: 'deepseek-reasoner')",
  "github_repo_visibility": "public/private (default: 'private')",

  // Stakeholders
  "author": {
    "name": "string (required)",
    "bio": "string (optional)",
    "credentials": "string (optional)",
    "website": "string (optional, URI format)",
    "contact_email": "string (optional, email format)",
    "social_handles": {
      "twitter": "string (optional)",
      "linkedin": "string (optional)"
    }
  },
  "target_audience": {
    "persona_name": "string (optional)",
    "description": "string (required)",
    "technical_level": "layperson/beginner/intermediate/advanced (optional)",
    "familiarity_with_topic": "string (optional)",
    "age_range": "string (optional)",
    "professional_background": "string (optional)",
    "primary_goal": "string (optional)"
  },

  // Misc
  "additional_notes": "string (optional)"
}`;

export default function JsonTemplate() {
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(jsonTemplate);
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <Button
          variant="ghost"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full p-0 h-auto"
        >
          <div className="text-left">
            <h3 className="text-lg font-medium text-gray-900">JSON Input Template</h3>
            <p className="text-sm text-gray-500 mt-1">
              Reference this schema structure when creating your book specification
            </p>
          </div>
          <ChevronDown 
            className={`h-4 w-4 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`} 
          />
        </Button>
      </CardHeader>
      
      {isExpanded && (
        <>
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm">
                <Info className="h-4 w-4 text-primary" />
                <span className="text-gray-600">Click on any section to copy the structure</span>
              </div>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                Copy Template
              </Button>
            </div>
          </div>
          <CardContent className="p-4 max-h-96 overflow-y-auto">
            <pre className="font-mono text-xs text-gray-800 bg-white p-4 rounded border border-gray-200 overflow-x-auto">
              <code>{jsonTemplate}</code>
            </pre>
          </CardContent>
        </>
      )}
    </Card>
  );
}

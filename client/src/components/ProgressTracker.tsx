import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Circle, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";

interface ProgressStep {
  number: number;
  title: string;
  description: string;
  status: 'completed' | 'active' | 'pending';
}

interface ProgressTrackerProps {
  currentBook?: any;
  isGenerating: boolean;
}

interface BookProgressHistory {
  id: number;
  bookId: number;
  step: string;
  status: 'started' | 'completed' | 'failed';
  startedAt: string;
  completedAt: string | null;
  errorMessage: string | null;
  metadata: any;
}

const stepMapping = {
  'input_validation': { number: 1, title: "Input Validation", defaultDesc: "JSON schema validation" },
  'database_storage': { number: 2, title: "Database Storage", defaultDesc: "Creating book record" },
  'github_repository': { number: 3, title: "GitHub Repository", defaultDesc: "Setting up repository" },
  'book_outline': { number: 4, title: "Book Outline", defaultDesc: "Generating structure" },
  'chapter_outlines': { number: 5, title: "Chapter Outlines", defaultDesc: "Creating chapter plans" },
  'content_generation': { number: 6, title: "Content Generation", defaultDesc: "Writing content" },
  'content_compilation': { number: 7, title: "Content Compilation", defaultDesc: "Stitching sections together" },
  'front_matter_generation': { number: 8, title: "Front Matter Generation", defaultDesc: "Creating preface, introduction, and table of contents" },
};

export default function ProgressTracker({ currentBook, isGenerating }: ProgressTrackerProps) {
  const { data: progressHistory, isLoading, error } = useQuery({
    queryKey: [`/api/books/${currentBook?.id}/progress-history`],
    enabled: !!currentBook?.id,
    refetchInterval: isGenerating ? 2000 : 5000, // Poll every 2s during generation, 5s when idle
    refetchIntervalInBackground: true, // Continue polling even when tab is not active
    staleTime: 1000, // Consider data stale after 1 second
    gcTime: 30000, // Keep cache for 30 seconds
  });

  const getSteps = (): ProgressStep[] => {
    const defaultSteps: ProgressStep[] = [
      { number: 1, title: "Input Validation", description: "JSON schema validation", status: 'pending' },
      { number: 2, title: "Database Storage", description: "Creating book record", status: 'pending' },
      { number: 3, title: "GitHub Repository", description: "Setting up repository", status: 'pending' },
      { number: 4, title: "Book Outline", description: "Generating structure", status: 'pending' },
      { number: 5, title: "Chapter Outlines", description: "Creating chapter plans", status: 'pending' },
      { number: 6, title: "Content Generation", description: "Writing content", status: 'pending' },
      { number: 7, title: "Content Compilation", description: "Stitching sections together", status: 'pending' },
      { number: 8, title: "Front Matter Generation", description: "Creating preface, introduction, and table of contents", status: 'pending' },
    ];

    if (!progressHistory || !Array.isArray(progressHistory)) {
      return defaultSteps;
    }

    // Create a map of steps from progress history
    const historyMap = new Map<string, BookProgressHistory>();
    progressHistory.forEach((item: BookProgressHistory) => {
      historyMap.set(item.step, item);
    });

    // Update default steps based on progress history
    return defaultSteps.map((step) => {
      const stepKey = Object.keys(stepMapping).find(key => 
        stepMapping[key as keyof typeof stepMapping].number === step.number
      );
      
      if (!stepKey) return step;
      
      const historyItem = historyMap.get(stepKey);
      if (!historyItem) return step;

      let description = step.description;
      let status: 'completed' | 'active' | 'pending' = 'pending';

      if (historyItem.status === 'completed') {
        status = 'completed';
        description = getCompletedDescription(stepKey, historyItem);
      } else if (historyItem.status === 'started') {
        status = 'active';
        description = getActiveDescription(stepKey, historyItem);
      } else if (historyItem.status === 'failed') {
        status = 'pending';
        description = historyItem.errorMessage || 'Failed - retrying...';
      }

      return { ...step, status, description };
    });
  };

  const getCompletedDescription = (stepKey: string, item: BookProgressHistory): string => {
    switch (stepKey) {
      case 'input_validation':
        return 'JSON schema validated';
      case 'database_storage':
        return 'Book record created';
      case 'github_repository':
        const repoName = item.metadata?.repoName;
        return repoName ? `Repository: ${repoName}` : 'Repository created';
      case 'book_outline':
        const outlineLength = item.metadata?.outlineLength;
        return outlineLength ? `Generated ${outlineLength} characters` : 'Outline generated';
      case 'chapter_outlines':
        return 'Chapters outlined';
      case 'content_generation':
        return 'Content generation completed';
      default:
        return 'Completed';
    }
  };

  const getActiveDescription = (stepKey: string, item: BookProgressHistory): string => {
    switch (stepKey) {
      case 'input_validation':
        return 'Validating JSON schema...';
      case 'database_storage':
        return 'Creating book record...';
      case 'github_repository':
        return 'Setting up GitHub repository...';
      case 'book_outline':
        return 'Generating book outline...';
      case 'chapter_outlines':
        return 'Creating chapter outlines...';
      case 'content_generation':
        return 'Generating content...';
      case 'content_compilation':
        return 'Compiling book content...';
      case 'front_matter_generation':
        return 'Creating preface and introduction...';
      default:
        return 'In progress...';
    }
  };

  const steps = getSteps();
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : 0;

  // Show loading state
  if (isLoading && !progressHistory) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="text-lg">Generation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="sticky top-24">
        <CardHeader>
          <CardTitle className="text-lg">Generation Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-red-600">Failed to load progress data</p>
            <p className="text-xs text-gray-500 mt-1">Retrying automatically...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle className="text-lg">Generation Progress</CardTitle>
        {isGenerating && (
          <div className="flex items-center text-xs text-blue-600">
            <Circle className="h-2 w-2 fill-blue-500 text-blue-500 mr-1 animate-pulse" />
            Live updating...
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.number} className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                step.status === 'completed' 
                  ? 'bg-green-500 text-white' 
                  : step.status === 'active'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-500'
              }`}>
                {step.status === 'completed' ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-xs font-medium">{step.number}</span>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  step.status === 'pending' ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {step.title}
                </p>
                <p className={`text-xs ${
                  step.status === 'pending' ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Overall Progress */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Overall Progress</span>
            <span className="text-sm font-medium text-primary">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="pt-4 border-t border-gray-200">
          <Link href="/books">
            <Button variant="outline" className="w-full">
              <BookOpen className="h-4 w-4 mr-2" />
              Manage Books
            </Button>
          </Link>
        </div>

        {/* API Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">GitHub API</span>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
              Connected
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">DeepSeek API</span>
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              <Circle className="h-2 w-2 fill-green-500 text-green-500 mr-1" />
              Connected
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
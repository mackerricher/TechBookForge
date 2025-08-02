import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Sparkles, HelpCircle, Code, Book, FileText, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import ProgressTracker from "@/components/ProgressTracker";
import GenerationLog from "@/components/GenerationLog";
import ServerLogs from "@/components/ServerLogs";
import { useBookGeneration } from "@/hooks/useBookGeneration";

export default function BookGenerator() {
  const [bookTitle, setBookTitle] = useState("");
  const [bookSubtitle, setBookSubtitle] = useState("");
  const [uniqueValueProp, setUniqueValueProp] = useState("");
  const [customToneVoice, setCustomToneVoice] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [lastGeneratedSpec, setLastGeneratedSpec] = useState<any>(null);
  const { toast } = useToast();
  const { currentBook, isGenerating: hookIsGenerating, logs, progress } = useBookGeneration();

  const handleGenerate = async () => {
    if (!bookTitle.trim()) {
      toast({
        title: "Title Required",
        description: "Please enter a book title to continue.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      const response = await fetch("/api/books/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: bookTitle.trim(),
          subtitle: bookSubtitle.trim(),
          uniqueValueProp: uniqueValueProp.trim(),
          customToneVoice: customToneVoice.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to start book generation");
      }

      const result = await response.json();
      
      // Store the generated specification for display
      if (result.bookSpec) {
        setLastGeneratedSpec(result.bookSpec);
      }
      
      toast({
        title: "Book Generation Started",
        description: `Book "${bookTitle}" is now being generated with AI assistance.`,
      });

      // Clear form
      setBookTitle("");
      setBookSubtitle("");
      setUniqueValueProp("");
      setCustomToneVoice("");
      
    } catch (error) {
      console.error("Generation error:", error);
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.ctrlKey) {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Book Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Generate professional non-fiction books with AI assistance
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/books">
              <Button variant="outline" size="sm">
                <Book className="h-4 w-4 mr-2" />
                Books
              </Button>
            </Link>
            <Link href="/review">
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Book Review
              </Button>
            </Link>
            <Link href="/rewrite">
              <Button variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Rewrite
              </Button>
            </Link>
            <Link href="/content-review">
              <Button variant="outline" size="sm">
                <Code className="h-4 w-4 mr-2" />
                Content Review
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLogs(!showLogs)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              {showLogs ? "Hide Logs" : "Show Logs"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Book Creation Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="h-5 w-5 mr-2 text-blue-600" />
              Create Your Book
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Book Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter your book title..."
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="subtitle">Book Subtitle (Optional)</Label>
                <Input
                  id="subtitle"
                  placeholder="Enter your book subtitle..."
                  value={bookSubtitle}
                  onChange={(e) => setBookSubtitle(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="unique-value-prop">Unique Value Proposition (Optional)</Label>
                <Input
                  id="unique-value-prop"
                  placeholder="What makes your book unique?"
                  value={uniqueValueProp}
                  onChange={(e) => setUniqueValueProp(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="custom-tone-voice">Custom Tone & Voice (Optional)</Label>
                <Textarea
                  id="custom-tone-voice"
                  placeholder="Describe your preferred writing style and tone. If left empty, a professional standard tone will be used."
                  value={customToneVoice}
                  onChange={(e) => setCustomToneVoice(e.target.value)}
                  className="mt-1 min-h-[80px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: "Conversational and friendly, with technical depth but accessible language"
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Automated Book Generation
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Our AI will automatically create a professional roughly, 300 page book with:
              </p>
              <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                <li>• 21 chapters with 8 sections each</li>
                <li>• Research-backed content with realistic case studies</li>
                <li>• Professional writing style with expert credentials</li>
                <li>• Legal disclaimers and best-seller positioning</li>
                <li>• Private GitHub repository with complete manuscript</li>
              </ul>
            </div>

            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !bookTitle.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating Book...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Generate Book with AI
                </>
              )}
            </Button>
            
            {bookTitle.trim() && (
              <p className="text-xs text-gray-500 text-center">
                Press Ctrl+Enter to generate quickly
              </p>
            )}
          </CardContent>
        </Card>

        {/* JSON Specification Display */}
        {lastGeneratedSpec && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Code className="h-5 w-5 mr-2 text-green-600" />
                Generated Book Specification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                <pre className="text-sm overflow-x-auto whitespace-pre-wrap">
                  {JSON.stringify(lastGeneratedSpec, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Tracker */}
        {currentBook && (
          <ProgressTracker isGenerating={hookIsGenerating || isGenerating} />
        )}

        {/* Generation Log */}
        {logs.length > 0 && (
          <GenerationLog logs={logs} />
        )}

        {/* Server Logs */}
        {showLogs && <ServerLogs />}
      </div>
    </div>
  );
}
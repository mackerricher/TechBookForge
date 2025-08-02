import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';

export default function BookReview() {
  const [bookTitle, setBookTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const [originalBookContent, setOriginalBookContent] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: async (data: { title: string; file: File }) => {
      // Store the original book content for potential rewrite
      const fileContent = await data.file.text();
      setOriginalBookContent(fileContent);

      const formData = new FormData();
      formData.append('bookTitle', data.title);
      formData.append('bookFile', data.file);
      
      const response = await fetch('/api/books/review', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process book review');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Review Completed!",
        description: "Your book review has been generated and saved to GitHub.",
      });
    },
    onError: (error) => {
      toast({
        title: "Review Failed",
        description: error.message || "Something went wrong with the book review.",
        variant: "destructive",
      });
    },
  });

  const rewriteMutation = useMutation({
    mutationFn: async (data: {
      bookTitle: string;
      originalBookContent: string;
      reviewContent: string;
      repoOwner: string;
      repoName: string;
    }) => {
      const response = await fetch('/api/books/rewrite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to rewrite book');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Book Rewrite Completed!",
        description: "Your rewritten book has been generated and saved to the GitHub repository.",
      });
    },
    onError: (error) => {
      toast({
        title: "Rewrite Failed",
        description: error.message || "Something went wrong with the book rewrite.",
        variant: "destructive",
      });
    },
  });

  const handleRewrite = () => {
    if (reviewMutation.data && originalBookContent) {
      rewriteMutation.mutate({
        bookTitle,
        originalBookContent,
        reviewContent: reviewMutation.data.fullReviewContent,
        repoOwner: reviewMutation.data.repoOwner,
        repoName: reviewMutation.data.repoName,
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.md')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a Markdown (.md) file.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!bookTitle.trim()) {
      toast({
        title: "Missing Title",
        description: "Please enter a book title.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFile) {
      toast({
        title: "Missing File",
        description: "Please select a Markdown file to review.",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({ title: bookTitle, file: selectedFile });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Header */}
      <header className="border-b bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                ← Back to Home
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Book Review
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Introduction Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Professional Book Review Service
              </CardTitle>
              <CardDescription>
                Upload your complete book in Markdown format to receive a comprehensive review analysis including quality assessment, redundancy check, error detection, and best-seller potential evaluation.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Review Form */}
          <Card>
            <CardHeader>
              <CardTitle>Submit Book for Review</CardTitle>
              <CardDescription>
                Provide your book title and upload the complete manuscript as a .md file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Book Title Input */}
                <div className="space-y-2">
                  <Label htmlFor="bookTitle">Book Title</Label>
                  <Input
                    id="bookTitle"
                    type="text"
                    placeholder="Enter your book title..."
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    disabled={reviewMutation.isPending}
                  />
                </div>

                {/* File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="bookFile">Book Manuscript (Markdown)</Label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center">
                    <input
                      id="bookFile"
                      type="file"
                      accept=".md"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={reviewMutation.isPending}
                    />
                    <label
                      htmlFor="bookFile"
                      className="cursor-pointer flex flex-col items-center space-y-2"
                    >
                      <Upload className="h-8 w-8 text-slate-400" />
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                        {selectedFile ? selectedFile.name : "Click to upload Markdown file"}
                      </span>
                      <span className="text-xs text-slate-500">
                        Supports .md files up to 50MB
                      </span>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Analyzing Book...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Generate Review
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Success Result */}
          {reviewMutation.isSuccess && reviewMutation.data && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                  <CheckCircle className="h-5 w-5" />
                  Review Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-green-700 dark:text-green-300">
                  Your book review has been generated and saved to a private GitHub repository.
                </p>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                  <p className="font-medium text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Preview:
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-mono">
                    {reviewMutation.data.reviewPreview}
                  </p>
                </div>
                <div className="space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full"
                  >
                    <a 
                      href={reviewMutation.data.repoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View Full Review on GitHub
                    </a>
                  </Button>
                  <Button
                    onClick={handleRewrite}
                    disabled={rewriteMutation.isPending || !originalBookContent}
                    className="w-full"
                    variant="default"
                  >
                    {rewriteMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Rewriting Book...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Rewrite Book with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Rewrite Success Result */}
          {rewriteMutation.isSuccess && rewriteMutation.data && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <RefreshCw className="h-5 w-5" />
                  Book Rewrite Complete!
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-blue-700 dark:text-blue-300">
                  Your book has been completely rewritten using Claude Sonnet 4 based on the review feedback. The rewritten version (~30,000 words) incorporates all review recommendations.
                </p>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border">
                  <p className="font-medium text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Rewrite Preview:
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-mono">
                    {rewriteMutation.data.rewritePreview}
                  </p>
                </div>
                <Button
                  asChild
                  variant="outline"
                  className="w-full"
                >
                  <a 
                    href={rewriteMutation.data.repoUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Rewritten Book on GitHub
                  </a>
                </Button>
                <div className="text-xs text-blue-600 dark:text-blue-400 p-3 bg-blue-100 dark:bg-blue-900 rounded">
                  📁 Repository now contains: original_book.md, book_review.md, and rewritten_book.md
                </div>
              </CardContent>
            </Card>
          )}

          {/* What You'll Get Section */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Receive</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Quality Analysis</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Overall rating, repetition check, error detection, and writing quality assessment
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Commercial Assessment</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Best-seller potential percentage and market positioning analysis
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Actionable Feedback</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Specific recommendations for improvement and publication readiness
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">GitHub Repository</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Complete review saved as book_review.md in a private repository
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
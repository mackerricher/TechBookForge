import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, RefreshCw, ExternalLink, BookOpen, FileCheck } from 'lucide-react';
import { Link } from 'wouter';
import { Textarea } from '@/components/ui/textarea';

export default function BookRewrite() {
  const [bookTitle, setBookTitle] = useState('');
  const [selectedBookFile, setSelectedBookFile] = useState<File | null>(null);
  const [selectedReviewFile, setSelectedReviewFile] = useState<File | null>(null);
  const [toneVoice, setToneVoice] = useState('');
  const { toast } = useToast();

  const rewriteMutation = useMutation({
    mutationFn: async (data: { title: string; bookFile: File; reviewFile: File; toneVoice?: string }) => {
      const bookContent = await data.bookFile.text();
      const reviewContent = await data.reviewFile.text();

      const response = await fetch('/api/books/rewrite-standalone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookTitle: data.title,
          originalBookContent: bookContent,
          reviewContent: reviewContent,
          toneVoice: data.toneVoice,
        }),
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
        description: "Your rewritten book has been generated and saved to GitHub.",
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

  const handleBookFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        setSelectedBookFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a Markdown (.md) file for the book.",
          variant: "destructive",
        });
      }
    }
  };

  const handleReviewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'text/markdown' || file.name.endsWith('.md')) {
        setSelectedReviewFile(file);
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a Markdown (.md) file for the review.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bookTitle.trim() && selectedBookFile && selectedReviewFile) {
      rewriteMutation.mutate({ 
        title: bookTitle.trim(),
        bookFile: selectedBookFile,
        reviewFile: selectedReviewFile,
        toneVoice: toneVoice.trim() || undefined
      });
    }
  };

  const canSubmit = bookTitle.trim() && selectedBookFile && selectedReviewFile && !rewriteMutation.isPending;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            AI Book Rewriter
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Upload your book and review files to get a completely rewritten version using Claude Sonnet 4. 
            Perfect for incorporating comprehensive feedback into your manuscript.
          </p>
        </div>

        {/* Main Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Rewrite Your Book
            </CardTitle>
            <CardDescription>
              Upload both your original book and review files to generate an improved, rewritten version
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Book Title */}
              <div className="space-y-2">
                <Label htmlFor="book-title">Book Title</Label>
                <Input
                  id="book-title"
                  type="text"
                  placeholder="Enter your book title..."
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Tone and Voice (Optional) */}
              <div className="space-y-2">
                <Label htmlFor="tone-voice">Tone & Voice (Optional)</Label>
                <Textarea
                  id="tone-voice"
                  placeholder="Describe the specific tone and voice you want Claude to maintain while rewriting (e.g., 'conversational and approachable', 'authoritative expert', 'friendly mentor', etc.)"
                  value={toneVoice}
                  onChange={(e) => setToneVoice(e.target.value)}
                  className="w-full h-20"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Claude will strategically incorporate this tone throughout the rewritten book while maintaining professional quality
                </p>
              </div>

              {/* File Upload Section */}
              <div className="grid md:grid-cols-2 gap-6">
                {/* Book File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="book-file">Original Book File</Label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                    <input
                      id="book-file"
                      type="file"
                      accept=".md,text/markdown"
                      onChange={handleBookFileChange}
                      className="hidden"
                    />
                    <label htmlFor="book-file" className="cursor-pointer">
                      <BookOpen className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      {selectedBookFile ? (
                        <div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ✓ {selectedBookFile.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {(selectedBookFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Click to upload book (.md)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            Markdown files only
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>

                {/* Review File Upload */}
                <div className="space-y-2">
                  <Label htmlFor="review-file">Review File</Label>
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-6 text-center hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
                    <input
                      id="review-file"
                      type="file"
                      accept=".md,text/markdown"
                      onChange={handleReviewFileChange}
                      className="hidden"
                    />
                    <label htmlFor="review-file" className="cursor-pointer">
                      <FileCheck className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                      {selectedReviewFile ? (
                        <div>
                          <p className="text-sm font-medium text-green-600 dark:text-green-400">
                            ✓ {selectedReviewFile.name}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            {(selectedReviewFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            Click to upload review (.md)
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                            Markdown files only
                          </p>
                        </div>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={!canSubmit}
                className="w-full h-12"
                size="lg"
              >
                {rewriteMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Rewriting Book with Claude Sonnet 4...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Rewrite Book (~30,000 words)
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Success Result */}
        {rewriteMutation.isSuccess && rewriteMutation.data && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800 dark:text-green-200">
                <RefreshCw className="h-5 w-5" />
                Book Rewrite Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-green-700 dark:text-green-300">
                Your book has been completely rewritten using Claude Sonnet 4 with best-seller optimization. 
                The rewritten version (~30,000 words) strictly follows all review recommendations and maximizes commercial appeal.
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
              <div className="text-xs text-green-600 dark:text-green-400 p-3 bg-green-100 dark:bg-green-900 rounded">
                📁 Repository contains: original_book.md, book_review.md, and rewrite.md
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Overview */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">1. Upload Files</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Upload your original book and review markdown files
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">2. AI Rewriting</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Claude Sonnet 4 rewrites with best-seller optimization and strict review compliance
                </p>
              </div>
              <div className="text-center">
                <div className="bg-blue-100 dark:bg-blue-900 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ExternalLink className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold mb-2">3. GitHub Repository</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Get all files organized in a private GitHub repository
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
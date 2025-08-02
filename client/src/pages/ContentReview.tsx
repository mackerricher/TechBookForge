import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { AlertCircle, CheckCircle, Info } from "lucide-react";

interface FactualAccuracyIssue {
  type: 'outdated_ui' | 'specific_claim' | 'factual_error' | 'needs_verification';
  severity: 'high' | 'medium' | 'low';
  originalText: string;
  suggestedReplacement: string;
  reason: string;
  line?: number;
}

interface ReviewResult {
  originalContent: string;
  improvedContent: string;
  issues: FactualAccuracyIssue[];
  summary: {
    totalIssues: number;
    highSeverityIssues: number;
    mediumSeverityIssues: number;
    lowSeverityIssues: number;
  };
}

export default function ContentReview() {
  const [content, setContent] = useState("");
  const [topic, setTopic] = useState("");
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReview = async () => {
    if (!content.trim()) {
      setError("Please provide content to review");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiRequest('/api/content/review', {
        method: 'POST',
        body: JSON.stringify({ content, topic: topic || undefined }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`Review failed: ${response.status}`);
      }

      const result = await response.json();
      setReviewResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review failed");
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="h-4 w-4" />;
      case 'medium': return <Info className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Content Factual Accuracy Review</h1>
        <p className="text-gray-600">Review content for potential factual accuracy issues and get improvement suggestions.</p>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle>Content to Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Content</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste your content here for factual accuracy review..."
                className="min-h-[200px]"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Topic (optional)</label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Describe the topic or domain for enhanced verification..."
                className="min-h-[60px]"
              />
            </div>
            
            <Button 
              onClick={handleReview} 
              disabled={isLoading || !content.trim()}
              className="w-full"
            >
              {isLoading ? "Reviewing..." : "Review Content"}
            </Button>
            
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {reviewResult && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Review Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{reviewResult.summary.totalIssues}</div>
                    <div className="text-sm text-gray-600">Total Issues</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{reviewResult.summary.highSeverityIssues}</div>
                    <div className="text-sm text-gray-600">High Severity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{reviewResult.summary.mediumSeverityIssues}</div>
                    <div className="text-sm text-gray-600">Medium Severity</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{reviewResult.summary.lowSeverityIssues}</div>
                    <div className="text-sm text-gray-600">Low Severity</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Issues List */}
            {reviewResult.issues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Identified Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reviewResult.issues.map((issue, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(issue.severity)}
                            <Badge className={getSeverityColor(issue.severity)}>
                              {issue.severity.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-gray-600">{issue.type}</span>
                          </div>
                          {issue.line && (
                            <span className="text-sm text-gray-500">Line {issue.line}</span>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <strong>Original:</strong> <span className="bg-red-50 px-2 py-1 rounded">{issue.originalText}</span>
                          </div>
                          <div>
                            <strong>Suggested:</strong> <span className="bg-green-50 px-2 py-1 rounded">{issue.suggestedReplacement}</span>
                          </div>
                          <div>
                            <strong>Reason:</strong> <span className="text-gray-700">{issue.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Improved Content */}
            <Card>
              <CardHeader>
                <CardTitle>Improved Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Original Content</h4>
                    <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm">{reviewResult.originalContent}</pre>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <h4 className="font-semibold mb-2">Improved Content</h4>
                    <div className="bg-green-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm">{reviewResult.improvedContent}</pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
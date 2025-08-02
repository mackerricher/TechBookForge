import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Trash2, BookOpen, Settings, HelpCircle, Play, Pause, Search, ChevronDown, ChevronUp } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

interface Book {
  id: number;
  title: string;
  subtitle?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface ProgressData {
  completedSteps: number;
  totalSteps: number;
  currentStep?: string;
  status: string;
}

export default function BooksPage() {
  const [deletingBookId, setDeletingBookId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all books
  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ['/api/books'],
  });

  // Delete book mutation
  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete book');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
      toast({
        title: "Book deleted",
        description: "The book and all associated data have been removed.",
      });
      setDeletingBookId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete the book.",
        variant: "destructive",
      });
      setDeletingBookId(null);
    },
  });



  const handleDeleteBook = (bookId: number) => {
    setDeletingBookId(bookId);
    deleteMutation.mutate(bookId);
  };

  const getProgressPercentage = (progress: ProgressData | undefined) => {
    if (!progress) return 0;
    return Math.round((progress.completedSteps / progress.totalSteps) * 100);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'generating': 'bg-blue-100 text-blue-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
      }`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Books</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <h1 className="text-xl font-semibold text-foreground">BookGen AI</h1>
                </div>
              </Link>
              <span className="text-sm text-muted-foreground font-medium">Books Management</span>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Books</h1>
        </div>

        {books.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No books yet</h3>
              <p className="text-muted-foreground mb-4">
                Start by generating your first book using the Book Generator.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {books.map((book) => (
              <BookRow 
                key={book.id} 
                book={book} 
                onDelete={handleDeleteBook}
                isDeleting={deletingBookId === book.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BookRow({ 
  book, 
  onDelete, 
  isDeleting 
}: { 
  book: Book; 
  onDelete: (id: number) => void;
  isDeleting: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [redundancyResult, setRedundancyResult] = useState<string | null>(null);
  const [isRedundancyOpen, setIsRedundancyOpen] = useState(false);
  
  const { data: progress } = useQuery<ProgressData>({
    queryKey: ['/api/books', book.id, 'progress'],
  });

  // Resume book generation mutation
  const resumeMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await apiRequest('POST', `/api/books/${bookId}/resume`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Generation Resumed",
        description: `"${book.title}" generation has been resumed and will continue from where it left off.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
    onError: (error: any) => {
      toast({
        title: "Resume Failed",
        description: error.message || "Failed to resume book generation",
        variant: "destructive",
      });
    },
  });

  // Pause book generation mutation
  const pauseMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await apiRequest('POST', `/api/books/${bookId}/pause`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Generation Paused",
        description: `"${book.title}" generation has been paused and can now be resumed.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
    onError: (error: any) => {
      toast({
        title: "Pause Failed",
        description: error.message || "Failed to pause book generation",
        variant: "destructive",
      });
    },
  });

  // Redundancy check mutation
  const redundancyMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const response = await apiRequest('POST', `/api/books/${bookId}/redundancy-check`);
      return await response.json();
    },
    onSuccess: (data) => {
      setRedundancyResult(data.analysis);
      setIsRedundancyOpen(true);
      toast({
        title: "Redundancy Check Complete",
        description: `Analysis complete for "${book.title}". Check the results below.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Redundancy Check Failed",
        description: error.message || "Failed to perform redundancy check",
        variant: "destructive",
      });
    },
  });

  const progressPercentage = progress 
    ? Math.round((progress.completedSteps / progress.totalSteps) * 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-foreground">{book.title}</h3>
              {getStatusBadge(book.status)}
            </div>
            
            {book.subtitle && (
              <p className="text-muted-foreground mb-3">{book.subtitle}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Created: {new Date(book.createdAt).toLocaleDateString()}</span>
              <span>Progress: {progressPercentage}%</span>
              {progress?.currentStep && (
                <span>Current: {progress.currentStep.replace('_', ' ')}</span>
              )}
            </div>
            
            {/* Progress bar */}
            <div className="mt-3 w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="ml-6 flex gap-2">
            {/* Pause button - only show if book is currently generating */}
            {book.status === 'generating' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => pauseMutation.mutate(book.id)}
                disabled={pauseMutation.isPending}
              >
                {pauseMutation.isPending ? (
                  "Pausing..."
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                )}
              </Button>
            )}
            
            {/* Resume button - only show if book is incomplete and not currently generating */}
            {book.status !== 'completed' && book.status !== 'generating' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => resumeMutation.mutate(book.id)}
                disabled={resumeMutation.isPending}
              >
                {resumeMutation.isPending ? (
                  "Resuming..."
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                )}
              </Button>
            )}
            
            {/* Redundancy Check button - only show for completed books */}
            {book.status === 'completed' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => redundancyMutation.mutate(book.id)}
                disabled={redundancyMutation.isPending}
              >
                {redundancyMutation.isPending ? (
                  "Checking..."
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Redundancy Check
                  </>
                )}
              </Button>
            )}
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    "Deleting..."
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Book</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete "{book.title}"? This will permanently 
                    remove the book and all associated data including chapters, sections, 
                    progress history, and GitHub repository references. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => onDelete(book.id)}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        
        {/* Redundancy Check Results - Collapsible section */}
        {redundancyResult && (
          <div className="mt-4 pt-4 border-t border-border">
            <Collapsible open={isRedundancyOpen} onOpenChange={setIsRedundancyOpen}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between p-0 h-auto text-sm font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Redundancy Check Results
                  </span>
                  {isRedundancyOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3">
                <div className="bg-muted rounded-lg p-4 text-sm">
                  <pre className="whitespace-pre-wrap text-foreground font-mono">
                    {redundancyResult}
                  </pre>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusBadge(status: string) {
  const statusColors = {
    'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'generating': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'completed': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'failed': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      statusColors[status as keyof typeof statusColors] || 'bg-muted text-muted-foreground'
    }`}>
      {status}
    </span>
  );
}
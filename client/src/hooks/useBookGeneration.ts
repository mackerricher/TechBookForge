import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  description: string;
  timestamp: string;
}

export interface Progress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
}

export function useBookGeneration() {
  const [currentBookId, setCurrentBookId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Get all books to find the most recent one
  const { data: books } = useQuery({
    queryKey: ['/api/books'],
    refetchInterval: 5000, // Refresh book list every 5 seconds
  });

  // Auto-select the most recent book if none is selected
  useEffect(() => {
    if (!currentBookId && books && Array.isArray(books) && books.length > 0) {
      const mostRecentBook = books[0]; // Books are ordered by creation date desc
      setCurrentBookId(mostRecentBook.id);
    }
  }, [currentBookId, books]);

  const startGenerationMutation = useMutation({
    mutationFn: async (bookSpec: any) => {
      const response = await apiRequest("POST", "/api/books/generate", bookSpec);
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentBookId(data.bookId);
      queryClient.invalidateQueries({ queryKey: ['/api/books'] });
    },
  });

  const { data: bookStatus } = useQuery({
    queryKey: ['/api/books', currentBookId, 'status'],
    enabled: !!currentBookId,
    refetchInterval: 2000, // Poll every 2 seconds during generation
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['/api/books', currentBookId, 'logs'],
    enabled: !!currentBookId,
    refetchInterval: 2000,
  });

  const startGeneration = async (bookSpec: any) => {
    return startGenerationMutation.mutateAsync(bookSpec);
  };

  const progress: Progress = (bookStatus as any)?.progress || {
    currentStep: 0,
    totalSteps: 6,
    percentage: 0
  };

  // Use the most recent book from the books list if bookStatus doesn't have book data
  const currentBookData = (bookStatus as any)?.book || (books && Array.isArray(books) && books.length > 0 ? books[0] : null);

  return {
    startGeneration,
    currentBook: currentBookData,
    isGenerating: startGenerationMutation.isPending || currentBookData?.status === 'generating',
    logs: logs as LogEntry[],
    progress,
    error: startGenerationMutation.error
  };
}

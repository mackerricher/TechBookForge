import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

interface StateRefresherOptions {
  currentBookId?: number;
  isGenerating?: boolean;
  refreshInterval?: number;
}

export function useStateRefresher({ currentBookId, isGenerating = false, refreshInterval = 5000 }: StateRefresherOptions) {
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // API Keys validation - refresh every 30 seconds
  const { data: apiKeys } = useQuery({
    queryKey: ['/api/validate-keys'],
    refetchInterval: 30000,
    staleTime: 25000,
  });

  // Books list - dynamic refresh based on generation status
  const { data: books, isLoading: booksLoading } = useQuery({
    queryKey: ['/api/books'],
    refetchInterval: isGenerating ? 3000 : refreshInterval, // Faster during generation
    refetchIntervalInBackground: true,
    staleTime: 2000,
  });

  // Progress history for current book - aggressive refresh during generation
  const { data: progressHistory, isLoading: progressLoading } = useQuery({
    queryKey: [`/api/books/${currentBookId}/progress-history`],
    enabled: !!currentBookId,
    refetchInterval: isGenerating ? 2000 : 8000, // Very fast during generation
    refetchIntervalInBackground: true,
    staleTime: 1000,
    gcTime: 60000, // Keep progress data longer
  });

  // Generation logs - moderate refresh rate
  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['/api/logs'],
    refetchInterval: isGenerating ? 4000 : 10000,
    refetchIntervalInBackground: true,
    staleTime: 3000,
  });

  // Manual refresh function for user-triggered updates
  const refreshAll = () => {
    const refreshPromises = [
      queryClient.invalidateQueries({ queryKey: ['/api/books'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/validate-keys'] }),
      queryClient.invalidateQueries({ queryKey: ['/api/logs'] }),
    ];

    if (currentBookId) {
      refreshPromises.push(
        queryClient.invalidateQueries({ queryKey: [`/api/books/${currentBookId}/progress-history`] })
      );
    }

    Promise.all(refreshPromises).then(() => {
      setLastRefresh(new Date());
    });
  };

  // Auto-refresh when generation status changes
  useEffect(() => {
    if (isGenerating) {
      // Immediately refresh when generation starts
      refreshAll();
    }
  }, [isGenerating]);

  // Connection health monitoring
  const isHealthy = !!(apiKeys?.github && apiKeys?.deepseek);
  const isLoading = booksLoading || progressLoading || logsLoading;

  return {
    // Data
    books,
    progressHistory,
    logs,
    apiKeys,
    
    // State
    isLoading,
    isHealthy,
    lastRefresh,
    
    // Actions
    refreshAll,
    
    // Computed values
    refreshRate: isGenerating ? 'High (2-3s)' : 'Normal (5-10s)',
    nextRefresh: new Date(lastRefresh.getTime() + (isGenerating ? 2000 : refreshInterval)),
  };
}
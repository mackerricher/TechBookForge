import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, Terminal } from 'lucide-react';

interface ServerLog {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  bookId?: number;
  step?: number;
  message: string;
  details?: string;
}

interface ServerLogsProps {
  bookId?: number;
  autoRefresh?: boolean;
}

export default function ServerLogs({ bookId, autoRefresh = true }: ServerLogsProps) {
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (bookId) queryParams.append('bookId', bookId.toString());
      queryParams.append('limit', '50');
      
      const response = await fetch(`/api/logs?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Failed to fetch server logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 2000); // Refresh every 2 seconds
      return () => clearInterval(interval);
    }
  }, [bookId, autoRefresh]);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'success': return 'bg-green-100 text-green-800 border-green-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '🔵';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Terminal className="h-4 w-4" />
          Server Logs {bookId && `(Book ${bookId})`}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchLogs}
          disabled={loading}
          className="h-8 w-8 p-0"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No logs available
              </div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="text-sm mt-0.5">
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getLevelColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.step && (
                        <Badge variant="outline" className="text-xs">
                          Step {log.step}
                        </Badge>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-gray-900 break-words">
                      {log.message}
                    </div>
                    {log.details && (
                      <div className="text-xs text-gray-600 mt-1 break-words">
                        {log.details}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Info, CheckCircle, AlertCircle, Database, LoaderPinwheel } from "lucide-react";

interface LogEntry {
  id: string;
  type: 'info' | 'success' | 'error' | 'warning';
  title: string;
  description: string;
  timestamp: string;
}

interface GenerationLogProps {
  logs: LogEntry[];
}

const getLogIcon = (type: string) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'database':
      return <Database className="h-4 w-4 text-green-500" />;
    case 'loading':
      return <LoaderPinwheel className="h-4 w-4 text-primary animate-spin" />;
    default:
      return <Info className="h-4 w-4 text-primary" />;
  }
};

const getLogBackgroundColor = (type: string) => {
  switch (type) {
    case 'success':
    case 'database':
      return 'bg-gray-50';
    case 'error':
      return 'bg-red-50';
    case 'warning':
      return 'bg-yellow-50';
    case 'loading':
      return 'bg-blue-50';
    default:
      return 'bg-gray-50';
  }
};

export default function GenerationLog({ logs }: GenerationLogProps) {
  const defaultLogs: LogEntry[] = [
    {
      id: '1',
      type: 'success',
      title: 'JSON input validated successfully',
      description: 'Book specification meets all schema requirements',
      timestamp: new Date().toLocaleString()
    },
    {
      id: '2',
      type: 'database',
      title: 'Database records created',
      description: 'Book ID: 42, Author ID: 15, Audience ID: 8',
      timestamp: new Date().toLocaleString()
    },
    {
      id: '3',
      type: 'loading',
      title: 'Creating GitHub repository...',
      description: 'Repository: "ai-for-everyone-guide"',
      timestamp: new Date().toLocaleString()
    }
  ];

  const displayLogs = logs.length > 0 ? logs : defaultLogs;

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <CardTitle className="text-xl">Generation Log</CardTitle>
        <p className="text-sm text-gray-500">
          Real-time updates from the book generation process
        </p>
      </CardHeader>
      
      <CardContent className="p-6">
        <ScrollArea className="h-64">
          <div className="space-y-4">
            {displayLogs.map((log) => (
              <div 
                key={log.id} 
                className={`flex items-start space-x-3 p-3 rounded-lg ${getLogBackgroundColor(log.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getLogIcon(log.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{log.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{log.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{log.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

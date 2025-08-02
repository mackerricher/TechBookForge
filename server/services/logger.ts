// Real-time logging service for book generation
export class LoggerService {
  private static logs: Array<{
    timestamp: string;
    level: 'info' | 'success' | 'error' | 'warning';
    bookId?: number;
    step?: number;
    message: string;
    details?: string;
  }> = [];

  static log(level: 'info' | 'success' | 'error' | 'warning', message: string, bookId?: number, step?: number, details?: string) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      bookId,
      step,
      details
    };
    
    this.logs.unshift(logEntry);
    
    // Keep only last 1000 logs to prevent memory issues
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000);
    }

    // Console output with emojis for visual clarity
    const emoji = {
      info: '🔵',
      success: '✅',
      error: '❌',
      warning: '⚠️'
    }[level];

    const stepInfo = step ? ` [Step ${step}]` : '';
    const bookInfo = bookId ? ` [Book ${bookId}]` : '';
    
    console.log(`${emoji}${stepInfo}${bookInfo} ${message}${details ? ` - ${details}` : ''}`);
  }

  static getRecentLogs(bookId?: number, limit: number = 100) {
    let filteredLogs = this.logs;
    
    if (bookId) {
      filteredLogs = this.logs.filter(log => !log.bookId || log.bookId === bookId);
    }
    
    return filteredLogs.slice(0, limit);
  }

  static getBookProgress(bookId: number) {
    const bookLogs = this.logs.filter(log => log.bookId === bookId);
    
    // Find the highest completed step
    const completedSteps = bookLogs
      .filter(log => log.level === 'success' && log.step)
      .map(log => log.step!)
      .sort((a, b) => b - a);
    
    // Find current active step
    const activeLogs = bookLogs
      .filter(log => log.level === 'info' && log.step)
      .map(log => log.step!)
      .sort((a, b) => b - a);
    
    // Find any error steps
    const errorSteps = bookLogs
      .filter(log => log.level === 'error' && log.step)
      .map(log => log.step!);
    
    const highestCompleted = completedSteps[0] || 0;
    const currentActive = activeLogs[0] || (highestCompleted + 1);
    const hasErrors = errorSteps.length > 0;
    
    return {
      completedSteps: completedSteps.length,
      currentStep: hasErrors ? errorSteps[0] : currentActive,
      totalSteps: 10,
      hasErrors,
      percentage: Math.round((highestCompleted / 10) * 100),
      lastActivity: bookLogs[0]?.timestamp
    };
  }

  static clearBookLogs(bookId: number) {
    this.logs = this.logs.filter(log => log.bookId !== bookId);
  }
}
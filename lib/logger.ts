type LogLevel = 'info' | 'warn' | 'error';
type LogCategory = 'ai' | 'latex' | 'typst' | 'system' | 'yjs' | 'git';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
}

class Logger {
  private logs: Map<LogCategory, LogEntry[]> = new Map([
    ['ai', []],
    ['latex', []], 
    ['typst', []],
    ['system', []],
    ['yjs', []],
    ['git', []]
  ]);
  
  private maxLogsPerCategory = 500;
  private listeners: Set<(category: LogCategory, logs: LogEntry[]) => void> = new Set();

  private addEntry(category: LogCategory, level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data
    };

    const categoryLogs = this.logs.get(category)!;
    categoryLogs.push(entry);
    
    // Keep only the last N logs per category
    if (categoryLogs.length > this.maxLogsPerCategory) {
      categoryLogs.splice(0, categoryLogs.length - this.maxLogsPerCategory);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(category, categoryLogs));

    // Also log to console for debugging (but only in development)
    if (process.env.NODE_ENV === 'development') {
      const prefix = `[${category.toUpperCase()}] ${level.toUpperCase()}:`;
      switch (level) {
        case 'error':
          console.error(prefix, message, data);
          break;
        case 'warn':
          console.warn(prefix, message, data);
          break;
        default:
          console.log(prefix, message, data);
      }
    }
  }

  info(category: LogCategory, message: string, data?: any) {
    this.addEntry(category, 'info', message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.addEntry(category, 'warn', message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    this.addEntry(category, 'error', message, data);
  }

  getLogs(category: LogCategory): LogEntry[] {
    return this.logs.get(category) || [];
  }

  subscribe(listener: (category: LogCategory, logs: LogEntry[]) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(category?: LogCategory) {
    if (category) {
      this.logs.set(category, []);
      this.listeners.forEach(listener => listener(category, []));
    } else {
      this.logs.forEach((_, cat) => this.logs.set(cat, []));
      this.listeners.forEach(listener => {
        ['ai', 'latex', 'typst', 'system', 'yjs', 'git'].forEach(cat => 
          listener(cat as LogCategory, [])
        );
      });
    }
  }
}

export const logger = new Logger();

// Convenience functions for each category
export const aiLogger = {
  info: (message: string, data?: any) => logger.info('ai', message, data),
  warn: (message: string, data?: any) => logger.warn('ai', message, data),
  error: (message: string, data?: any) => logger.error('ai', message, data),
  getLogs: () => logger.getLogs('ai')
};

export const latexLogger = {
  info: (message: string, data?: any) => logger.info('latex', message, data),
  warn: (message: string, data?: any) => logger.warn('latex', message, data),
  error: (message: string, data?: any) => logger.error('latex', message, data),
  getLogs: () => logger.getLogs('latex')
};

export const typstLogger = {
  info: (message: string, data?: any) => logger.info('typst', message, data),
  warn: (message: string, data?: any) => logger.warn('typst', message, data),
  error: (message: string, data?: any) => logger.error('typst', message, data),
  getLogs: () => logger.getLogs('typst')
};

export const systemLogger = {
  info: (message: string, data?: any) => logger.info('system', message, data),
  warn: (message: string, data?: any) => logger.warn('system', message, data),
  error: (message: string, data?: any) => logger.error('system', message, data),
  getLogs: () => logger.getLogs('system')
};

export const yjsLogger = {
  info: (message: string, data?: any) => logger.info('yjs', message, data),
  warn: (message: string, data?: any) => logger.warn('yjs', message, data),
  error: (message: string, data?: any) => logger.error('yjs', message, data),
  getLogs: () => logger.getLogs('yjs')
};

export const gitLogger = {
  info: (message: string, data?: any) => logger.info('git', message, data),
  warn: (message: string, data?: any) => logger.warn('git', message, data),
  error: (message: string, data?: any) => logger.error('git', message, data),
  getLogs: () => logger.getLogs('git')
};

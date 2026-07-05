// Simple logging utility for client-side debugging
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LOG_LEVELS;

const ENABLED = true;
const MIN_LEVEL: LogLevel = 'debug';

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  if (!ENABLED) return;
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;
  
  const ts = new Date().toISOString().slice(11, 23);
  const prefix = `[${ts}] [${level.toUpperCase()}] [${module}]`;
  
  if (level === 'error') {
    console.error(prefix, message, data ?? '');
  } else if (level === 'warn') {
    console.warn(prefix, message, data ?? '');
  } else {
    console.log(prefix, message, data ?? '');
  }
}

export const logger = {
  debug: (module: string, msg: string, data?: unknown) => log('debug', module, msg, data),
  info: (module: string, msg: string, data?: unknown) => log('info', module, msg, data),
  warn: (module: string, msg: string, data?: unknown) => log('warn', module, msg, data),
  error: (module: string, msg: string, data?: unknown) => log('error', module, msg, data),
};

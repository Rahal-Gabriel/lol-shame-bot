type Level = 'info' | 'warn' | 'error';

export function log(level: Level, message: string, meta?: Record<string, unknown>): void {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, message, ...meta }) + '\n';
  if (level === 'error') {
    process.stderr.write(entry);
  } else {
    process.stdout.write(entry);
  }
}

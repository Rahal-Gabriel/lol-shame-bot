import { createServer, IncomingMessage, ServerResponse } from 'http';

export function handleHealthRequest(req: IncomingMessage, res: ServerResponse): void {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
}

export function startHealthServer(port: number): void {
  createServer(handleHealthRequest).listen(port, () => {
    process.stdout.write(JSON.stringify({ timestamp: new Date().toISOString(), level: 'info', message: `health server listening on :${port}` }) + '\n');
  });
}

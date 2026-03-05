import { describe, it, expect, vi, afterEach } from 'vitest';
import { handleHealthRequest } from '../../src/infra/health';
import { IncomingMessage, ServerResponse } from 'http';

afterEach(() => vi.restoreAllMocks());

function makeReq(url: string): IncomingMessage {
  return { url } as IncomingMessage;
}

function makeRes(): { statusCode: number; body: string; writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> } {
  const res = { statusCode: 0, body: '', writeHead: vi.fn(), end: vi.fn((b: string) => { res.body = b; }) };
  return res;
}

describe('handleHealthRequest', () => {
  it('responds 200 with JSON on /health', () => {
    const res = makeRes();
    handleHealthRequest(makeReq('/health'), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({ 'Content-Type': 'application/json' }));
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.uptime).toBeTypeOf('number');
  });

  it('responds 404 on unknown routes', () => {
    const res = makeRes();
    handleHealthRequest(makeReq('/unknown'), res as unknown as ServerResponse);
    expect(res.writeHead).toHaveBeenCalledWith(404);
  });
});

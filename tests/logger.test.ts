import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { log } from '../src/logger';

let stdoutSpy: ReturnType<typeof vi.spyOn>;
let stderrSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
});

afterEach(() => vi.restoreAllMocks());

describe('log', () => {
  it('writes info to stdout as JSON', () => {
    log('info', 'bot started');
    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output.level).toBe('info');
    expect(output.message).toBe('bot started');
    expect(output.timestamp).toBeDefined();
  });

  it('writes error to stderr as JSON', () => {
    log('error', 'something broke');
    const output = JSON.parse(stderrSpy.mock.calls[0][0] as string);
    expect(output.level).toBe('error');
    expect(output.message).toBe('something broke');
  });

  it('includes extra metadata when provided', () => {
    log('info', 'poll done', { player: 'GatoMakonha', matches: 1 });
    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output.player).toBe('GatoMakonha');
    expect(output.matches).toBe(1);
  });

  it('writes warn to stdout', () => {
    log('warn', 'rate limit hit');
    const output = JSON.parse(stdoutSpy.mock.calls[0][0] as string);
    expect(output.level).toBe('warn');
  });
});

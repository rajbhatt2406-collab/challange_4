import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWayfinding } from './useWayfinding';

// Mocks for fetch responses
const makeStreamResponse = (text: string, headers: Record<string, string> = {}) => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
  return {
    ok: true,
    headers: {
      get: (key: string) => headers[key] ?? null
    },
    body: stream
  };
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
    makeStreamResponse('Gate B is on the East side.', {
      'x-intent': 'FIND_GATE',
      'x-destination-id': 'gate-b',
      'x-language-detected': 'en'
    })
  ));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useWayfinding Hook', () => {
  it('initializes with empty messages, no activePath, and not streaming', () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.activePath).toBeNull();
    expect(result.current.isStreaming).toBe(false);
    expect(result.current.streamText).toBe('');
  });

  it('initializes with the provided startNode', () => {
    const { result } = renderHook(() => useWayfinding('gate-c'));
    expect(result.current.startNode).toBe('gate-c');
  });

  it('askQuestion appends user message immediately and assistant message after stream', async () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Where is Gate B?');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[0].content).toBe('Where is Gate B?');
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain('Gate B');
  });

  it('askQuestion stores intent, destinationId, and languageDetected on assistant message', async () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Where is Gate B?');
    });

    const assistantMsg = result.current.messages[1];
    expect(assistantMsg.intent).toBe('FIND_GATE');
    expect(assistantMsg.destinationId).toBe('gate-b');
    expect(assistantMsg.languageDetected).toBe('en');
  });

  it('askQuestion computes an activePath from startNode to destination', async () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Where is Gate B?');
    });

    // gate-a to gate-b should resolve to a valid Dijkstra path
    expect(result.current.activePath).not.toBeNull();
    expect(result.current.activePath![0].id).toBe('gate-a');
    expect(result.current.activePath![result.current.activePath!.length - 1].id).toBe('gate-b');
  });

  it('askQuestion is a no-op for empty/whitespace queries', async () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('   ');
    });

    expect(result.current.messages).toHaveLength(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('clearChat resets messages, activePath, and streamText', async () => {
    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Where is Gate B?');
    });

    act(() => {
      result.current.clearChat();
    });

    expect(result.current.messages).toHaveLength(0);
    expect(result.current.activePath).toBeNull();
    expect(result.current.streamText).toBe('');
  });

  it('handles Gemini API failure with a graceful error message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Where is Gate B?');
    });

    // Should still have 2 messages — user + error fallback
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.messages[1].content).toContain('issue');
    expect(result.current.isStreaming).toBe(false);
    consoleSpy.mockRestore();
  });

  it('handles network fetch rejection gracefully', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network offline')));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useWayfinding('gate-a'));

    await act(async () => {
      await result.current.askQuestion('Find me a restroom');
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('assistant');
    expect(result.current.isStreaming).toBe(false);
    consoleSpy.mockRestore();
  });
});

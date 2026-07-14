import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SimplifyText from './SimplifyText';
import { AccessibilityProvider } from './AccessibilityContext';

describe('SimplifyText Component', () => {
  it('renders original text and toggles simplify button', async () => {
    // Mock the global fetch for /api/simplify stream response
    const mockReadableStream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('Simplified response text'));
        controller.close();
      }
    });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: mockReadableStream
    });
    vi.stubGlobal('fetch', mockFetch);

    render(
      <AccessibilityProvider>
        <SimplifyText>This is a very complex and dense paragraph detailing operations.</SimplifyText>
      </AccessibilityProvider>
    );

    // Assert original text is rendered
    expect(screen.getByText('This is a very complex and dense paragraph detailing operations.')).toBeInTheDocument();

    // Find the simplify button and click it
    const button = screen.getByRole('button', { name: /simplify this text/i });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);

    // Wait for the text to rewrite to the simplified version
    await waitFor(() => {
      expect(screen.getByText('Simplified response text')).toBeInTheDocument();
    });

    // Button should now show restore options
    expect(screen.getByRole('button', { name: /show original/i })).toBeInTheDocument();

    // Restore fetch mock stub
    vi.unstubAllGlobals();
  });
});

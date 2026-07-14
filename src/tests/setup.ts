import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock scrollTo and scrollIntoView since they don't exist in jsdom
window.scrollTo = vi.fn();
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Mock console.error to keep test runs clean unless expected
const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React does not recognize the') ||
      args[0].includes('Unknown event handler property') ||
      args[0].includes('Warning: React.jsx: type is invalid'))
  ) {
    return;
  }
  originalError(...args);
};

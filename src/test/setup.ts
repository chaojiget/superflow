import { afterEach } from 'vitest';

// Polyfill ResizeObserver for jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Basic setup for vitest tests
afterEach(() => {
  // Clean up any side effects after each test
  // For now, just a basic cleanup
});

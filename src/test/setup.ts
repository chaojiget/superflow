import '@testing-library/jest-dom';

// Mock Web Workers
(globalThis as any).Worker = class {
  constructor(url: string | URL) {
    this.url = url;
  }

  url: string | URL;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;

  postMessage(_data: unknown): void {
    // Mock implementation
  }

  terminate(): void {
    // Mock implementation
  }
} as unknown as typeof Worker;

// Mock IndexedDB
const mockIndexedDB = {
  open: () => ({
    result: {
      transaction: () => ({
        objectStore: () => ({
          add: () => ({ onsuccess: null }),
          get: () => ({ onsuccess: null }),
          put: () => ({ onsuccess: null }),
          delete: () => ({ onsuccess: null }),
        }),
      }),
    },
    onsuccess: null,
    onerror: null,
  }),
};

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  writable: true,
});

// Mock ResizeObserver
(globalThis as any).ResizeObserver = class ResizeObserver {
  observe() {
    // Mock implementation
  }
  unobserve() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
};

// Mock environment variables
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_APP_TITLE: 'Superflow Test',
    VITE_DEBUG_MODE: 'true',
    VITE_LOG_LEVEL: 'debug',
  },
  writable: true,
});

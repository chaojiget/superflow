export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function safeJsonParse<T = unknown>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export function deepClone<T>(obj: T): T {
  return structuredClone(obj);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + '...';
}

export function formatTimestamp(
  timestamp: number,
  format: 'short' | 'long' | 'iso' = 'long'
): string {
  const date = new Date(timestamp);
  switch (format) {
    case 'short':
      return date.toLocaleTimeString();
    case 'iso':
      return date.toISOString();
    default:
      return date.toLocaleString();
  }
}

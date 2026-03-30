import { vi } from "vitest";

// Mock browser APIs for Node.js test environment

// localStorage mock
const store = new Map<string, string>();
Object.defineProperty(globalThis, "localStorage", {
  value: {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => { store.set(key, value); }),
    removeItem: vi.fn((key: string) => { store.delete(key); }),
    clear: vi.fn(() => { store.clear(); }),
  },
});

// Notification API mock
Object.defineProperty(globalThis, "Notification", {
  value: vi.fn(),
  writable: true,
});
Object.defineProperty(globalThis.Notification, "permission", {
  value: "granted",
  writable: true,
});
Object.defineProperty(globalThis.Notification, "requestPermission", {
  value: vi.fn(async () => "granted"),
});

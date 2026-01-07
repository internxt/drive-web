// src/setupTests.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

import process from 'process';
globalThis.process = process;

vi.mock('./libs/streamSaver', () => ({
  default: {
    createWriteStream: vi.fn(() => new WritableStream()),
  },
}));

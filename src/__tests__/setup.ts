// Test setup file for vitest
import { vi } from "vitest";

// Mock Next.js headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock database environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5433/test_db";

// Mock other environment variables that might be needed
process.env.NEXTAUTH_SECRET = "test-secret";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.NEXT_PUBLIC_HOST = "localhost:3000";
// Vitest configuration for React/Astro project
// Provides testing setup for localStorage, DOM manipulation, and React components

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment configuration
    environment: "jsdom",

    // Global test setup
    setupFiles: ["./src/test/setup.ts"],

    // Test file patterns
    include: [
      "src/**/*.{test,spec}.{js,ts,tsx}",
      "tests/**/*.{test,spec}.{js,ts,tsx}",
    ],

    // Global test configuration
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{js,ts,tsx}"],
      exclude: [
        "src/**/*.test.{js,ts,tsx}",
        "src/**/*.spec.{js,ts,tsx}",
        "src/test/**",
        "src/**/*.d.ts",
      ],
    },

    // Test timeout
    testTimeout: 10000,

    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
  },

  // Resolve configuration for imports
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});

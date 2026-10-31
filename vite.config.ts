import { defineConfig } from 'vitest/config';

// Relative base so the build works on GitHub Pages project URLs.
export default defineConfig({
  base: './',
  test: {
    include: ['tests/engine/**/*.test.ts', 'tests/playtest/**/*.test.ts'],
  },
});

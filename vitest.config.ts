import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'clarinet',
    singleThread: true,
    globals: true,
    environmentOptions: {
      clarinet: {
        // Add any clarinet-specific options here if needed
      }
    }
  },
});
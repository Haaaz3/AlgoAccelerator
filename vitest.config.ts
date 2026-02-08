/// <reference types="vitest" />
import { defineConfig, mergeConfig } from 'vite';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.ts'],
      include: ['src/__tests__/**/*.test.ts', 'src/__tests__/**/*.test.tsx'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: ['node_modules/', 'src/__tests__/'],
      },
    },
  })
);

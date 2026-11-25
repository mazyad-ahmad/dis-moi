/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { serviceWorker } from './scripts/vite-plugin-sw';

export default defineConfig({
  // Chemins relatifs : l'appli peut être servie depuis n'importe quel sous-dossier.
  base: './',
  plugins: [react(), serviceWorker()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});

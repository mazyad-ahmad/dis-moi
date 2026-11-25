import { defineConfig, devices } from '@playwright/test';

// Servie sous un sous-chemin, comme sur GitHub Pages (https://<compte>.github.io/dis-moi/).
const BASE_PATH = '/dis-moi/';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: `http://localhost:4173${BASE_PATH}`,
    ...devices['Pixel 7'],
    // Micro simulé pour l'enregistrement des sons dans « Créer mon propre jeu ».
    permissions: ['microphone'],
    launchOptions: {
      args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  projects: [{ name: 'android', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npm run build && npm run preview -- --base ${BASE_PATH}`,
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});

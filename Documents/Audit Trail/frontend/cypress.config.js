import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: false,
    screenshotOnRunFailure: true,
    setupNodeEvents(on, config) {
      // Node event listeners for enterprise CI/CD integration
    },
  },
});

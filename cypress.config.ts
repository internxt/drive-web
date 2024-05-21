import { defineConfig } from 'cypress';
import setupNodeEvents from './cypress/plugins/index';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000/',
    chromeWebSecurity: false,
    experimentalWebKitSupport: true,
    // defaultCommandTimeout: 60000,
    setupNodeEvents(on, config) {
      setupNodeEvents(on, config);
    },
    viewportWidth: 1500,
    viewportHeight: 660,
    video: false,
  },
});

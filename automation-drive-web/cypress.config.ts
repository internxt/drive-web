import { defineConfig } from 'cypress';
import { downloadFile } from 'cypress-downloadfile/lib/addPlugin';
import { PluginOptions } from 'cypress-terminal-report/src/installLogsPrinter';

const BASE_URL = 'https://drive.internxt.com/';
const config = defineConfig({
  projectId: 'hcgjvq',
  viewportWidth: 1000,
  viewportHeight: 660,
  watchForFileChanges: false,
  chromeWebSecurity: false,
  e2e: {
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx,}'],
    baseUrl: BASE_URL,
    watchForFileChanges: false,
    setupNodeEvents(on, config) {
      on('task', { downloadFile });
      const logOptions: PluginOptions = {
        printLogsToFile: 'always',
        printLogsToConsole: 'always',
        outputRoot: config.projectRoot + '/logs/',
        outputTarget: {
          'performance-logs.txt': 'txt',
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cypress-terminal-report/src/installLogsPrinter')(on, logOptions);
    },
  },
});

export default config;

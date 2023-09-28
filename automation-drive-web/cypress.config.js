const { defineConfig } = require('cypress')
const {downloadFile} = require('cypress-downloadfile/lib/addPlugin')

module.exports = defineConfig({
 
  projectId: "hcgjvq",
  viewportWidth: 1000,
  viewportHeight: 660,
  watchForFileChanges: false,
  chromeWebSecurity: false,
  e2e: {
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx,}'],
		baseUrl: 'https://drive.internxt.com/',
		watchForFileChanges:false,
    setupNodeEvents(on, config) {
      on('task', {downloadFile})
   }
  },
  plugins: (on, config) => {
    const logOptions = {
      printLogsToFile: 'always',
      printLogsToConsole: 'always',
      outputRoot: config.projectRoot + '/logs/',
      outputTarget: {
        'performance-logs.txt': 'txt',
      },
    };
    logOptions.collectTypes = ['cy:log'];
    require('cypress-terminal-report/src/installLogsPrinter')(on, logOptions);
  },
});




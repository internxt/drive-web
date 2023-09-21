const { defineConfig } = require("cypress");


module.exports = defineConfig({
  projectId: "hcgjvq",
  viewportWidth: 1000,
  viewportHeight: 660,
  watchForFileChanges: false,
  chromeWebSecurity: false,
  e2e: {
    specPattern: ['cypress/e2e/**/*.cy.{js,jsx,ts,tsx,}'],
		baseUrl: 'https://internxt.com/es',
		watchForFileChanges:false,
  },
});




const { defineConfig } = require("cypress");
const { lighthouse, prepareAudit } = require("@cypress-audit/lighthouse");
const fs = require('fs');

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




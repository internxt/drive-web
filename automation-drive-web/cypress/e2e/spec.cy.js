/// <reference types="cypress" />
import { removeLogs } from "../removelogs/removeLogs"


describe('Using Cypress for Performance', () => {

  it('measures page load on the home page', () => {
    let performance;

    cy.visit('/', {
      onBeforeLoad: (win) => {
        performance = win.performance;
        performance.mark('start-loading');
      },
    }).then(() => {
      cy.get('body').should('include.text', 'internxt');
    }).then(() => {
      performance.mark('end-loading');
    }).then(() => {
      performance.measure('pageLoad', 'start-loading', 'end-loading');
      const measure = performance.getEntriesByName('pageLoad')[0];
      const duration = measure.duration;
      assert.isAtMost(duration, 7000);

      cy.log(`[PERFORMANCE] Page load duration for HOME: ${duration / 1000} seconds`);
    });
  });
});

  

removeLogs()
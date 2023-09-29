import { Options } from 'cypress-axe';

export const checkA11y = (options: Options): void => {
  cy.checkA11y(undefined, options, (violations) => {
    console.log(`${violations.length} violation(s) detected`);
    console.table(violations);
  });
};

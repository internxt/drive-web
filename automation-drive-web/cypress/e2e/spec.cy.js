import { removeLogs } from "../removelogs/removeLogs"
describe('template spec', () => {
  it('passes', () => {
    cy.visit('/')
  })
})
removeLogs()
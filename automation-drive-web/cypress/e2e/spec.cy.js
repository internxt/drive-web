/// <reference types="cypress" />
import { checkA11y } from "../../accessibilty"
import { removeLogs } from "../removelogs/removeLogs"
describe('Testing accessibility', () => {
  before('Loading website',()=>{
    cy.visit('/')
    cy.injectAxe()
  })
  it('Testing Accessibility violations',()=> checkA11y())


})
removeLogs()
/// <reference types="cypress" />
import { removeLogs } from "../removelogs/removeLogs"
import { faker } from "@faker-js/faker"

describe('Using Cypress', () => {
  it('sample test',()=>{
    cy.log(faker.person.zodiacSign())
  })
})
  

removeLogs()
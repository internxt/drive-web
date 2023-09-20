
import { removeLogs } from "../removelogs/removeLogs"
describe('Sample test', () => {
  before('Loading website',()=>{
    cy.visit('/')
  })
  it('Spec',()=>{
    expect(1).to.equal(1)
  })


})
removeLogs()
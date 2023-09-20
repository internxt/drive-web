
import { removeLogs } from "../removelogs/removeLogs"
describe('It loads fast enough, testing Lighthouse', () => {
  before('Loading website',()=>{
    cy.visit('/')
  })
  it('Lighthouse Audit',()=>{
    const thresholds = {  
      performance: 40,
      accessibility: 40,
      seo: 40,
      'best-practices': 50,
      pwa: 0,
    };
    const lighthouseOptions = {
      formFactor: 'desktop',
      screenEmulation: { disabled: true },
    }
    const lighthouseConfig = {
      settings: { output: "html" },
      extends: "lighthouse:default",
    }
    cy.lighthouse(thresholds, lighthouseOptions, lighthouseConfig)
  })


})
removeLogs()
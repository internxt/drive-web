class Login {
  get = {
    titleCreateAccount: () => cy.contains('Create account'),
    emailTitle: () => cy.get('div label span').first(),
    emailInputForm: () => cy.get('[name="email"]'),
    passwordTitle: () => cy.get('div label span').last(),
    passwordInputForm: () => cy.get('[name="password"]'),
    logInButton: () => cy.get('[type="submit"]'),
  };

  clickAccountButton() {
    this.get.createAccountButton().click();
  }
  writeEmail(email) {
    this.get.titleCreateAccount().should('have.text', 'Create account');
    this.get.emailTitle().should('have.text', 'Email');
    this.get.emailInputForm().type(email);
  }
  writePassword(password) {
    this.get.passwordTitle().should('have.text', 'Password');
    this.get.passwordInputForm().type(password);
  }
  clickSignIn() {
    this.get.logInButton().click();
  }
}
export const login = new Login();

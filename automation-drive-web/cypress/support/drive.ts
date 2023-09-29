class Drive {
  get = {
    uploadFilesButton: () => cy.get('button[class$="border-opacity-75"]').parent(),
    items: () => cy.get('[data-test="file-list-folder"]'),
    shareButton: () => cy.get('[data-tooltip-id="share-tooltip"]'),
    accessWrapper: () => cy.get('[class="flex flex-col space-y-2.5"]'),
    accessTitle: () => cy.get('p[class="font-medium"]'),
    dropdown: () => cy.get('button[class$="text-gray-80 shadow-sm "]').last(),
    publicButton: () => cy.get('[class^="flex h-16 w-full cursor-pointer"]').first(),
    stopSharingButton: () => cy.get('[class^="flex h-11 w-full"]'),
    buttonTextBefore: () => cy.get('button[class$="text-gray-80 shadow-sm "] span'),
    buttonTextAfter: () => cy.get('button[class$="text-gray-80 shadow-sm "] span').last(),
    inviteButtonWrapper: () => cy.get('[class="flex items-center space-x-1.5"]'),
    manageAccessOption: () => cy.get('[class$="text-base text-gray-80"]').first(),
    downloadOption: () =>
      cy.get('[class="flex cursor-pointer flex-row whitespace-nowrap px-4 py-1.5 text-base text-gray-80"]').eq(5),
    optionsDisplayer: () => cy.get('[aria-labelledby="list-item-menu-button"]'),
    options: () => cy.get('span:not(.ml-5)'),
    Button: () => cy.get('button'),
    Text: () => cy.get('span'),
    //stop sharing modal
    stopSharingModal: () => cy.get('[class^="w-full text-gray-100 max-w-sm"]'),
    stopSharingTitle: () => cy.get('[class="text-2xl font-medium"]'),
    stopSharingWarning: () => cy.get('[class="text-lg text-gray-80"]'),
    cancelStopSharingConfirm: () => cy.get('[class$="text-gray-80 shadow-sm "]'),
    cancelStopSharingText: () => cy.get('div.flex.items-center.justify-center.space-x-2').first(),
    stopSharingButtonConfirm: () => cy.get('[class$="active:bg-red-dark text-white shadow-sm "]'),
    stopSharingButtonConfirmText: () => cy.get('div.flex.items-center.justify-center.space-x-2').last(),

    confirmationSign: () =>
      cy.get('[class="flex max-w-xl items-center rounded-lg border border-gray-10 bg-white p-3 shadow-subtle-hard"]'),
    //create New Folder
    createNewFolder: () => cy.get('[data-tooltip-id="createfolder-tooltip"]'),
    newFolderModal: () => cy.get('[class^="w-full text-gray-100"]'),
    restrictedButton: () => {
      throw new Error('RestrictedButton function is not implemented in drive.ts');
    },
  };

  clickUploadButton() {
    this.get.uploadFilesButton().click();
  }
  selectRandomItem() {
    this.get.items().then((el) => {
      const items = el.length;
      const number = Cypress._.random(0, items - 1);
      this.get.items().eq(number).click();
    });
  }
  clickonShareButton() {
    this.get.shareButton().click();
  }
  clickPermissionsDropdown() {
    this.get.accessWrapper().within(() => {
      this.get.accessTitle().should('have.text', 'General access');
      this.get.buttonTextBefore().should('have.text', 'Public');
      this.get.dropdown().click();
    });
  }
  clickRestrictedButton() {
    this.get.restrictedButton().click({ force: true });
    this.get.buttonTextAfter().should('have.text', 'Restricted');
  }
  clickPublicButton() {
    this.get.publicButton().click();
  }
  clickStopSharingButton() {
    this.get.stopSharingButton().click({ force: true });
  }
  confirmStopSharing() {
    this.get.stopSharingModal().should('exist');
    this.get.stopSharingModal().within(() => {
      this.get.stopSharingTitle().then((text) => {
        expect(text.text()).to.exist;
      });
      this.get.stopSharingWarning().then((warning) => {
        expect(warning.text()).to.exist;
      });
      this.get.stopSharingButtonConfirm().should('exist');
      this.get.stopSharingButtonConfirmText().then((button) => {
        expect(button.text()).to.exist;
      });
      this.get.cancelStopSharingConfirm().should('exist');
      this.get.cancelStopSharingText().then((cancel) => {
        expect(cancel.text()).to.exist;
      });
    });
    this.get.stopSharingButtonConfirm().click();
    this.get.confirmationSign().then((sign) => {
      expect(sign.text()).to.exist;
    });
  }
  inviteButton() {
    return this.get.inviteButtonWrapper().within(() => {
      this.get.Button();
    });
  }
  selectRandomItemAndRightClick() {
    this.get.items().then((el) => {
      const items = el.length;
      const number = Cypress._.random(0, items - 1);
      this.get.items().eq(number).rightclick();
    });
    this.get.optionsDisplayer().within(() => {
      this.get.options().each((opts) => {
        expect(opts.text()).to.exist;
      });
    });
  }
  clickShareOption() {
    this.get.manageAccessOption().click();
  }
  clickCreateNewFolder() {
    this.get.createNewFolder().click();
  }
  writeNewFolderName(name) {
    this.get.newFolderModal().should('exist');
  }
}
export const drive = new Drive();

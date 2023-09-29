import { removeLogs } from '../../removelogs/removeLogs';
import { drive } from '../../support/drive';
import data from '../../fixtures/staticData.json';

describe('AFS |Owner-Shared-Folder-Permission-Feature', () => {
  beforeEach('Logging in', () => {
    cy.Login(data.accounts.main, data.password);
    cy.wait(6000);
  });
  it.only("TC: 1 | Validate that the owner can change permissions of a random shared folder from restricted to 'Public' with the 'Share' button", () => {
    drive.get.uploadFilesButton().click();
    drive.selectRandomItem();
    drive.clickonShareButton();
    drive.clickPermissionsDropdown();
    drive.clickPublicButton();
  });
  it("TC: 2 | Validate that the owner can change permissions of a random shared folder from restricted to 'Public' with right click", () => {
    drive.selectRandomItemAndRightClick();
    drive.clickShareOption();
    drive.clickPermissionsDropdown();
    drive.clickPublicButton();
  });
  it("TC: 3 | Validate that the owner can change permissions of a random shared folder to 'Stop Sharing' with the 'Share' button.", () => {
    drive.selectRandomItem();
    drive.clickonShareButton();
    drive.clickPermissionsDropdown();
    drive.clickStopSharingButton();
    drive.confirmStopSharing();
  });
  it("TC: 4 | Validate that the owner can change permissions of a random shared folder to 'Stop Sharing' with right click", () => {
    drive.selectRandomItemAndRightClick();
    drive.clickShareOption();
    drive.clickPermissionsDropdown();
    drive.clickStopSharingButton();
    drive.confirmStopSharing();
  });
});

removeLogs();

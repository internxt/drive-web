const RENAMED_FOLDER_NAME = 'renamed-folder';

const EXAMPLE_FILENAME = 'example.txt';

export { RENAMED_FOLDER_NAME, EXAMPLE_FILENAME };

export const MENU_ITEM_SELECTOR = 'div[id*="headlessui-menu-item"] div';
export const FILE_ITEM_SELECTOR = '[data-test=file-list-file]';

export const menuItemsButtonsSelector = {
  renameButton: { containerSelector: MENU_ITEM_SELECTOR, textToFind: 'Rename' },
};

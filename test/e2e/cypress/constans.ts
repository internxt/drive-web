const EXAMPLE_FILENAME = 'example.txt';

const MENU_ITEM_SELECTOR = 'div[id*="headlessui-menu-item"] div';
const FILE_ITEM_SELECTOR = '[data-test=file-list-file]';
const FOLDER_ITEM_SELECTOR = '[data-test=file-list-folder]';

const PAGINATION_ENDPOINT_REGEX = {
  FOLDERS: /\/folders\/\d+\/folders\/\?offset=\d+&limit=\d+/,
  FILES: /\/folders\/\d+\/files\/\?offset=\d+&limit=\d+/,
};

export { EXAMPLE_FILENAME, MENU_ITEM_SELECTOR, FILE_ITEM_SELECTOR, FOLDER_ITEM_SELECTOR, PAGINATION_ENDPOINT_REGEX };

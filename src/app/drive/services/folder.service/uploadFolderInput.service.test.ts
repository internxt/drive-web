import { describe, expect, test } from 'vitest';
import { transformInputFilesToItems } from './uploadFolderInput.service';

const CURRENT_FOLDER_ID = 'current-folder-uuid';

const createPickedFile = (relativePath: string): File => {
  const file = new File(['content'], relativePath.split('/').at(-1) as string);
  Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
  return file;
};

describe('Folder picked from the device', () => {
  test('When the folder has nested subfolders, then each file stays inside its own folder', () => {
    const report = createPickedFile('Work/report.pdf');
    const invoice = createPickedFile('Work/Invoices/2026/january.pdf');
    const photo = createPickedFile('Work/Photos/team.png');

    const { rootList, files } = transformInputFilesToItems([report, invoice, photo], CURRENT_FOLDER_ID);

    expect(files).toEqual([]);
    expect(rootList).toEqual([
      {
        name: 'Work',
        isFolder: true,
        folderId: CURRENT_FOLDER_ID,
        childrenFiles: [report],
        childrenFolders: [
          {
            name: 'Invoices',
            isFolder: true,
            folderId: null,
            childrenFiles: [],
            childrenFolders: [
              { name: '2026', isFolder: true, folderId: null, childrenFiles: [invoice], childrenFolders: [] },
            ],
          },
          { name: 'Photos', isFolder: true, folderId: null, childrenFiles: [photo], childrenFolders: [] },
        ],
      },
    ]);
  });

  test('When several files share a folder, then that folder is created only once', () => {
    const first = createPickedFile('Work/Docs/a.txt');
    const second = createPickedFile('Work/Docs/b.txt');

    const { rootList } = transformInputFilesToItems([first, second], CURRENT_FOLDER_ID);

    expect(rootList).toHaveLength(1);
    expect(rootList[0].childrenFolders).toHaveLength(1);
    expect(rootList[0].childrenFolders[0].childrenFiles).toEqual([first, second]);
  });

  test('When a file has no folder in its path, then it is uploaded to the current folder', () => {
    const looseFile = createPickedFile('notes.txt');

    const { rootList, files } = transformInputFilesToItems([looseFile], CURRENT_FOLDER_ID);

    expect(rootList).toEqual([]);
    expect(files).toEqual([looseFile]);
  });
});

import { config } from 'dotenv';
import { DriveItemData } from '../../src/models/interfaces';
import { checkFileNameExists } from '../../src/services/storage.service/storage-name.service';
config();

describe('checkFileNameExists tests', () => {
  const baseFake: DriveItemData = {
    bucket:'test',
    color:'test',
    createdAt:'test',
    created_at:'test',
    deleted:false,
    deletedAt: null,
    encrypt_version:'test',
    fileId:'test',
    folderId:1,
    folder_id:1,
    icon:'test',
    iconId:1,
    icon_id:1,
    id:1,
    isFolder:false,
    name:'test',
    parentId:1,
    parent_id:1,
    size:1,
    type:'',
    updatedAt:'test',
    userId:1,
    user_id:1
  };

  it('Should not rename if a file with the same name doesnt exist', () => {
    const items: DriveItemData[] = [
      { ...baseFake, name:'test', type:'txt' }
    ];
    const filename = 'anothertest';
    const type = 'txt';

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(false);
    expect(index).toBe(0);
    expect(finalFilename).toBe(filename);
  });

  it('Should not rename if a file with the same name but different type exists', () => {
    const filename = 'test';
    const type = 'docx';

    const items: DriveItemData[] = [
      { ...baseFake, name: filename, type:'txt' }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(false);
    expect(index).toBe(0);
    expect(finalFilename).toBe(filename);
  });

  it('Should rename if a file with the same name and type exists', () => {
    const filename = 'test';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:filename, type }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(1);
    expect(finalFilename).toBe(`${filename} (1)`);
  });

  it('Should rename incrementally', () => {
    const filename = 'test';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:filename, type },
      { ...baseFake, name:`${filename} (1)`, type }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(2);
    expect(finalFilename).toBe(`${filename} (2)`);
  });

  it('Should rename incrementally even if the clean name does not exist', () => {
    const filename = 'test (1)';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:filename, type }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(2);
    expect(finalFilename).toBe('test (2)');
  });

  it('Should rename incrementally even if the clean name does not exist (intended name without parenthesis)', () => {
    const filename = 'test';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:`${filename} (1)`, type }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(2);
    expect(finalFilename).toBe('test (2)');
  });

  it('Should rename incrementally if the clean name exists', () => {
    const filename = 'test';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:filename, type },
      { ...baseFake, name:`${filename} (1)`, type }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(2);
    expect(finalFilename).toBe('test (2)');
  });

  it('Should rename incrementally if the clean name exists (even if the final name would exist with a different extension)', () => {
    const filename = 'test';
    const type = 'txt';

    const items: DriveItemData[] = [
      { ...baseFake, name:filename, type },
      { ...baseFake, name:`${filename} (1)`, type:'pdf' }
    ];

    const [alreadyExists, index, finalFilename] = checkFileNameExists(items, filename, type);

    expect(alreadyExists).toBe(true);
    expect(index).toBe(1);
    expect(finalFilename).toBe('test (1)');
  });
});
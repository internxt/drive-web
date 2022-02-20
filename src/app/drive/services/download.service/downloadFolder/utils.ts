import { SharedDirectoryFile, SharedDirectoryFolder } from '@internxt/sdk/dist/drive/share/types';
import { getSharedDirectoryFiles, getSharedDirectoryFolders } from 'app/share/services/share.service';

export interface Iterator<T> {
  next(): Promise<{ value: T[], done: boolean }>
}

interface RequiredQueryValues {
  token: string,
  directoryId: number,
  code: string
}

export class SharedFolderFilesIterator implements Iterator<SharedDirectoryFile> {
  private offset: number;
  private limit: number;
  private readonly queryValues: RequiredQueryValues;

  constructor(queryValues: RequiredQueryValues, limit?: number, offset?: number) {
    this.limit = limit || 5;
    this.offset = offset || 0;
    this.queryValues = queryValues;
  }

  async next(): Promise<{ value: SharedDirectoryFile[], done: boolean }> {
    const { code, directoryId, token } = this.queryValues;

    const { files, last } = await getSharedDirectoryFiles({
      code,
      directoryId,
      token,
      offset: this.offset,
      limit: this.limit
    });

    this.offset += this.limit;

    return { value: files, done: last };
  }
}

export class SharedDirectoryFolderIterator implements Iterator<SharedDirectoryFolder> {
  private offset: number;
  private limit: number;
  private readonly queryValues: Omit<RequiredQueryValues, 'code'>;

  constructor(queryValues: Omit<RequiredQueryValues, 'code'>, limit?: number, offset?: number) {
    this.limit = limit || 5;
    this.offset = offset || 0;
    this.queryValues = queryValues;
  }

  async next(): Promise<{ value: SharedDirectoryFolder[], done: boolean }> {
    const { directoryId, token } = this.queryValues;

    const { folders, last } = await getSharedDirectoryFolders({
      directoryId,
      token,
      offset: this.offset,
      limit: this.limit
    });

    this.offset += this.limit;

    return { value: folders, done: last };
  }
}

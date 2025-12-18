import { FileToUpload } from './types';

export class FileIdRequiredError extends Error {
  constructor() {
    super('File ID is required when uploading a file');
    this.name = 'FileIdRequiredWhenUploadingError';

    Object.setPrototypeOf(this, FileIdRequiredError.prototype);
  }
}

export class BucketNotFoundError extends Error {
  constructor() {
    super('Bucket not found');
    this.name = 'BucketNotFoundError';
    Object.setPrototypeOf(this, BucketNotFoundError.prototype);
  }
}

export class RetryableFileError extends Error {
  constructor(public file: FileToUpload) {
    super('Retryable file');
    this.name = 'RetryableFileError';
    Object.setPrototypeOf(this, RetryableFileError.prototype);
  }
}

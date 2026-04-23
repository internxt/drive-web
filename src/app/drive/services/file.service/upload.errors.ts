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

export class EmptyFileNotAllowedError extends Error {
  readonly fileName: string;

  constructor(fileName: string) {
    super('Empty files are not allowed by current plan');
    this.name = 'EmptyFileNotAllowedError';
    this.fileName = fileName;
    Object.setPrototypeOf(this, EmptyFileNotAllowedError.prototype);
  }
}

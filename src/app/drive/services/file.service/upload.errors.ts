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

export class FilesExceedsSizeLimitError extends Error {
  constructor() {
    super('Files exceeds the user size limit');
    this.name = 'FilesExceedsSizeLimitError';
    Object.setPrototypeOf(this, FilesExceedsSizeLimitError.prototype);
  }
}

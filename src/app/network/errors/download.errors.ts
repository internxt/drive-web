export class DownloadAbortedByUserError extends Error {
  public constructor() {
    super('Download aborted by user');
    Object.setPrototypeOf(this, DownloadAbortedByUserError.prototype);
  }
}

export class DownloadFailedWithUnknownError extends Error {
  constructor(status?: number) {
    super(`Download failed with unknown error. Status code: ${status ?? 'unknown'}`);
    Object.setPrototypeOf(this, DownloadFailedWithUnknownError.prototype);
  }
}

export class NoContentReceivedError extends Error {
  constructor() {
    super('No content received');
    Object.setPrototypeOf(this, NoContentReceivedError.prototype);
  }
}

export class MaxRetriesExceededError extends Error {
  constructor(maxRetries: number, errorMessage: string) {
    super(`Download failed after ${maxRetries} retries: ${errorMessage}`);
    Object.setPrototypeOf(this, MaxRetriesExceededError.prototype);
  }
}

export class UnknownDownloadError extends Error {
  constructor() {
    super('DOWNLOAD ERRNO. 0');
    Object.setPrototypeOf(this, UnknownDownloadError.prototype);
  }
}

export class MissingAuthenticationError extends Error {
  constructor() {
    super('Missing authentication credentials. Either token or credentials must be provided.');
    Object.setPrototypeOf(this, MissingAuthenticationError.prototype);
  }
}

export class MissingEncryptionKeyError extends Error {
  constructor() {
    super('Missing encryption key. Either encryptionKey or mnemonic must be provided.');
    Object.setPrototypeOf(this, MissingEncryptionKeyError.prototype);
  }
}

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

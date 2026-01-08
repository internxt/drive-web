export class ErrorLoadingVideoFileError extends Error {
  constructor() {
    super('Error loading video file');
    Object.setPrototypeOf(this, ErrorLoadingVideoFileError.prototype);
  }
}

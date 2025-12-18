export class ErrorLoadingVideoFileError extends Error {
  constructor() {
    super('Error loading video file');
    Object.setPrototypeOf(this, ErrorLoadingVideoFileError.prototype);
  }
}

export class VideoTooShortError extends Error {
  constructor() {
    super('Video is too short');
    Object.setPrototypeOf(this, VideoTooShortError.prototype);
  }
}

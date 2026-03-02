export class VideoSessionDestroyedError extends Error {
  constructor(message: string) {
    super(message);

    Object.setPrototypeOf(this, VideoSessionDestroyedError.prototype);
  }
}

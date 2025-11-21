export class InvalidChunkError extends Error {
  constructor() {
    super('Can only write Uint8Arrays');

    Object.setPrototypeOf(this, InvalidChunkError.prototype);
  }
}

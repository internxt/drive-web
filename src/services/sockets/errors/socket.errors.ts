export class SocketNotConnectedError extends Error {
  constructor() {
    super('Realtime service is not connected');
    Object.setPrototypeOf(this, SocketNotConnectedError.prototype);
  }
}

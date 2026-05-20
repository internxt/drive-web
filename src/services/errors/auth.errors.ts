export class PasswordMismatchError extends Error {
  constructor(message = 'The password you introduced does not match your current password') {
    super(message);
    this.name = 'PasswordMismatchError';

    Object.setPrototypeOf(this, PasswordMismatchError.prototype);
  }
}

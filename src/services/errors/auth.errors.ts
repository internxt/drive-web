export class PasswordMismatchError extends Error {
  constructor(message = 'The password you introduced does not match your current password') {
    super(message);
    this.name = 'PasswordMismatchError';

    Object.setPrototypeOf(this, PasswordMismatchError.prototype);
  }
}

export class UserUnauthorizedError extends Error {
  constructor(message = 'The user is unauthorized') {
    super(message);
    this.name = 'UserUnauthorizedError';

    Object.setPrototypeOf(this, UserUnauthorizedError.prototype);
  }
}

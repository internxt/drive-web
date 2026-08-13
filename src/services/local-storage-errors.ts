export class FailedToEncryptEntry extends Error {
  constructor(errorMsg?: string) {
    super('Failed to encrypt local storage entry: ' + errorMsg);

    Object.setPrototypeOf(this, FailedToEncryptEntry.prototype);
  }
}

export class FailedToDecryptEntry extends Error {
  constructor(errorMsg?: string) {
    super('Failed to decrypt local storage entry: ' + errorMsg);

    Object.setPrototypeOf(this, FailedToDecryptEntry.prototype);
  }
}

export class FailedToCreateKey extends Error {
  constructor(errorMsg?: string) {
    super('Failed to create encryption key: ' + errorMsg);

    Object.setPrototypeOf(this, FailedToCreateKey.prototype);
  }
}

export class FailedToFindKey extends Error {
  constructor(errorMsg?: string) {
    super('Failed to find encryption key: ' + errorMsg);

    Object.setPrototypeOf(this, FailedToFindKey.prototype);
  }
}

export class KeyAlreadyExistsError extends Error {
  constructor(errorMsg?: string) {
    super('Key already exists: ' + errorMsg);

    Object.setPrototypeOf(this, KeyAlreadyExistsError.prototype);
  }
}

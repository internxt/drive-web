import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export type ProfileInfoOpaque = {
  user: UserSettings;
  sessionID: string;
  sessionKey: string;
  exportKey: string;
};

export class OpaqueLoginError extends Error {
  public constructor() {
    super('Opaque login failed');
    Object.setPrototypeOf(this, OpaqueLoginError.prototype);
  }
}

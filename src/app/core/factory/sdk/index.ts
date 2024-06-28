import { Auth, Token } from '@internxt/sdk/dist/auth';
import { Backups, Payments, Referrals, Share, Storage, Trash, Users } from '@internxt/sdk/dist/drive';
import { ApiSecurity, ApiUrl, AppDetails } from '@internxt/sdk/dist/shared';
import { Workspaces } from '@internxt/sdk/dist/workspaces';
import packageJson from '../../../../../package.json';
import authService from '../../../auth/services/auth.service';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import { LocalStorageService } from '../../services/local-storage.service';
import { Workspace } from '../../types';

export class SdkFactory {
  private static sdk: {
    dispatch: AppDispatch;
    localStorage: LocalStorageService;
    instance: SdkFactory;
    newApiInstance: SdkFactory;
  };
  private readonly apiUrl: ApiUrl;

  private constructor(apiUrl: ApiUrl) {
    this.apiUrl = apiUrl;
  }

  public static initialize(dispatch: AppDispatch, localStorage: LocalStorageService): void {
    this.sdk = {
      dispatch,
      localStorage,
      instance: new SdkFactory(process.env.REACT_APP_API_URL),
      newApiInstance: new SdkFactory(process.env.REACT_APP_DRIVE_NEW_API_URL),
    };
  }

  public static getNewApiInstance(): SdkFactory {
    if (this.sdk.instance === undefined) {
      throw new Error('Factory not initialized');
    }
    return this.sdk.newApiInstance;
  }

  public static getInstance(): SdkFactory {
    if (this.sdk.instance === undefined) {
      throw new Error('Factory not initialized');
    }
    return this.sdk.instance;
  }

  public createAuthClient(): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public createDesktopAuthClient(): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getDesktopAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public createStorageClient(): Storage {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Storage.client(apiUrl, appDetails, apiSecurity);
  }

  public createNewStorageClient(): Storage {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Storage.client(apiUrl, appDetails, apiSecurity);
  }

  public createWorkspacesClient(): Workspaces {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Workspaces.client(apiUrl, appDetails, apiSecurity);
  }

  public createShareClient(): Share {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Share.client(apiUrl, appDetails, apiSecurity);
  }

  public createTrashClient(): Trash {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Trash.client(apiUrl, appDetails, apiSecurity);
  }

  public createUsersClient(): Users {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Users.client(apiUrl, appDetails, apiSecurity);
  }

  public createNewUsersClient(): Users {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Users.client(apiUrl, appDetails, apiSecurity);
  }

  public createReferralsClient(): Referrals {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Referrals.client(apiUrl, appDetails, apiSecurity);
  }

  public async createPaymentsClient(): Promise<Payments> {
    const appDetails = SdkFactory.getAppDetails();

    let newToken = SdkFactory.sdk.localStorage.get('xNewToken');

    if (!newToken) {
      newToken = await authService.getNewToken();
      SdkFactory.sdk.localStorage.set('xNewToken', newToken);
    }

    const apiSecurity = { ...this.getApiSecurity(), token: newToken };

    return Payments.client(process.env.REACT_APP_PAYMENTS_API_URL, appDetails, apiSecurity);
  }

  public createBackupsClient(): Backups {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Backups.client(apiUrl, appDetails, apiSecurity);
  }

  /** Helpers **/

  private getApiSecurity(): ApiSecurity {
    const workspace = SdkFactory.sdk.localStorage.getWorkspace();
    return {
      token: this.getToken(workspace),
      unauthorizedCallback: async () => {
        SdkFactory.sdk.dispatch(userThunks.logoutThunk());
      },
    };
  }

  private getNewApiSecurity(): ApiSecurity {
    const workspace = SdkFactory.sdk.localStorage.getWorkspace();
    return {
      token: this.getNewToken(workspace),
      unauthorizedCallback: async () => {
        SdkFactory.sdk.dispatch(userThunks.logoutThunk());
      },
    };
  }

  public getApiUrl(): ApiUrl {
    return this.apiUrl;
  }

  private static getAppDetails(): AppDetails {
    return {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
    };
  }

  private static getDesktopAppDetails(): AppDetails {
    return {
      clientName: 'drive-desktop',
      clientVersion: packageJson.version,
    };
  }

  private getMnemonic(workspace: string): string {
    const mnemonicByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: SdkFactory.sdk.localStorage.get('xMnemonic') || '',
      [Workspace.Business]: SdkFactory.sdk.localStorage.getTeams()?.bridge_mnemonic || '',
    };
    return mnemonicByWorkspace[workspace];
  }

  private getToken(workspace: string): Token {
    const tokenByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: SdkFactory.sdk.localStorage.get('xToken') || '',
      [Workspace.Business]: SdkFactory.sdk.localStorage.get('xTokenTeam') || '',
    };
    return tokenByWorkspace[workspace];
  }

  private getNewToken(workspace: string): Token {
    const tokenByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: SdkFactory.sdk.localStorage.get('xNewToken') || '',
      [Workspace.Business]: SdkFactory.sdk.localStorage.get('xTokenTeam') || '',
    };
    return tokenByWorkspace[workspace];
  }
}

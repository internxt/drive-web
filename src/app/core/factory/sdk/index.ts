import { Auth, Token } from '@internxt/sdk/dist/auth';
import { Backups, Payments, Referrals, Share, Storage, Trash, Users } from '@internxt/sdk/dist/drive';
import { ApiSecurity, ApiUrl, AppDetails } from '@internxt/sdk/dist/shared';
import { WorkspaceCredentialsDetails, Workspaces } from '@internxt/sdk/dist/workspaces';
import packageJson from '../../../../../package.json';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import { LocalStorageService } from '../../services/local-storage.service';
import { Workspace } from '../../types';
import { Checkout } from '@internxt/sdk/dist/payments';
import { envConfig } from 'app/core/services/env.service';
import { STORAGE_KEYS } from '../../services/storage-keys';

export class SdkFactory {
  private static sdk: {
    dispatch: AppDispatch;
    localStorage: LocalStorageService;
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
      newApiInstance: new SdkFactory(envConfig.api.newApi),
    };
  }

  public static getNewApiInstance(): SdkFactory {
    if (this.sdk.newApiInstance === undefined) {
      throw new Error('Factory not initialized');
    }
    return this.sdk.newApiInstance;
  }

  public createAuthClient(): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public createDesktopAuthClient(): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getDesktopAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
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
    const apiSecurity = this.getNewApiSecurity();
    return Users.client(apiUrl, appDetails, apiSecurity);
  }

  public createReferralsClient(): Referrals {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Referrals.client(apiUrl, appDetails, apiSecurity);
  }

  public async createPaymentsClient(): Promise<Payments> {
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Payments.client(envConfig.api.payments, appDetails, apiSecurity);
  }

  public async createCheckoutClient(): Promise<Checkout> {
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Checkout.client(envConfig.api.payments, appDetails, apiSecurity);
  }

  public createBackupsClient(): Backups {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Backups.client(apiUrl, appDetails, apiSecurity);
  }

  /** Helpers **/

  private getNewApiSecurity(): ApiSecurity {
    const workspace = SdkFactory.sdk.localStorage.getWorkspace();
    const workspaceToken = this.getWorkspaceToken();
    return {
      token: this.getNewToken(workspace),
      workspaceToken,
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

  private getWorkspaceToken(): Token | undefined {
    const workspace = SdkFactory.sdk.localStorage.get(STORAGE_KEYS.B2B_WORKSPACE);
    let token: string | undefined = undefined;
    if (workspace) {
      const credentials: WorkspaceCredentialsDetails | null = JSON.parse(
        SdkFactory.sdk.localStorage.get(STORAGE_KEYS.WORKSPACE_CREDENTIALS) ?? 'null',
      );
      if (credentials) {
        token = credentials.tokenHeader;
      }
    }
    return token;
  }
}

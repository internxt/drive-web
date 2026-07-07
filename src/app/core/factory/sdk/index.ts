import { Auth, Token } from '@internxt/sdk/dist/auth';
import { Backups, Payments, Referrals, Share, Storage, Trash, Users } from '@internxt/sdk/dist/drive';
import { ApiSecurity, ApiUrl, AppDetails } from '@internxt/sdk/dist/shared';
import { WorkspaceCredentialsDetails, Workspaces } from '@internxt/sdk/dist/workspaces';
import packageJson from '../../../../../package.json';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import { LocalStorageService } from 'services/local-storage.service';
import { LocalStorageItem } from '../../types';
import { Checkout } from '@internxt/sdk/dist/payments';
import envService from 'services/env.service';
import { Location } from '@internxt/sdk';
import { HttpClient } from '@internxt/sdk/dist/shared/http/client';
import { retryStrategies, notifyUserWithCooldown } from './retryStrategies';

const SdkClient = {
  Storage: 'Storage',
  Share: 'Share',
} as const;

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
      newApiInstance: new SdkFactory(envService.getVariable('newApi')),
    };

    HttpClient.enableGlobalRetry(retryStrategies.withUserNotification(SdkClient.Storage, notifyUserWithCooldown));
  }

  public static getNewApiInstance(): SdkFactory {
    if (this.sdk.newApiInstance === undefined) {
      throw new Error('Factory not initialized');
    }
    return this.sdk.newApiInstance;
  }

  public async createAuthClient(options?: { captchaToken?: string; unauthorizedCallback?: () => void }): Promise<Auth> {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders(options?.captchaToken);
    const apiSecurity = await this.getNewApiSecurity(options?.unauthorizedCallback);
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public async createDesktopAuthClient(): Promise<Auth> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getDesktopAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public async createNewStorageClient(): Promise<Storage> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Storage.client(apiUrl, appDetails, apiSecurity);
  }

  public async createWorkspacesClient(): Promise<Workspaces> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Workspaces.client(apiUrl, appDetails, apiSecurity);
  }

  public async createShareClient(captchaToken?: string): Promise<Share> {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders(captchaToken);
    const apiSecurity = await this.getNewApiSecurity();
    return Share.client(apiUrl, appDetails, apiSecurity);
  }

  public async createTrashClient(): Promise<Trash> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Trash.client(apiUrl, appDetails, apiSecurity);
  }

  public async createUsersClient(captchaToken?: string): Promise<Users> {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders(captchaToken);
    const apiSecurity = await this.getNewApiSecurity();
    return Users.client(apiUrl, appDetails, apiSecurity);
  }

  public async createReferralsClient(): Promise<Referrals> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Referrals.client(apiUrl, appDetails, apiSecurity);
  }

  public async createPaymentsClient(): Promise<Payments> {
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getIndividualApiSecurity();
    return Payments.client(envService.getVariable('payments'), appDetails, apiSecurity);
  }

  public async createCheckoutClient(): Promise<Checkout> {
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getIndividualApiSecurity();
    return Checkout.client(envService.getVariable('payments'), appDetails, apiSecurity);
  }

  public async createBackupsClient(): Promise<Backups> {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = await this.getNewApiSecurity();
    return Backups.client(apiUrl, appDetails, apiSecurity);
  }

  public createLocationClient(): Location {
    const apiUrl = envService.getVariable('location');

    return Location.client(apiUrl);
  }

  /** Helpers **/

  private async getNewApiSecurity(unauthorizedCallback?: () => void): Promise<ApiSecurity> {
    const workspaceToken = this.getWorkspaceToken();
    const token = await this.getNewToken();
    return {
      token,
      workspaceToken,
      unauthorizedCallback:
        unauthorizedCallback ??
        (() => {
          SdkFactory.sdk.dispatch(userThunks.logoutThunk());
        }),
    };
  }

  private async getIndividualApiSecurity(): Promise<ApiSecurity> {
    const token = await this.getNewToken();
    return {
      token,
      unauthorizedCallback: () => {
        SdkFactory.sdk.dispatch(userThunks.logoutThunk());
      },
    };
  }

  public getApiUrl(): ApiUrl {
    return this.apiUrl;
  }

  private static getAppDetails(customHeaders?: Record<string, string>): AppDetails {
    return {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
      customHeaders,
    };
  }

  private getAppDetailsWithHeaders(captchaToken?: string): AppDetails {
    const customHeaders = captchaToken ? this.buildCustomHeaders({ captchaToken }) : undefined;
    return SdkFactory.getAppDetails(customHeaders);
  }

  private static getDesktopAppDetails(): AppDetails {
    return {
      clientName: 'drive-desktop',
      clientVersion: packageJson.version,
    };
  }

  private async getNewToken(): Promise<Token> {
    return (await SdkFactory.sdk.localStorage.getToken()) || '';
  }

  private getWorkspaceToken(): Token | undefined {
    const workspace = SdkFactory.sdk.localStorage.get(LocalStorageItem.B2Bworkspace);
    let token: string | undefined = undefined;
    if (workspace) {
      const credentials: WorkspaceCredentialsDetails | null = JSON.parse(
        SdkFactory.sdk.localStorage.get(LocalStorageItem.WorkspaceCredentials) ?? 'null',
      );
      if (credentials) {
        token = credentials.tokenHeader;
      }
    }
    return token;
  }

  private buildCustomHeaders(options?: { captchaToken?: string }): Record<string, string> {
    const headers: Record<string, string> = {};

    if (options?.captchaToken) {
      headers['x-internxt-captcha'] = options.captchaToken;
    }

    return headers;
  }
}

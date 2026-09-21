import { Auth, Token } from '@internxt/sdk/dist/auth';
import { Backups, Payments, Referrals, Share, Storage, Trash, Users } from '@internxt/sdk/dist/drive';
import { ApiSecurity, ApiUrl, AppDetails } from '@internxt/sdk/dist/shared';
import { WorkspaceCredentialsDetails, Workspaces } from '@internxt/sdk/dist/workspaces';
import packageJson from '../../../../../package.json';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import { LocalStorageService } from 'services/local-storage.service';
import { EncryptedStorageService } from 'services/encrypted-storage.service';
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
    encryptedStorage: EncryptedStorageService;
    newApiInstance: SdkFactory;
  };
  private readonly apiUrl: ApiUrl;

  private constructor(apiUrl: ApiUrl) {
    this.apiUrl = apiUrl;
  }

  public static initialize(
    dispatch: AppDispatch,
    localStorage: LocalStorageService,
    encryptedStorage: EncryptedStorageService,
  ): void {
    this.sdk = {
      dispatch,
      localStorage,
      encryptedStorage,
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

  public createAuthClient(options?: {
    captchaToken?: string;
    turnstileToken?: string;
    unauthorizedCallback?: () => void;
  }): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders({
      captchaToken: options?.captchaToken,
      turnstileToken: options?.turnstileToken,
    });
    const apiSecurity = this.getNewApiSecurity(options?.unauthorizedCallback);
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public createDesktopAuthClient(options?: { turnstileToken?: string }): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getDesktopAppDetails(
      options?.turnstileToken ? { 'x-internxt-turnstile': options.turnstileToken } : undefined,
    );
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

  public createShareClient(captchaToken?: string): Share {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders({ captchaToken });
    const apiSecurity = this.getNewApiSecurity();
    return Share.client(apiUrl, appDetails, apiSecurity);
  }

  public createTrashClient(): Trash {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Trash.client(apiUrl, appDetails, apiSecurity);
  }

  public createUsersClient(captchaToken?: string): Users {
    const apiUrl = this.getApiUrl();
    const appDetails = this.getAppDetailsWithHeaders({ captchaToken });
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
    const apiSecurity = this.getIndividualApiSecurity();
    return Payments.client(envService.getVariable('payments'), appDetails, apiSecurity);
  }

  public async createCheckoutClient(): Promise<Checkout> {
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getIndividualApiSecurity();
    return Checkout.client(envService.getVariable('payments'), appDetails, apiSecurity);
  }

  public createBackupsClient(): Backups {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Backups.client(apiUrl, appDetails, apiSecurity);
  }

  public createLocationClient(): Location {
    const apiUrl = envService.getVariable('location');

    return Location.client(apiUrl);
  }

  /** Helpers **/

  private getNewApiSecurity(unauthorizedCallback?: () => void): ApiSecurity {
    const workspaceToken = this.getWorkspaceToken();
    return {
      token: this.getNewToken(),
      workspaceToken,
      unauthorizedCallback:
        unauthorizedCallback ??
        (() => {
          SdkFactory.sdk.dispatch(userThunks.logoutThunk());
        }),
    };
  }

  private getIndividualApiSecurity(): ApiSecurity {
    const token = this.getNewToken();
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

  private getAppDetailsWithHeaders(options?: { captchaToken?: string; turnstileToken?: string }): AppDetails {
    const headers = this.buildCustomHeaders(options);
    const customHeaders = Object.keys(headers).length > 0 ? headers : undefined;
    return SdkFactory.getAppDetails(customHeaders);
  }

  private static getDesktopAppDetails(customHeaders?: Record<string, string>): AppDetails {
    return {
      clientName: 'drive-desktop',
      clientVersion: packageJson.version,
      customHeaders,
    };
  }

  private getNewToken(): Token {
    return SdkFactory.sdk.encryptedStorage.getToken() || '';
  }

  private getWorkspaceToken(): Token | undefined {
    const workspaceId = SdkFactory.sdk.localStorage.get(LocalStorageItem.B2BworkspaceId);
    let token: string | undefined = undefined;
    if (workspaceId) {
      const credentials: WorkspaceCredentialsDetails | null = SdkFactory.sdk.encryptedStorage.getWorkspaceCredentials();
      if (credentials) {
        token = credentials.tokenHeader;
      }
    }
    return token;
  }

  private buildCustomHeaders(options?: { captchaToken?: string; turnstileToken?: string }): Record<string, string> {
    const headers: Record<string, string> = {};

    if (options?.captchaToken) {
      headers['x-internxt-captcha'] = options.captchaToken;
    }

    if (options?.turnstileToken) {
      headers['x-internxt-turnstile'] = options.turnstileToken;
    }

    return headers;
  }
}

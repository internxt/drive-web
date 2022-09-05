import { Storage, Share, Users, Referrals, Payments, Backups } from '@internxt/sdk/dist/drive';
import { Auth, Token } from '@internxt/sdk/dist/auth';
import { ApiSecurity, ApiUrl, AppDetails } from '@internxt/sdk/dist/shared';
import packageJson from '../../../../../package.json';
import { LocalStorageService } from '../../services/local-storage.service';
import { Workspace } from '../../types';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';
import { Photos } from '@internxt/sdk/dist/photos';
import authService from '../../../auth/services/auth.service';

export class SdkFactory {
  private static instance: SdkFactory;
  private readonly dispatch: AppDispatch;
  private readonly apiUrl: ApiUrl;
  private readonly localStorage: LocalStorageService;

  private constructor(apiUrl: ApiUrl, dispatch: AppDispatch, localStorage: LocalStorageService) {
    this.apiUrl = apiUrl;
    this.dispatch = dispatch;
    this.localStorage = localStorage;
  }

  public static initialize(dispatch: AppDispatch, localStorage: LocalStorageService): void {
    this.instance = new SdkFactory(process.env.REACT_APP_API_URL, dispatch, localStorage);
  }

  public static getNewApiInstance(): SdkFactory {
    return new SdkFactory(process.env.REACT_APP_DRIVE_NEW_API_URL, this.instance.dispatch, this.instance.localStorage);
  }

  public static getInstance(): SdkFactory {
    if (this.instance === undefined) {
      throw new Error('Factory not initialized');
    }
    return this.instance;
  }

  public createAuthClient(): Auth {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Auth.client(apiUrl, appDetails, apiSecurity);
  }

  public createStorageClient(): Storage {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Storage.client(apiUrl, appDetails, apiSecurity);
  }

  public createShareClient(): Share {
    const apiUrl = this.getApiV2Url();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getNewApiSecurity();
    return Share.client(apiUrl, appDetails, apiSecurity);
  }

  public createUsersClient(): Users {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
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

    let newToken = this.localStorage.get('xNewToken');

    if (!newToken) {
      newToken = await authService.getNewToken();
      this.localStorage.set('xNewToken', newToken);
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

  public async createPhotosClient(): Promise<Photos> {
    if (!this.localStorage.get('xToken')) {
      return new Photos(process.env.REACT_APP_PHOTOS_API_URL);
    }

    let newToken = this.localStorage.get('xNewToken');

    if (!newToken) {
      newToken = await authService.getNewToken();
      this.localStorage.set('xNewToken', newToken);
    }
    return new Photos(process.env.REACT_APP_PHOTOS_API_URL, newToken);
  }

  /** Helpers **/

  private getApiSecurity(): ApiSecurity {
    const workspace = this.localStorage.getWorkspace();
    return {
      mnemonic: this.getMnemonic(workspace),
      token: this.getToken(workspace),
      unauthorizedCallback: async () => {
        this.dispatch(userThunks.logoutThunk());
      },
    };
  }

  private getNewApiSecurity(): ApiSecurity {
    const workspace = this.localStorage.getWorkspace();
    return {
      mnemonic: this.getMnemonic(workspace),
      token: this.getNewToken(workspace),
      unauthorizedCallback: async () => {
        this.dispatch(userThunks.logoutThunk());
      },
    };
  }

  private getApiUrl(): ApiUrl {
    return this.apiUrl + '/api';
  }
  private getApiV2Url(): ApiUrl {
    return String(process.env.REACT_APP_DRIVE_NEW_API_URL);
  }

  private static getAppDetails(): AppDetails {
    return {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
    };
  }

  private getMnemonic(workspace: string): string {
    const mnemonicByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: this.localStorage.get('xMnemonic') || '',
      [Workspace.Business]: this.localStorage.getTeams()?.bridge_mnemonic || '',
    };
    return mnemonicByWorkspace[workspace];
  }

  private getToken(workspace: string): Token {
    const tokenByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: this.localStorage.get('xToken') || '',
      [Workspace.Business]: this.localStorage.get('xTokenTeam') || '',
    };
    return tokenByWorkspace[workspace];
  }

  private getNewToken(workspace: string): Token {
    const tokenByWorkspace: { [key in Workspace]: string } = {
      [Workspace.Individuals]: this.localStorage.get('xNewToken') || '',
      [Workspace.Business]: this.localStorage.get('xTokenTeam') || '',
    };
    return tokenByWorkspace[workspace];
  }
}

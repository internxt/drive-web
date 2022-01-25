import { Storage, Share, Users, Referrals, Payments, Backups } from '@internxt/sdk/dist/drive';
import { Auth, Token } from '@internxt/sdk/dist/auth';
import {
  ApiSecurity, ApiUrl,
  AppDetails
} from '@internxt/sdk/dist/shared';
import packageJson from '../../../../../package.json';
import { LocalStorageService } from '../../services/local-storage.service';
import { Workspace } from '../../types';
import { AppDispatch } from '../../../store';
import { userThunks } from '../../../store/slices/user';

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
    this.instance = new SdkFactory(
      process.env.REACT_APP_API_URL,
      dispatch,
      localStorage
    );
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
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
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

  public createPaymentsClient(): Payments {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Payments.client(apiUrl, appDetails, apiSecurity);
  }

  public createBackupsClient(): Backups {
    const apiUrl = this.getApiUrl();
    const appDetails = SdkFactory.getAppDetails();
    const apiSecurity = this.getApiSecurity();
    return Backups.client(apiUrl, appDetails, apiSecurity);
  }

  /** Helpers **/

  private getApiSecurity(): ApiSecurity {
    const workspace = this.localStorage.getWorkspace();
    return {
      mnemonic: this.getMnemonic(workspace),
      token: this.getToken(workspace),
      unauthorizedCallback: async () => {
        this.dispatch(userThunks.logoutThunk());
      }
    };
  }

  private getApiUrl(): ApiUrl {
    return this.apiUrl + '/api';
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

}

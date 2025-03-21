import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from '../core/services/local-storage.service';
import { PlanState } from '../store/slices/plan';
import { fetchPlanPrices } from 'app/newSettings/Sections/Account/Plans/api/plansApi';
import { UserType } from '@internxt/sdk/dist/drive/payments/types';

const BANNER_NAME_IN_LOCAL_STORAGE = 'show_banner';
const BANNER_NAME_FOR_FREE_USERS = 'show_free_users_banner';

export class BannerManager {
  private readonly plan: PlanState;
  private readonly offerEndDay: Date;
  private readonly isTutorialCompleted: boolean;
  private readonly isNewAccount: boolean;
  private readonly bannerItemInLocalStorage: string | null;
  private readonly todayDate: string;

  constructor(user: UserSettings, plan: PlanState, offerEndDay: Date, isNewAccount: boolean) {
    this.plan = plan;
    this.offerEndDay = offerEndDay;
    this.isTutorialCompleted = localStorageService.hasCompletedTutorial(user.userId);
    this.bannerItemInLocalStorage = localStorageService.get(BANNER_NAME_IN_LOCAL_STORAGE);
    this.isNewAccount = isNewAccount;
    this.todayDate = new Date().toISOString().split('T')[0];
  }

  private isOfferExpired(): boolean {
    return new Date() > this.offerEndDay;
  }

  private isLocalStorageExpired(): boolean {
    return (this.bannerItemInLocalStorage ?? '') < this.todayDate;
  }

  private clearLocalStorageIfExpired(): void {
    if (this.isOfferExpired() || this.isLocalStorageExpired()) {
      localStorageService.removeItem(BANNER_NAME_IN_LOCAL_STORAGE);
      localStorageService.removeItem(BANNER_NAME_FOR_FREE_USERS);
    }
  }

  private shouldShowFreeBanner(): boolean {
    return (
      this.plan.individualSubscription?.type === 'free' &&
      !this.bannerItemInLocalStorage &&
      !this.isOfferExpired() &&
      (this.isNewAccount ? this.isTutorialCompleted : true)
    );
  }

  private shouldShowSubscriptionBanner(): boolean {
    const subscription = this.plan.individualSubscription;
    const productId =
      (subscription?.type === 'lifetime' || subscription?.type === 'subscription') && subscription.productId;

    return false;
  }

  public getBannersToShow(): { showFreeBanner: boolean; showSubscriptionBanner: boolean } {
    this.clearLocalStorageIfExpired();
    return {
      showFreeBanner: this.shouldShowFreeBanner(),
      showSubscriptionBanner: this.shouldShowSubscriptionBanner(),
    };
  }

  public onCloseBanner(): void {
    localStorageService.set(BANNER_NAME_IN_LOCAL_STORAGE, this.todayDate);
  }
}

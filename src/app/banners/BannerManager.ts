import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import localStorageService from 'services/local-storage.service';
import { PlanState } from '../store/slices/plan';

const BANNER_NAME_IN_LOCAL_STORAGE = 'show_banner';
const BANNER_NAME_FOR_FREE_USERS = 'show_free_users_banner';

export class BannerManager {
  private readonly plan: PlanState;
  private readonly offerEndDay: Date;
  private readonly bannerItemInLocalStorage: string | null;
  private readonly todayDate: string;

  constructor(user: UserSettings, plan: PlanState, offerEndDay: Date) {
    this.plan = plan;
    this.offerEndDay = offerEndDay;
    this.bannerItemInLocalStorage = localStorageService.get(BANNER_NAME_FOR_FREE_USERS);
    this.todayDate = new Date().toISOString().split('T')[0];
  }

  private isOfferExpired(): boolean {
    return new Date() > this.offerEndDay;
  }

  private isBannerExpired(): boolean {
    return !this.bannerItemInLocalStorage || this.bannerItemInLocalStorage < this.todayDate;
  }

  private clearLocalStorageIfExpired(): void {
    if (this.isOfferExpired() || this.isBannerExpired()) {
      localStorageService.removeItem(BANNER_NAME_IN_LOCAL_STORAGE);
      localStorageService.removeItem(BANNER_NAME_FOR_FREE_USERS);
    }
  }

  private shouldShowFreeBanner(): boolean {
    return this.plan.individualSubscription?.type === 'free' && this.isBannerExpired() && !this.isOfferExpired();
  }

  private shouldShowSubscriptionBanner(): boolean {
    const plansToShow = [
      'price_1PNxYtFAOdcgaBMQzkimr6OU',
      'price_1PNxZkFAOdcgaBMQi0UCtXBj',
      'price_1PNxaDFAOdcgaBMQnKXWQRs0',
      'price_1OQ3MDFAOdcgaBMQ3he4Xqed',
      'price_1OQ3LKFAOdcgaBMQMK2UHHRM',
      'price_1OQ3IzFAOdcgaBMQqVd6kLyH',
      'price_1OQ3JbFAOdcgaBMQsawuy1PI',
      'price_1OQ3H6FAOdcgaBMQERw3KUuO',
      'price_1OQ3H5FAOdcgaBMQwMJ734rd',
      'price_1OQ3CtFAOdcgaBMQtqfzjX2M',
      'price_1OQ3CtFAOdcgaBMQFq2xX79Q',
    ];

    const planId = this.plan.individualPlan?.planId;

    return planId !== undefined && plansToShow.includes(planId);
  }

  public getBannersToShow(): { showFreeBanner: boolean; showSubscriptionBanner: boolean } {
    this.clearLocalStorageIfExpired();
    return {
      showFreeBanner: this.shouldShowFreeBanner(),
      showSubscriptionBanner: this.shouldShowSubscriptionBanner(),
    };
  }

  public onCloseBanner(): void {
    localStorageService.set(BANNER_NAME_FOR_FREE_USERS, this.todayDate);
  }
}

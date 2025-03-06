import localStorageService from '../core/services/local-storage.service';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

const BANNER_NAME_IN_LOCAL_STORAGE = 'show_banner';
const BANNER_NAME_FOR_FREE_USERS = 'show_free_users_banner';

export class BannerManager {
  private readonly plan: PlanState;
  private readonly offerEndDay: Date;
  private readonly isTutorialCompleted: boolean;
  private readonly isNewAccount: boolean;
  private readonly bannerItemInLocalStorage: string | null;
  private readonly todayDate: string;

  constructor(user: UserSettings, plan: PlanState, offerEndDay: Date) {
    this.plan = plan;
    this.offerEndDay = offerEndDay;
    this.isTutorialCompleted = localStorageService.hasCompletedTutorial(user.userId);
    this.bannerItemInLocalStorage = localStorageService.get(BANNER_NAME_IN_LOCAL_STORAGE);
    this.isNewAccount = useAppSelector(userSelectors.hasSignedToday);
    this.todayDate = new Date().getDate().toString();
  }

  private shouldShowBanner(subscriptionType: 'free' | 'subscription' | 'lifetime'): boolean {
    const isUserType = this.plan.individualSubscription?.type === subscriptionType;
    const isOfferExpired = new Date() > this.offerEndDay;
    const storedDate = JSON.parse(this.bannerItemInLocalStorage as string) ?? '';
    const todayDate = new Date().toISOString().split('T')[0];
    const isLocalStorageExpired = storedDate < todayDate;

    if (isOfferExpired || isLocalStorageExpired) {
      localStorageService.removeItem(BANNER_NAME_IN_LOCAL_STORAGE);
      localStorageService.removeItem(BANNER_NAME_FOR_FREE_USERS);
    }

    return (
      isUserType &&
      !this.bannerItemInLocalStorage &&
      !isOfferExpired &&
      ((this.isNewAccount && this.isTutorialCompleted) || !this.isNewAccount)
    );
  }

  public handleBannerDisplay(
    subscriptionType: 'free' | 'subscription' | 'lifetime',
    setShowBanner: (show: boolean) => void,
  ): void {
    if (this.shouldShowBanner(subscriptionType)) {
      setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    }
  }

  public onCloseBanner(setShowBanner: (show: boolean) => void): void {
    localStorageService.set(BANNER_NAME_IN_LOCAL_STORAGE, this.todayDate);
    setShowBanner(false);
  }
}

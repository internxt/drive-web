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

    this.cleanUpExpiredBanners();
  }

  private cleanUpExpiredBanners(): void {
    const isOfferOffDay = new Date() > this.offerEndDay;
    const bannerExpirationDate = this.bannerItemInLocalStorage ? Number(this.bannerItemInLocalStorage) : null;
    const isBannerExpired = bannerExpirationDate !== null && bannerExpirationDate < Number(this.todayDate);

    if (isOfferOffDay || isBannerExpired) {
      localStorageService.removeItem(BANNER_NAME_IN_LOCAL_STORAGE);
      localStorageService.removeItem(BANNER_NAME_FOR_FREE_USERS);
    }
  }

  private shouldShowBannerByType(type: 'free' | 'lifetime' | 'subscription'): boolean {
    const isUserSubscriptionType = this.plan.individualSubscription?.type === type;
    const isOfferOffDay = new Date() > this.offerEndDay;
    const hasExpiredBanner = this.bannerItemInLocalStorage
      ? Number(this.bannerItemInLocalStorage) < Number(this.todayDate)
      : false;

    return (
      isUserSubscriptionType &&
      !this.bannerItemInLocalStorage &&
      !isOfferOffDay &&
      ((this.isNewAccount && this.isTutorialCompleted) || !this.isNewAccount)
    );
  }

  handleBannerDisplayByType(type: 'free' | 'lifetime' | 'subscription', setShowBanner: (show: boolean) => void): void {
    const shouldShow = this.shouldShowBannerByType(type);
    if (shouldShow) {
      setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    }
  }

  onCloseBanner(setShowBanner: (show: boolean) => void): void {
    localStorageService.set(BANNER_NAME_IN_LOCAL_STORAGE, this.todayDate);
    setShowBanner(false);
  }
}

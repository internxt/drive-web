import localStorageService from '../core/services/local-storage.service';
import { useAppSelector } from '../store/hooks';
import { PlanState } from '../store/slices/plan';
import { userSelectors } from '../store/slices/user';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

const BANNER_NAME_IN_LOCAL_STORAGE = 'show_banner';
const BANNER_NAME_FOR_FREE_USERS = 'show_free_users_banner';
const OFFER_END_DAY = new Date('2024-07-01');

export class BannerManager {
  private plan: PlanState;
  private isTutorialCompleted: boolean;
  private isNewAccount: boolean;
  private bannerItemInLocalStorage: string | null;

  constructor(user: UserSettings, plan: PlanState) {
    this.plan = plan;
    this.isTutorialCompleted = localStorageService.hasCompletedTutorial(user.userId);
    this.bannerItemInLocalStorage = localStorageService.get(BANNER_NAME_FOR_FREE_USERS);
    this.isNewAccount = useAppSelector(userSelectors.hasSignedToday);
  }

  shouldShowBanner(): boolean {
    const isNewUser = this.plan.subscription?.type === 'free';
    const isOfferOffDay = new Date() > OFFER_END_DAY;

    if (isOfferOffDay) {
      localStorageService.removeItem(BANNER_NAME_IN_LOCAL_STORAGE);
      localStorageService.removeItem(BANNER_NAME_FOR_FREE_USERS);
    }

    return (
      isNewUser &&
      !this.bannerItemInLocalStorage &&
      !isOfferOffDay &&
      ((this.isNewAccount && this.isTutorialCompleted) || !this.isNewAccount)
    );
  }

  handleBannerDisplay(setShowBanner: (show: boolean) => void): void {
    if (this.shouldShowBanner()) {
      setShowBanner(true);
    }
  }

  onCloseBanner(setShowBanner: (show: boolean) => void): void {
    localStorageService.set(BANNER_NAME_FOR_FREE_USERS, 'false');
    setShowBanner(false);
  }
}

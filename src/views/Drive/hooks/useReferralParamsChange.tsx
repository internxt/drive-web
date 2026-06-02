import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import errorService from 'services/error.service';
import navigationService from 'services/navigation.service';
import referralService from 'services/referral.service';

const REFERRAL_PARAM = 'referral';

const removeReferralParam = (): void => {
  const cleanedParams = new URLSearchParams(globalThis.location.search);
  cleanedParams.delete(REFERRAL_PARAM);
  const search = cleanedParams.toString();
  navigationService.history.replace({
    pathname: globalThis.location.pathname,
    search: search ? `?${search}` : '',
  });
};

export const useReferralParamsChange = () => {
  const { t, i18n } = useTranslation();
  const user = useAppSelector((state: RootState) => state.user.user);
  const isReferralEligible = useAppSelector((state: RootState) => state.referrals.isEligible);
  const hasOpened = useRef(false);

  const params = new URLSearchParams(globalThis.location.search);
  const shouldOpenReferral = params.get(REFERRAL_PARAM) === 'open';

  useEffect(() => {
    if (!shouldOpenReferral || hasOpened.current) return;
    if (!user || !isReferralEligible) return;

    hasOpened.current = true;

    const openReferralPanel = async () => {
      try {
        await referralService.openPanel(
          { name: user.name, lastname: user.lastname, email: user.email, emailVerified: user.emailVerified },
          i18n.language,
        );
      } catch (error) {
        errorService.reportError(error);
        notificationsService.show({ text: t('referrals.openError'), type: ToastType.Error });
      } finally {
        removeReferralParam();
      }
    };

    void openReferralPanel();
  }, [shouldOpenReferral, user, isReferralEligible]);
};

import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RootState } from 'app/store';
import { useAppSelector } from 'app/store/hooks';
import navigationService from 'services/navigation.service';
import referralService from 'services/referral.service';

const REFERRAL_PARAM = 'referral';

export const useReferralParamsChange = () => {
  const { i18n } = useTranslation();
  const user = useAppSelector((state: RootState) => state.user.user);
  const isReferralEligible = useAppSelector((state: RootState) => state.referrals.isEligible);
  const hasOpened = useRef(false);

  const params = new URLSearchParams(globalThis.location.search);
  const shouldOpenReferral = params.get(REFERRAL_PARAM) === 'open';

  useEffect(() => {
    if (!shouldOpenReferral || hasOpened.current) return;
    if (!user || !isReferralEligible) return;

    hasOpened.current = true;

    referralService.openPanel(
      { name: user.name, lastname: user.lastname, email: user.email, emailVerified: user.emailVerified },
      i18n.language,
    );

    const cleanedParams = new URLSearchParams(globalThis.location.search);
    cleanedParams.delete(REFERRAL_PARAM);
    const search = cleanedParams.toString();
    navigationService.history.replace({
      pathname: globalThis.location.pathname,
      search: search ? `?${search}` : '',
    });
  }, [shouldOpenReferral, user, isReferralEligible]);
};

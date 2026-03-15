import { useEffect, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import referralService from 'services/referral.service';

interface ReferralBannerProps {
  onCtaClick: () => void;
  isCollapsed?: boolean;
}

const ReferralBanner = ({ onCtaClick, isCollapsed }: ReferralBannerProps) => {
  const { translate } = useTranslationContext();
  const hasCountedShow = useRef(false);
  const [isVisible, setIsVisible] = useState(() => {
    const isVisible = referralService.shouldShowBanner();
    if (isVisible) {
      referralService.incrementBannerShowCount();
      hasCountedShow.current = true;
    }
    return isVisible;
  });

  useEffect(() => {
    if (isVisible) return;

    return referralService.onTrigger(() => {
      if (!hasCountedShow.current && referralService.shouldShowBanner()) {
        referralService.incrementBannerShowCount();
        hasCountedShow.current = true;
        setIsVisible(true);
      }
    });
  }, [isVisible]);

  const handleDismiss = () => {
    referralService.dismissBanner();
    setIsVisible(false);
  };

  const handleCtaClick = () => {
    referralService.markReferralModalOpened();
    setIsVisible(false);
    onCtaClick();
  };

  if (!isVisible || isCollapsed) return null;

  return (
    <div className="mx-3 mb-3 rounded-lg border border-[#E5EFFF] bg-[#F4F8FF] p-3 dark:border-[#082D66] dark:bg-[#031632]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-gray-80">{translate('sideNav.referralBanner.message')}</p>
        <button
          onClick={handleDismiss}
          className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-gray-50 hover:text-gray-80"
        >
          <X size={20} />
        </button>
      </div>
      <button
        onClick={handleCtaClick}
        className="mt-2 cursor-pointer border-none bg-transparent p-0 text-sm font-medium text-[#438EFF]"
      >
        {translate('sideNav.referralBanner.cta')}
      </button>
    </div>
  );
};

export default ReferralBanner;

import { useEffect, useState } from 'react';
import CrowdcubeBanner from './CrowdcubeBanner';

const BannerWrapper = (): JSX.Element => {
  const [showBanner, setShowBanner] = useState(false);

  const onCloseBanner = () => {
    setShowBanner(false);
    sessionStorage.setItem('showBanner', 'false');
  };

  function handleBannerDisplay() {
    if (!sessionStorage.getItem('showBanner')) {
      setShowBanner(true);
    }
  }

  useEffect(() => {
    handleBannerDisplay();
  }, []);

  return <CrowdcubeBanner onCloseBanner={onCloseBanner} showBanner={showBanner} />;
};

export default BannerWrapper;

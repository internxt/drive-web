import { useEffect, useState } from 'react';
import Banner from './Banner';

const BannerWrapper = () => {
  const [showBanner, setShowBanner] = useState(true);

  const onClose = () => {
    setShowBanner(false);
    localStorage.setItem('showLifetimeBanner', 'false');
  };

  useEffect(() => {
    if (localStorage.getItem('showLifetimeBanner') === 'false') {
      setShowBanner(false);
    }
  }, []);

  return <Banner showBanner={showBanner} onClose={onClose} />;
};

export default BannerWrapper;

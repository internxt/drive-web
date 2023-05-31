import { useEffect, useState } from 'react';
import Banner from './Banner';
import SummerBanner from './SummerBanner';

const BannerWrapper = () => {
  const [showBanner, setShowBanner] = useState(false);

  const onClose = () => {
    setShowBanner(false);
    localStorage.setItem('showSummerBanner', 'false');
  };

  useEffect(() => {
    if (!localStorage.getItem('showSummerBanner')) {
      setTimeout(() => {
        setShowBanner(true);
      }, 5000);
    }
  }, []);

  return <SummerBanner showBanner={showBanner} onClose={onClose} />;
};

export default BannerWrapper;

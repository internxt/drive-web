import React, { useEffect } from 'react';
import { X } from 'phosphor-react';
import Hearts from 'assets/images/banner/hearts.png';
import NeonBlur from 'assets/images/banner/neonBlur.png';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const ValentinesBanner = () => {
  const [showLifetimeBanner, setShowLifetimeBanner] = React.useState(false);
  const { translate } = useTranslationContext();
  const onClose = () => {
    setShowLifetimeBanner(false);
    localStorage.setItem('showLifetimeBanner', 'false');
  };

  useEffect(() => {
    setTimeout(() => {
      setShowLifetimeBanner(true);
    }, 5000);

    localStorage.getItem('showLifetimeBanner') === 'false' && setShowLifetimeBanner(false);
    window.addEventListener('unload', function (e) {
      e.preventDefault();
      localStorage.removeItem('showLifetimeBanner');
    });
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      window.removeEventListener('unload', () => {});
    };
  }, []);

  return (
    <div
      className={`${showLifetimeBanner ? 'flex' : 'hidden'} 
         absolute top-0 left-0 right-0 bottom-0 z-10 bg-black bg-opacity-40`}
    >
      <div
        className={`absolute top-1/2 left-1/2 flex h-auto max-w-4xl -translate-y-1/2 -translate-x-1/2
        transform flex-col overflow-hidden rounded-2xl  text-neutral-900`}
        style={{
          backgroundImage: `url(${NeonBlur})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: 'cover',
        }}
      >
        <button className="absolute right-0 m-5 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="ml-14 flex flex-row py-10">
          <div className="flex w-full flex-col space-y-9">
            <div className="flex max-w-xs flex-col items-start">
              <p className="text-5xl font-bold text-white ">{translate('valentinesBanner.title')}</p>
              <p className=" pt-4 text-2xl font-medium text-white lg:w-80">{translate('valentinesBanner.subtitle')}</p>
            </div>
            <div className="flex">
              <button
                className="focus:outline-none relative flex h-14 w-48 flex-row items-center justify-center space-x-4 rounded-full bg-primary px-8 text-base text-white transition duration-100 focus-visible:bg-primary-dark active:bg-primary-dark sm:text-lg"
                onClick={() => {
                  window.location.replace(
                    'https://drive.internxt.com/checkout-plan?planId=plan_FkTXxEg3GZW0pg&couponCode=G8Ti4z1k&mode=subscription',
                  );
                }}
              >
                {translate('valentinesBanner.cta')}
              </button>
            </div>
          </div>
          <div className=" hidden w-full pl-10 lg:flex">
            <div className="flex object-cover">
              <img src={Hearts} alt="hero" loading="lazy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValentinesBanner;

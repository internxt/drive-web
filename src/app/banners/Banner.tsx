import React, { useEffect } from 'react';
import { X } from 'phosphor-react';
import NeonBlur from 'assets/images/banner/infinity.svg';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const Banner = () => {
  const [showLifetimeBanner, setShowLifetimeBanner] = React.useState(true);
  const { translate } = useTranslationContext();
  const onClose = () => {
    setShowLifetimeBanner(false);
    localStorage.setItem('showLifetimeBanner', 'false');
  };

  useEffect(() => {
    if (localStorage.getItem('showLifetimeBanner') === 'false') {
      setShowLifetimeBanner(false);
    } else {
      setTimeout(() => {
        setShowLifetimeBanner(true);
      }, 5000);
    }
  }, []);

  return (
    <div
      className={`${showLifetimeBanner ? 'flex' : 'hidden'} 
         absolute top-0 left-0 right-0 bottom-0 z-10 bg-black bg-opacity-40`}
    >
      <div
        className={`absolute top-1/2 left-1/2 flex h-auto max-w-4xl -translate-y-1/2 -translate-x-1/2
        transform flex-col overflow-hidden rounded-2xl bg-primary-dark  text-neutral-900`}
        style={{
          backgroundImage: `url(${NeonBlur})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '1100px 611px',
        }}
      >
        <button className="absolute right-0 m-5 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex flex-col py-10 px-40">
          <div className="flex w-full flex-col items-center space-y-9">
            <div className="flex flex-col text-center">
              <p className="text-5xl font-bold text-white ">{translate('lifetimeBanner.title')}</p>
              <p className=" pt-4 text-2xl font-medium text-white">{translate('lifetimeBanner.description')}</p>
            </div>
            <div className="flex flex-row space-x-6">
              <div className="flex flex-col items-center space-y-1 rounded-xl bg-white py-3 px-4">
                <div className="flex items-center justify-center rounded-full bg-gray-5 px-3 py-1 text-base font-semibold text-primary">
                  <p>{translate('lifetimeBanner.cards.1.space')}</p>
                </div>
                <div className="flex">
                  <p className={' flex flex-row items-start space-x-0.5 whitespace-nowrap font-medium text-gray-80'}>
                    <span className={'text-semibold text-2xl'}>€</span>
                    <span className="price text-5xl font-bold">{translate('lifetimeBanner.cards.1.price')}</span>
                  </p>
                </div>
              </div>
              <div className="-mb-3 flex flex-col items-center justify-center space-y-1 rounded-xl bg-white px-4">
                <div className="flex items-center justify-center rounded-full bg-gray-5 px-3 py-1 text-base font-semibold text-primary">
                  <p>{translate('lifetimeBanner.cards.2.space')}</p>
                </div>
                <div className="flex">
                  <p className={' flex flex-row items-start space-x-0.5 whitespace-nowrap font-medium text-gray-80'}>
                    <span className={'text-semibold text-2xl'}>€</span>
                    <span className="price text-5xl font-bold">{translate('lifetimeBanner.cards.2.price')}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center space-y-1 rounded-xl bg-white py-3 px-4">
                <div className="flex items-center justify-center rounded-full bg-gray-5 px-3 py-1 text-base font-semibold text-primary">
                  <p>{translate('lifetimeBanner.cards.3.space')}</p>
                </div>
                <div className="flex">
                  <p className={' flex flex-row items-start space-x-0.5 whitespace-nowrap font-medium text-gray-80'}>
                    <span className={'text-semibold text-2xl'}>€</span>
                    <span className="price text-5xl font-bold">{translate('lifetimeBanner.cards.3.price')}</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex">
              <button
                className="focus:outline-none relative flex flex-row items-center justify-center space-x-4 rounded-lg bg-white px-7 py-3 text-base font-medium text-primary transition duration-100 focus-visible:bg-gray-1 active:bg-gray-1 sm:text-lg"
                onClick={() => {
                  window.open(
                    'https://internxt.com/pricing?utm_source=drive&utm_medium=banner&utm_campaign=lifetimeapril',
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
              >
                {translate('lifetimeBanner.cta')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;

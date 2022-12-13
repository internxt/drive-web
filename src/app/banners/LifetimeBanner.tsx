import { useEffect } from 'react';
import { X } from 'phosphor-react';
import React from 'react';
import { ReactComponent as Infinity } from 'assets/images/banner/infinity.svg';
import { ReactComponent as InxtWhiteLogo } from 'assets/images/banner/inxt-logo.svg';

const LifetimeBanner = () => {
  const [showLifetimeBanner, setShowLifetimeBanner] = React.useState(true);
  const onClose = () => {
    setShowLifetimeBanner(false);
    localStorage.setItem('showLifetimeBanner', 'false');
  };

  useEffect(() => {
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
        transform flex-col overflow-hidden rounded-3xl bg-primary-dark p-3 text-neutral-900`}
      >
        <div
          className={`relative z-30 ml-auto
           cursor-pointer text-white transition duration-200 ease-in-out hover:text-gray-10`}
        >
          <X onClick={onClose} size={28} />
        </div>
        <div className="ml-8 flex flex-row py-3">
          <div className="flex w-full flex-col space-y-9">
            <InxtWhiteLogo width={120} />
            <div className="flex flex-col">
              <p className="w-80 text-5xl font-bold text-white">Get a lifetime Internxt plan!</p>
              <p className="-mt-2 w-72 pt-6 text-3xl font-semibold text-white">Buy once and get privacy forever.</p>
            </div>
            <div
              className="flex w-48 cursor-pointer items-center justify-center rounded-full bg-white px-9 py-4"
              onClick={() => {
                window.open(
                  'https://internxt.com/lifetime?utm_source=driveweb&utm_medium=banner&utm_campaign=lifetime',
                  '_blank',
                  'noopener,noreferrer',
                );
              }}
            >
              <p className="text-lg font-medium text-primary">Get the deal</p>
            </div>
          </div>
          <div className="flex flex-col">
            <Infinity className="relative -right-16 h-full w-156" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LifetimeBanner;

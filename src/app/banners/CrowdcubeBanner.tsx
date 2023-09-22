import { X } from '@phosphor-icons/react';
import { ReactComponent as InternxtLogo } from 'assets/images/banner/inxt-logo.svg';
import { ReactComponent as CrowdcubeInternxt } from 'assets/images/banner/Crowdcube_Internxt.svg';

const CrowdcubeBanner = ({
  onCloseBanner,
  showBanner,
}: {
  onCloseBanner: () => void;
  showBanner: boolean;
}): JSX.Element => {
  return (
    <div
      className={`${
        showBanner ? 'flex' : 'hidden'
      }  fixed top-0 left-0 right-0 bottom-0 z-50 h-screen bg-black bg-opacity-50 px-5 lg:px-0`}
    >
      <div
        className={`${showBanner ? 'flex' : 'hidden'} absolute top-1/2 left-1/2 flex w-full
        -translate-y-1/2 -translate-x-1/2 transform flex-col rounded-2xl bg-primary-dark md:max-w-3.5xl`}
      >
        <button className="absolute right-0 m-7 flex w-auto text-white" onClick={onCloseBanner}>
          <X size={32} />
        </button>
        <div className="flex w-full flex-row justify-between">
          <div className="mx-12 flex w-full max-w-sm flex-col items-center justify-center space-y-9 pt-20 pb-16 text-center lg:items-start lg:justify-start lg:text-left">
            <InternxtLogo className="h-4 max-w-[120px]" />
            <div className="flex  flex-col space-y-6 text-white">
              <p className="text-5xl font-bold">Become a part of Internxt's future</p>
              <p className="text-2xl font-semibold">
                Don't just use it, own it. Let's shape a brighter future together!
              </p>
            </div>
            <div className="flex flex-col space-y-3">
              <button
                className="flex w-max items-center justify-center rounded-lg bg-white px-5 py-3 text-center font-medium text-primary"
                onClick={() => {
                  window.open('https://www.crowdcube.com/companies/internxt/pitches/l8aE5Z', '_blank', 'noopener');
                  onCloseBanner();
                }}
              >
                Secure your stake
              </button>
              <p className="text-xs font-medium text-gray-5">Capital at Risk</p>
            </div>
          </div>
          <div className="hidden w-full max-w-xs flex-col items-center justify-center space-y-3 rounded-r-2xl bg-primary md:flex">
            <CrowdcubeInternxt />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrowdcubeBanner;

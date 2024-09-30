import { CheckCircle, X } from '@phosphor-icons/react';
import LifetimeBig from 'assets/images/banner/lifetime_big.png';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL;

const Banner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }): JSX.Element => {
  const { translate } = useTranslationContext();
  return (
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
         absolute bottom-0 left-0 right-0 top-0 z-10 bg-black/40`}
    >
      <div
        className={`text-neutral-900 absolute left-1/2 top-1/2 flex h-auto max-w-4xl -translate-x-1/2
        -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-primary-dark`}
      >
        <button className="absolute right-0 z-50 m-5 flex w-auto text-white" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-screen max-w-[800px] flex-col py-10 pl-10">
          <div className="absolute right-0 top-0">
            <img src={LifetimeBig} alt="Discount label" height={260} width={508} />
          </div>
          <div className="z-50 flex w-full  flex-col space-y-8">
            <div className="flex flex-col space-y-4">
              <p className="pr-20 text-3xl font-semibold text-white">{translate('banner.label')}</p>
              <p className="max-w-[500px] text-5xl font-bold text-white">{translate('banner.title')}</p>
            </div>
            <div className="flex flex-col space-y-6">
              <button
                className="relative flex w-max flex-row items-center space-x-4 rounded-lg bg-white px-7 py-3 text-base font-medium text-primary transition duration-100 focus:outline-none focus-visible:bg-gray-1 active:bg-gray-1 sm:text-lg"
                onClick={() => {
                  onClose();
                  window.open(`${WEBSITE_URL}/lifetime`, '_blank', 'noopener noreferrer');
                }}
              >
                {translate('banner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-2">
                <CheckCircle size={24} className="text-white" />
                <p className="text-lg font-medium text-white">{translate('banner.guarantee')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Banner;

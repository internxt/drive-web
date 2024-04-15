import { X } from '@phosphor-icons/react';
import FileConverter from 'assets/images/banner/file-converter-banner.webp';

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
        -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-white`}
      >
        <button className="absolute right-0 z-50 m-5 flex w-auto bg-white text-black" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-screen max-w-[800px] flex-row pl-10">
          <div className="z-50 flex w-full  flex-col justify-center space-y-8">
            <div className="flex flex-col space-y-4">
              <div className="w-max rounded-lg border-4 border-primary/7 px-3.5 py-1.5">
                <p className="text-xl font-semibold text-primary">{translate('banner.label')}</p>
              </div>
              <p className="max-w-[500px] text-5xl font-bold text-gray-80 dark:text-gray-20">
                {translate('banner.title.normal1')}
                <span className="text-primary">{translate('banner.title.free')}</span>
                {translate('banner.title.normal2')}
              </p>
            </div>
            <button
              className="flex w-max flex-row items-center space-x-4 rounded-lg bg-primary px-7 py-3 text-base font-medium text-white transition duration-100 focus:outline-none focus-visible:bg-gray-1 active:bg-gray-1 sm:text-lg"
              onClick={() => {
                onClose();
                window.open(`${WEBSITE_URL}/file-converter`, '_blank', 'noopener noreferrer');
              }}
            >
              {translate('banner.cta')}
            </button>
          </div>
          <div className="flex h-max w-full">
            <img src={FileConverter} alt="File Converter" width={400} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;

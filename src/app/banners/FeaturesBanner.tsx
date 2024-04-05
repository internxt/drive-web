import { CheckCircle, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const KeyHoleIcon = () => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" fill="rgb(0,102,255)" viewBox="0 0 256 256">
      <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm29.52,146.39a4,4,0,0,1-3.66,5.61H102.14a4,4,0,0,1-3.66-5.61L112,139.72a32,32,0,1,1,32,0Z"></path>
    </svg>
  );
};

const FeaturesBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }): JSX.Element => {
  const { translate, translateList } = useTranslationContext();

  const features = translateList('featuresBanner.features');

  const handleOnClick = () => {
    window.open('https://internxt.com/lifetime', '_blank', 'noopener noreferrer');
  };

  return (
    //Background
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
         fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      {/* Banner */}
      <div
        className={
          'fixed left-1/2 top-1/2 flex h-auto -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden rounded-2xl border-4 border-primary/10 bg-white px-10'
        }
      >
        <button className="absolute  right-0 m-7 flex text-black" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-full flex-col space-x-10 py-14 lg:flex-row">
          <div className="flex  w-max max-w-[310px] flex-col  items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex rounded-lg bg-white px-3 py-1.5 ring-4 ring-primary/7">
              <p className="text-2xl font-bold text-primary">{translate('featuresBanner.label')}</p>
            </div>
            <p className="w-full text-4xl font-bold leading-tight text-black">{translate('featuresBanner.title')}</p>

            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary px-5 py-3 text-lg font-medium text-white hover:bg-primary-dark"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-2 text-gray-80 dark:text-gray-20">
                <CheckCircle size={24} className="" />
                <p className="font-medium lg:text-lg">{translate('featuresBanner.guarantee')}</p>
              </div>

              <p className="text-sm font-medium text-gray-50">{translate('featuresBanner.lastCta')}</p>
            </div>
          </div>
          <div className="hidden items-center lg:flex">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8">
                {features.map((card) => (
                  <div className="flex flex-row space-x-4" key={card}>
                    <KeyHoleIcon />
                    <p className="whitespace-nowrap text-xl font-semibold text-gray-80 dark:text-gray-20">{card}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesBanner;

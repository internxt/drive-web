import { CheckCircle, Flower, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const FeaturesBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }): JSX.Element => {
  const { translate, translateList } = useTranslationContext();

  const features = translateList('featuresBanner.features');

  const handleOnClick = () => {
    window.open('https://internxt.com/pricing', '_blank', 'noopener noreferrer');
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
        <div className="flex w-full max-w-[800px] flex-col space-x-10 py-14 lg:flex-row">
          <div className="flex w-full flex-col  items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex rounded-lg bg-white px-3 py-1.5 ring-4 ring-primary/7">
              <p className="text-2xl font-bold text-primary">{translate('featuresBanner.label')}</p>
            </div>
            <p className="w-full max-w-[380px] text-4xl font-bold leading-tight text-black">
              {translate('featuresBanner.title')}
            </p>

            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary px-5 py-3 text-lg font-medium text-white hover:bg-primary-dark"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-2 text-gray-80 dark:text-gray-20">
                <CheckCircle size={24} className="" />
                <p className="whitespace-nowrap font-medium lg:text-lg">{translate('featuresBanner.guarantee')}</p>
              </div>

              <p className="text-sm font-medium text-gray-50">{translate('featuresBanner.lastCta')}</p>
            </div>
          </div>
          <div className="hidden items-center lg:flex">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8">
                {features.map((card) => (
                  <div className="flex flex-row" key={card}>
                    <Flower size={30} weight="fill" className="mr-4 text-primary" />
                    <p className="whitespace-nowrap text-lg font-semibold text-gray-80 dark:text-gray-20">{card}</p>
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

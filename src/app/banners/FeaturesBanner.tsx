import { CheckCircle, Heart, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

const WEBSITE_URL = process.env.REACT_APP_WEBSITE_URL;

const FeaturesBanner = ({ showBanner, onClose }: { showBanner: boolean; onClose: () => void }): JSX.Element => {
  const { translate } = useTranslationContext();

  const features = [
    {
      title: translate('featuresBanner.features.discount'),
    },
    {
      title: translate('featuresBanner.features.safeCloud'),
    },
    {
      title: translate('featuresBanner.features.openSource'),
    },
    {
      title: translate('featuresBanner.features.endToEnd'),
    },
    {
      title: translate('featuresBanner.features.unauthorized'),
    },
    {
      title: translate('featuresBanner.features.offerEnds'),
    },
  ];

  const handleOnClick = () => {
    window.open(`${WEBSITE_URL}/pricing`, '_blank', 'noopener noreferrer');
  };

  return (
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
         fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      {/* Banner */}
      <div
        className={
          'fixed left-1/2 top-1/2 flex h-auto -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden rounded-2xl border-4 border-primary/7 bg-white'
        }
      >
        <button className="absolute  right-0 m-7 flex text-black" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-auto flex-col p-14 lg:flex-row lg:p-20">
          <div className="flex flex-col items-center justify-center space-y-4 text-center lg:items-start lg:justify-between lg:pr-20 lg:text-start">
            <div className="flex w-max rounded-2xl bg-red-dark px-4 py-2 ring-4 ring-red">
              <p className="text-2xl font-bold text-white">{translate('featuresBanner.label')}</p>
            </div>
            <p className="pt-5 text-5xl font-bold text-gray-100 dark:text-gray-10">
              {translate('featuresBanner.title')}
            </p>

            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-gray-5 px-5 py-3 text-lg font-medium text-gray-80 hover:bg-gray-10"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-2 text-gray-80 dark:text-gray-20">
                <CheckCircle size={24} className="" />
                <p className="whitespace-nowrap font-medium lg:text-lg">{translate('featuresBanner.guarantee')}</p>
              </div>

              <p className="text-sm font-medium text-gray-80 dark:text-gray-20">
                {translate('featuresBanner.lastCta')}
              </p>
            </div>
          </div>
          <div className="hidden items-center lg:flex">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8">
                {features.map((card) => (
                  <div className="flex flex-row" key={card.title}>
                    <Heart size={32} weight="fill" className="mr-4 text-red-dark" />
                    <p className="whitespace-nowrap text-xl font-semibold text-gray-80 dark:text-gray-20">
                      {card.title}
                    </p>
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

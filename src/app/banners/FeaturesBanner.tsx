import { CheckCircle, SoccerBall, X } from '@phosphor-icons/react';

import GrassImage from '../../assets/images/banner/grass.webp';

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
      className={`${showBanner ? 'flex' : 'hidden'} fixed
         bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      {/* Banner */}
      <div
        className={
          'fixed left-1/2 top-1/2 flex h-auto -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden rounded-2xl px-10'
        }
        style={{
          backgroundImage: `url(${GrassImage})`,
        }}
      >
        <button className="absolute  right-0 m-7 flex text-white hover:bg-white/5" onClick={onClose}>
          <X size={32} />
        </button>
        <div className="flex w-full flex-col space-x-10 py-14 lg:flex-row">
          <div className="flex  w-max max-w-[310px] flex-col  items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex rounded-xl border-4 border-primary bg-gray-100 px-3 py-1.5 dark:bg-surface">
              <p className="flex items-center gap-1 text-xs font-bold text-white">
                {translate('featuresBanner.label.upTo')}
                <label className="text-2xl">{translate('featuresBanner.label.discount')}</label>
              </p>
            </div>
            <p className="w-full text-4xl font-bold leading-tight text-white">{translate('featuresBanner.title')}</p>

            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary px-5 py-3 text-lg font-medium text-white hover:bg-primary-dark"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-2 text-white">
                <CheckCircle size={24} className="text-primary" />
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
                    <SoccerBall weight="fill" size={32} className="text-primary" />
                    <p className="whitespace-nowrap text-xl font-semibold text-white">{card}</p>
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

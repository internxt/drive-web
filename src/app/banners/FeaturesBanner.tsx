import { CheckCircle, Football, SealPercent, Snowflake, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import GrassImage from '../../assets/images/banner/grass.webp';

interface FeaturesBannerProps {
  showBanner: boolean;
  onClose: () => void;
}

const FeaturesBanner = ({ showBanner, onClose }: FeaturesBannerProps): JSX.Element => {
  const { translate, translateList } = useTranslationContext();

  const features = translateList('featuresBanner.features');

  const handleOnClick = () => {
    window.open('https://internxt.com/pricing', '_blank', 'noopener noreferrer');
    onClose();
  };

  return (
    //Background
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
      fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      <div
        className={
          'fixed left-1/2 top-1/2 flex h-auto -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden rounded-2xl px-10'
        }
        style={{
          backgroundImage: `url(${GrassImage})`,
        }}
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-0 m-7 flex rounded-md text-white hover:bg-gray-1/10"
          onClick={onClose}
        >
          <X size={32} />
        </button>
        <div className="flex max-w-[800px] flex-col items-center justify-between py-16 md:flex-row md:pb-20 lg:w-screen">
          <div className="flex h-max w-full flex-col items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex rounded-lg border-2 border-primary bg-gray-10 px-3 py-1.5">
              <p className="text-2xl font-bold text-white">{translate('featuresBanner.label')}</p>
            </div>
            <p className="w-full max-w-[400px] text-5xl font-bold leading-tight text-white">
              {translate('featuresBanner.title')}
            </p>

            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary px-5 py-3 text-lg font-medium text-white"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-2">
                <CheckCircle size={24} className="text-primary" />
                <p className="whitespace-nowrap font-medium text-white lg:text-lg">
                  {translate('featuresBanner.guarantee')}
                </p>
              </div>
              <p className="text-sm font-medium dark:text-gray-10 text-gray-90">
                {translate('featuresBanner.lastCta')}
              </p>
            </div>
          </div>
          <div className="hidden w-full items-center lg:flex">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8">
                {features.map((card, index) =>
                  index === features.length - 2 ? (
                    <div className="flex flex-row space-x-1 font-bold " key={index}>
                      <div className="flex">
                        <Football size={32} className="mr-4 text-primary" weight="fill" />
                        <p className="text-lg font-semibold text-primary">{card}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-row space-x-4" key={index}>
                      <Football size={32} className="text-primary" weight="fill" />
                      <p className="text-lg font-semibold text-white">{card}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeaturesBanner;

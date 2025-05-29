import { Asterisk, CheckCircle, ShieldCheck, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ShieldIcon from 'assets/images/banner/shield-blue.svg';
import styles from 'app/banners/FeaturesBanner.module.scss';

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
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
      fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      <div
        className={`fixed ${styles['linear-gradient']} left-1/2 top-1/2 flex h-max -translate-x-[50%] -translate-y-[50%] 
        flex-col
        overflow-hidden
        rounded-2xl`}
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-0 m-7 flex rounded-md text-white hover:bg-gray-1/10"
          onClick={onClose}
        >
          <X size={32} />
        </button>

        <div className="flex max-w-[1000px] px-10 flex-col items-center justify-between py-8 pt-20 md:flex-row md:pb-10 lg:w-screen">
          <div className="flex flex-1 w-full flex-col items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex rounded-xl border-2 border-green-dark bg-green px-3 py-1.5 ">
              <p className="text-2xl font-bold text-white">{translate('featuresBanner.label')}</p>
            </div>
            <p className="w-full max-w-[600px] text-white text-xl font-regular leading-tight ">
              {translate('featuresBanner.upperTitle')}
            </p>
            <p className="w-full max-w-[600px] text-white text-5xl font-bold leading-tight ">
              {translate('featuresBanner.title')}
            </p>
            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary px-5 py-2 text-lg font-medium text-white dark:text-white"
              >
                {translate('featuresBanner.cta')}
              </button>
              <div className="flex flex-row items-center space-x-3 pt-8">
                <CheckCircle size={24} className="text-green" weight="fill" />
                <p className="whitespace-nowrap font-medium text-white lg:text-lg">
                  {translate('featuresBanner.guarantee')}
                </p>
              </div>
              <p className="text-sm font-medium text-gray-50">{translate('featuresBanner.lastCta')}</p>
            </div>
          </div>
          <div className="hidden w-full flex-1 items-center justify-center pt-8 lg:flex">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8">
                {features.map((card, index) => (
                  <div className="flex flex-row space-x-1 font-bold " key={index}>
                    <div className="flex justify-center items-center">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img src={ShieldIcon} alt={'Icon'} width={32} height={32} />
                      </div>
                      <p className="text-xl pl-2 font-semibold text-white">{card}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="bg-green py-4 w-full flex flex-row justify-center items-center text-lg font-medium text-white">
          <p className="font-bold">{translate('featuresBanner.specialOfferLabel')}</p>
          <p className="ml-2">{translate('featuresBanner.specialOfferGift')}</p>
        </div>
      </div>
    </div>
  );
};

export default FeaturesBanner;

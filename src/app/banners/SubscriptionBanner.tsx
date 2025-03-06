import { CheckCircle, X } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import styles from 'app/banners/FeaturesBanner.module.scss';
import bannerImage from 'assets/images/banner/internxt_vpn_antivirus_new_plans.webp';

interface SubscriptionBannerProps {
  showBanner: boolean;
  onClose: () => void;
  isLifetimeUser?: boolean;
}

const SubscriptionBanner = ({ showBanner, onClose, isLifetimeUser }: SubscriptionBannerProps): JSX.Element => {
  const { translate, translateList } = useTranslationContext();
  const features = translateList(isLifetimeUser ? 'lifetimesBanner.features' : 'susbcriptionsBanner.features');

  const handleOnClick = () => {
    window.open('https://internxt.com/pricing', '_blank', 'noopener noreferrer');
    onClose();
  };

  return (
    //Background
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
      fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0 `}
    >
      <div
        className={`${styles['linear-gradient']} bg-primary fixed left-1/2 top-1/2 flex h-max -translate-x-[50%] -translate-y-[50%] rounded-2xl flex-col overflow-hidden pl-10`}
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-0 m-2 flex rounded-md text-gray-80 text-white"
          onClick={onClose}
        >
          <X size={32} />
        </button>
        <div className="flex max-w-[990px] max-h-[457px] flex-col md:flex-row items-center justify-between py-16 md:py-20 lg:w-screen">
          <div className="flex h-max w-full flex-col items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <p className="w-full max-w-[400px] text-5xl font-bold leading-tight text-white">
              {translate(isLifetimeUser ? 'lifetimesBanner.title' : 'susbcriptionsBanner.title')}
            </p>
            <div className="flex flex-col items-start space-y-2 pt-2">
              {features.map((card, index) => (
                <div key={index} className="flex items-center mt-2 space-x-2">
                  <CheckCircle size={24} className="text-green" weight="fill" />
                  <p className="whitespace-nowrap font-medium text-white lg:text-lg">{card}</p>
                </div>
              ))}
            </div>

            <p className="text-lg font-medium text-white max-w-[400px]">
              {translate(isLifetimeUser ? 'lifetimesBanner.description' : 'susbcriptionsBanner.description')}
            </p>
            <div className="flex flex-col items-center space-y-3 lg:items-start">
              <button
                onClick={handleOnClick}
                className="flex w-max items-center rounded-lg bg-primary dark:bg-primary px-5 py-2.5 text-lg font-medium text-white dark:text-white"
              >
                {translate(isLifetimeUser ? 'lifetimesBanner.cta' : 'susbcriptionsBanner.cta')}
              </button>
            </div>
          </div>

          <div
            className="h-[370px] w-[900px]"
            style={{ backgroundImage: `url(${bannerImage})`, backgroundSize: 'cover' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionBanner;

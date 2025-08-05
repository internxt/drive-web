import { X, TShirt } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ShieldIcon from 'assets/images/banner/shield-blue.svg';
import BgImage from 'assets/images/banner/5th_anniversary_theme.avif';

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

  const bgColor = 'linear-gradient(115.95deg, rgba(239, 239, 239, 0.25) 10.92%, rgba(255, 255, 255, 0.08) 96.4%)';

  return (
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
      fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      <div
        className={
          'left-1/2 top-1/2 flex h-[508px] w-[917px] rounded-3xl -translate-x-[50%] -translate-y-[50%] flex-col overflow-hidden absolute inset-0 bg-center bg-no-repeat bg-cover '
        }
        style={{
          backgroundImage: `url(${BgImage})`,
          backgroundPosition: 'top left',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '150%',
        }}
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-0 m-7 flex border-[0.1px] border-white text-white hover:bg-gray-1/10"
          onClick={onClose}
        >
          <X size={32} />
        </button>

        <div className="flex pt-20 px-10 flex-col items-start justify-start md:flex-row md:pb-10">
          <div
            className="flex flex-1 h-[351px] rounded-2xl px-6 flex-col items-start justify-center text-start"
            style={{ backgroundImage: bgColor }}
          >
            <div className="flex flex-row gap-3">
              <div className="flex px-1 bg-gray-90 dark:bg-gray-10 rounded-sm">
                <p className="text-lg font-semibold text-primary">{translate('featuresBanner.label')}</p>
              </div>
              <p className="text-white text-xl px-1 text-regular leading-tight ">{translate('featuresBanner.title')}</p>
            </div>
            <p className="text-white w-[384px] text-4xl pt-2 font-bold leading-tight ">
              {translate('featuresBanner.upperTitle')}
            </p>
            <div className="flex flex-col w-full items-start space-y-3">
              <div className="flex flex-row items-center space-x-3 pt-8">
                <img src={ShieldIcon} alt="Icon" width={24} height={20} />
                <p className="whitespace-nowrap font-medium text-white  lg:text-base">
                  {translate('featuresBanner.guarantee')}
                </p>
              </div>
              <div className="flex flex-row items-center space-x-3 pb-4">
                <TShirt className="text-primary" weight="fill" width={24} height={24} />
                <p className="whitespace-nowrap font-medium text-white  lg:text-base">
                  {translate('featuresBanner.specialOfferGift')}
                </p>
              </div>
              <button
                onClick={handleOnClick}
                className="flex w-full justify-center items-center rounded-lg bg-primary px-5 py-2 text-base font-medium text-white dark:text-white"
              >
                {translate('featuresBanner.cta')}
              </button>
              <p className="text-sm font-medium text-gray-50">{translate('featuresBanner.lastCta')}</p>
            </div>
          </div>

          <div className="flex flex-1 h-[351px] flex-col items-center justify-center space-y-3 text-center lg:items-start lg:justify-between lg:text-start">
            <div className="flex flex-col">
              <div className="flex flex-col space-y-8 pl-8">
                {features.map((card, index) => (
                  <div className="flex flex-row space-x-1 font-bold " key={index}>
                    <div className="flex justify-center items-center">
                      <div className="w-8 h-8 flex items-center justify-center">
                        <img src={ShieldIcon} alt={'Icon'} width={32} height={32} />
                      </div>
                      <p className="text-lg pl-2 pt-0.5 font-semibold text-white ">{card}</p>
                    </div>
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

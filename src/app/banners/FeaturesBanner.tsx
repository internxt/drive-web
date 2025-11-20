import { X, CloudArrowUp, ShieldPlus, Sparkle, CellTower, VideoConference, Envelope } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import ShieldIcon from 'assets/images/banner/shield-blue.svg';
import FeaturesBannerImage from 'assets/images/banner/DarkFeaturesBanner.webp';

interface FeaturesBannerProps {
  showBanner: boolean;
  onClose: () => void;
}

const FeaturesBanner = ({ showBanner, onClose }: FeaturesBannerProps): JSX.Element => {
  const { translate, translateList } = useTranslationContext();

  const products = [
    {
      id: 'drive',
      icon: CloudArrowUp,
      text: translateList('featuresBanner.products.drive'),
    },
    {
      id: 'antivirus',
      icon: ShieldPlus,
      text: translateList('featuresBanner.products.antivirus'),
    },
    {
      id: 'cleaner',
      icon: Sparkle,
      text: translateList('featuresBanner.products.cleaner'),
    },
    {
      id: 'vpn',
      icon: CellTower,
      text: translateList('featuresBanner.products.vpn'),
    },
    {
      id: 'meet',
      icon: VideoConference,
      text: translateList('featuresBanner.products.meet'),
    },
    {
      id: 'mail',
      icon: Envelope,
      text: translateList('featuresBanner.products.mail'),
    },
  ];

  const handleOnClick = () => {
    window.open('https://internxt.com/deals/black-friday-internxt', '_blank', 'noopener noreferrer');
    onClose();
  };
  const parseSubtitle = (text: string) => {
    const parts = text.split('**');
    return parts.map((part, index) => (
      <span key={`${part}-${index}`} className={index % 2 === 1 ? 'text-primary' : 'text-gray-1 dark:text-gray-100'}>
        {part}
      </span>
    ));
  };

  const bgColor = 'linear-gradient(360deg, #082D66 0%, #1C1C1C 100%)';
  const labelBackgroundColor = 'rgba(8, 45, 102, 1)';
  const labelColorText = 'rgba(114, 170, 255, 1)';

  return (
    <div
      className={`${showBanner ? 'flex' : 'hidden'} 
      fixed bottom-0 left-0 right-0 top-0 z-50 h-screen bg-black bg-opacity-50 px-10 lg:px-0`}
    >
      <div
        className={
          'left-1/2 top-1/2 flex h-[457px] w-[990px] rounded-3xl -translate-x-[50%] -translate-y-[50%] flex-row overflow-hidden justify-between absolute inset-0 bg-center bg-no-repeat bg-cover items-center'
        }
        style={{
          background: bgColor,
        }}
      >
        <button
          id="close-banner"
          aria-label="close-banner"
          className="absolute right-5 top-3 flex text-gray-10 hover:text-gray-20"
          onClick={onClose}
        >
          <X size={32} />
        </button>

        <div className="w-[509px] h-[358px] pl-14 justify-center gap-8 items-start flex flex-col">
          <div className="flex flex-col gap-5">
            <div className="flex px-1 gap-3">
              <p
                className="text-lg font-semibold px-1 py-0.5"
                style={{
                  background: labelBackgroundColor,
                  color: labelColorText,
                }}
              >
                {translate('featuresBanner.label.blueText')}
              </p>
              <p className="text-lg font-semibold text-gray-1 dark:text-gray-100 px-1 py-0.5">
                {translate('featuresBanner.label.text')}
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <p className="text-4xl font-semibold max-w-[509px] text-gray-1 dark:text-gray-100">
                {translate('featuresBanner.title')}
              </p>
              <p className="text-lg font-semibold px-1 ">{parseSubtitle(translate('featuresBanner.subTitle'))}</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-row w-min gap-4 items-start h-min">
              <button
                onClick={handleOnClick}
                className="flex w-[177px] h-[48px] justify-center whitespace-nowrap items-center rounded-lg bg-primary px-6 py-4 text-base font-medium text-white dark:text-white"
              >
                {translate('featuresBanner.ctaGet')}
              </button>
              <button
                onClick={onClose}
                className="flex w-[177px] h-[48px] justify-center items-center whitespace-nowrap rounded-lg bg-transparent px-6 py-4 text-base font-medium text-primary border-primary border dark:text-primary-dark"
              >
                {translate('featuresBanner.ctaContinue')}
              </button>
            </div>
            <div className="flex flex-row items-center gap-2">
              <img src={ShieldIcon} alt="Icon" width={24} height={20} />
              <p className="whitespace-nowrap font-medium text-gray-1 dark:text-gray-100 lg:text-base">
                {translate('featuresBanner.guarantee')}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-start justify-start gap-2 lg:flex-nowrap lg:justify-between">
            {products.map((feature) => (
              <div
                key={feature.id}
                className="flex h-6 w-min flex-row items-center justify-center gap-1 rounded bg-white/10 px-1 py-0.5 shadow-sm lg:h-8 lg:px-2 lg:py-1"
              >
                <feature.icon className="h-5 w-5 text-primary lg:h-6 lg:w-6" />
                <p className="whitespace-nowrap text-sm font-medium leading-tight text-gray-1 dark:text-gray-100">
                  {feature.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="h-[358px] w-[342px]">
          <img src={FeaturesBannerImage} alt="Features Banner" className="h-full w-full" />
        </div>
      </div>
    </div>
  );
};

export default FeaturesBanner;

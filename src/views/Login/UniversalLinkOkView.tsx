import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import SuccessCheckIcon from 'assets/icons/universal-link/success-check.svg?react';
import AnimatedBackground from 'components/AnimatedBackground';
import { isMobile } from 'react-device-detect';

export default function UniversalLinkOkView(): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div className="relative flex h-full w-full flex-col dark:bg-[#0A0F1C] overflow-hidden z-0">
      <AnimatedBackground />
      <div className="relative z-0 flex shrink-0 flex-row justify-center py-10 sm:justify-center">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-[360px] bg-white rounded-lg px-8 z-40 py-10 shadow-soft dark:bg-gray-1">
          <div className="mb-6 flex justify-center">
            <InternxtLogo className="h-auto w-52 text-gray-100" />
          </div>
          <SuccessCheckIcon className="mx-auto mt-6 mb-6 h-24 w-24" />
          <h2 className="text-center text-xl font-medium text-gray-100">{translate('auth.universalLink.success')}</h2>
          <div className="separator my-6"></div>
          <div className="flex flex-row justify-center">
            <h4 className="text-base font-medium text-center">{translate('auth.universalLink.closeWindow')}</h4>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-row justify-center py-8">
        {!isMobile && (
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 dark:text-gray-10 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
        )}
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 dark:text-gray-100 no-underline hover:text-gray-100"
        >
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}

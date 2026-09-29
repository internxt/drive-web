import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import { ReactNode } from 'react';
import { isMobile } from 'react-device-detect';

export const AccountSetupLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex w-96 max-w-full flex-col px-8 py-10">{children}</div>
      </div>

      <div className="flex shrink-0 flex-row justify-center py-8">
        {!isMobile && (
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
        )}
        <a
          href="https://help.internxt.com"
          target="_blank"
          className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
        >
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
};

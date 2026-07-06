import { ReactNode } from 'react';
import { isMobile } from 'react-device-detect';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import AnimatedBackground from 'components/AnimatedBackground';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface AuthShellProps {
  readonly children: ReactNode;
}

export default function AuthShell({ children }: AuthShellProps): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden dark:bg-[#0A0F1C]">
      <AnimatedBackground />

      <div className="relative z-20 flex shrink-0 flex-row justify-center py-10 sm:justify-center">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center">{children}</div>

      <div className="relative z-10 flex shrink-0 flex-col items-center justify-center space-x-0 space-y-2 py-8 text-gray-80 dark:text-gray-10 sm:flex-row sm:space-x-8 sm:space-y-0">
        {!isMobile && (
          <a href="https://internxt.com/legal" target="_blank" className="auth-footer-link">
            {translate('general.terms')}
          </a>
        )}
        <a href="https://help.internxt.com" target="_blank" className="auth-footer-link">
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}

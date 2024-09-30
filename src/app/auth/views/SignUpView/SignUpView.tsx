import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import SignUp from '../../components/SignUp/SignUp';
import { useMemo } from 'react';
import authService from '../../services/auth.service';
export interface SignUpViewProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
  displayIframe: boolean;
}

export default function SignUpView(props: SignUpViewProps): JSX.Element {
  const { translate } = useTranslationContext();
  const autoSubmit = useMemo(
    () => authService.extractOneUseCredentialsForAutoSubmit(new URLSearchParams(window.location.search)),
    [],
  );
  const isRegularSignup = !props.displayIframe && !autoSubmit.enabled;

  return (
    <div
      className={`flex h-full w-full flex-col bg-surface dark:bg-gray-1 ${props.displayIframe ? '' : 'overflow-auto'}`}
    >
      {isRegularSignup && (
        <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
          <InternxtLogo className="h-auto w-28 text-gray-100" />
        </div>
      )}

      <div className={`flex h-full flex-col ${!props.displayIframe && 'items-center justify-center'}`}>
        <SignUp {...props} />
      </div>

      {isRegularSignup && (
        <div className="flex shrink-0 flex-col items-center justify-center space-x-0 space-y-3 py-8 sm:flex-row sm:space-x-8 sm:space-y-0">
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
          <a href="https://help.internxt.com" target="_blank" className="text-gray-80 no-underline hover:text-gray-100">
            {translate('general.help')}
          </a>
        </div>
      )}
    </div>
  );
}

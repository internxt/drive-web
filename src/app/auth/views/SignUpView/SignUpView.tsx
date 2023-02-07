import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import bigLogo from 'assets/icons/big-logo.svg';
import SignUp from '../../components/SignUp/SignUp';
export interface SignUpViewProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
  displayIframe: boolean;
}

export default function SignUpView(props: SignUpViewProps): JSX.Element {
  const { translate } = useTranslationContext();
  return (
    <div className={`flex h-full w-full flex-col bg-white ${props.displayIframe ? '' : 'overflow-auto sm:bg-gray-5'}`}>
      {!props.displayIframe && (
        <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
          <img src={bigLogo} width="120" alt="" />
        </div>
      )}

      <div className={`flex h-full flex-col ${!props.displayIframe && 'items-center justify-center'}`}>
        <SignUp {...props} />
      </div>

      {!props.displayIframe && (
        <div className="flex flex-shrink-0 flex-row justify-center py-8">
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
          <a
            href="https://help.internxt.com"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.help')}
          </a>
        </div>
      )}
    </div>
  );
}

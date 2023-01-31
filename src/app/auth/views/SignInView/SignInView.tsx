import bigLogo from 'assets/icons/big-logo.svg';
import { useTranslation } from 'react-i18next';
import LogIn from '../../components/LogIn/LogIn';

interface SignInProps {
  displayIframe: boolean;
}

export default function SignInView(props: SignInProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <div className={`flex h-full w-full flex-col bg-white ${props.displayIframe ? '' : 'overflow-auto sm:bg-gray-5'}`}>
      {!props.displayIframe && (
        <div className="flex flex-shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
          <img src={bigLogo} width="120" alt="" />
        </div>
      )}

      <div className={`flex h-full flex-col ${!props.displayIframe && 'items-center justify-center'}`}>
        <LogIn />
      </div>

      {!props.displayIframe && (
        <div className="flex flex-shrink-0 flex-row justify-center py-8">
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {t('general.terms')}
          </a>
          <a
            href="https://help.internxt.com"
            target="_blank"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {t('general.help')}
          </a>
        </div>
      )}
    </div>
  );
}

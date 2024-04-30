import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import RecoveryLink from '../../components/RecoveryLink/RecoveryLink';

function RecoveryLinkView(): JSX.Element {
  const { translate } = useTranslationContext();
  return (
    <div className="flex h-full w-full flex-col bg-surface dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>

      <div className="flex h-full flex-col items-center justify-center">
        <RecoveryLink />
      </div>

      <div className="flex shrink-0 flex-col items-center justify-center space-x-0 space-y-3 py-8 sm:flex-row sm:space-x-8 sm:space-y-0">
        <a href="https://internxt.com/legal" target="_blank" className="text-gray-80 no-underline hover:text-gray-100">
          {translate('general.terms')}
        </a>
        <a href="https://help.internxt.com" target="_blank" className="text-gray-80 no-underline hover:text-gray-100">
          {translate('general.help')}
        </a>
      </div>
    </div>
  );
}

export default RecoveryLinkView;

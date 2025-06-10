import { LinkBreak } from '@phosphor-icons/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';

function ExpiredLink(): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full w-full flex-col items-center overflow-auto">
        <div className="flex h-full w-full max-w-xs flex-1 shrink-0 flex-col items-center justify-center">
          <div className="flex w-full flex-col items-center rounded-2xl p-5 text-gray-100 transition-all duration-100 ease-out">
            <LinkBreak size={80} weight="thin" className="mt-3" />
            <h4 className="mt-4 text-center text-xl font-medium">{translate('linkExpired.title')}</h4>
            <p className="font-regular mb-3 mt-1 text-center text-base text-gray-60">
              {translate('linkExpired.description')}
            </p>
          </div>
        </div>
        <div className="inline-flex items-end justify-center gap-8 pb-8">
          <a
            target="_blank"
            href="https://internxt.com/legal"
            className="font-regular mr-4 mt-6 text-center text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.terms')}
          </a>
          <a
            target="_blank"
            href="https://help.internxt.com/"
            className="font-regular mr-4 mt-6 text-base text-gray-80 no-underline hover:text-gray-100"
          >
            {translate('general.contactSupport')}
          </a>
        </div>
      </div>
    </div>
  );
}

export default ExpiredLink;

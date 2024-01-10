import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { ReactComponent as InternxtLogo } from 'assets/icons/big-logo.svg';
import navigationService from 'app/core/services/navigation.service';
import { WarningCircle } from '@phosphor-icons/react';

export default function FolderFileNotFound(): JSX.Element {
  const { translate } = useTranslationContext();
  const isFolder = navigationService.history.location.search.includes('folder');

  return (
    <div className="flex h-full w-full flex-col overflow-auto bg-surface dark:bg-gray-1">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex h-full flex-col items-center justify-center">
        <div className="flex max-w-sm flex-col items-center rounded-2xl border border-gray-10 bg-gray-1 p-8 text-center dark:bg-gray-5">
          <WarningCircle className=" mb-5 text-center text-red" size={80} weight="thin" />
          <h3 className="pb-1 text-xl font-medium text-gray-100">
            {isFolder ? translate('itemNotFound.folder.title') : translate('itemNotFound.file.title')}
          </h3>
          <h4 className="font-regular text-base text-gray-60">
            {isFolder ? translate('itemNotFound.folder.description') : translate('itemNotFound.file.description')}
          </h4>
        </div>
      </div>

      <div className="flex shrink-0 flex-row justify-center py-8">
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
    </div>
  );
}

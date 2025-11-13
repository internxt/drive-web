import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import InternxtLogo from 'assets/icons/big-logo.svg?react';
import WarningIcon from 'assets/icons/universal-link/warning.svg?react';

export default function UniversalLinkErrorView(): JSX.Element {
  const { translate } = useTranslationContext();

  return (
    <main className="flex h-full w-full flex-col bg-gray-5 dark:bg-surface">
      <div className="flex shrink-0 flex-row justify-center py-10 sm:justify-start sm:pl-20">
        <InternxtLogo className="h-auto w-28 text-gray-100" />
      </div>
      <div className="flex flex-1 items-center justify-center bg-gray-5 dark:bg-surface">
        <div className="w-96 rounded-lg px-8 py-10 shadow-soft dark:bg-gray-5">
          <div className="mb-6 flex justify-center">
            <InternxtLogo className="h-auto w-52 text-gray-100" />
          </div>
          <WarningIcon className="mx-auto mt-6 mb-6 h-24 w-24" />
          <h2 className="text-center text-xl font-medium text-gray-100">
            {'No se ha podido iniciar sesion, inténtelo de nuevo'}
          </h2>
          <div className="separator my-6"></div>
          <div className="flex flex-row justify-center">
            <h4 className="text-base font-medium text-center">{'Puedes cerrar esta ventana'}</h4>
          </div>
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
    </main>
  );
}

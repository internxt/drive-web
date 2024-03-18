import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';

const InvoicesHeader = (): JSX.Element => {
  const { translate } = useTranslationContext();
  return (
    <div className="-mx-5 -mt-5 flex flex-row justify-between rounded-t-xl border-b border-gray-10 bg-gray-5 p-2 text-base font-medium text-gray-100">
      <div className="grow pl-3">{translate('views.account.tabs.billing.invoices.billingDate')}</div>
      <div className="w-32 truncate border-l border-r border-gray-10 pl-5 pr-1">
        {translate('views.account.tabs.billing.invoices.storage')}
      </div>
      <div className="w-56 pl-5">{translate('views.account.tabs.billing.invoices.ammount')}</div>
    </div>
  );
};

export default InvoicesHeader;

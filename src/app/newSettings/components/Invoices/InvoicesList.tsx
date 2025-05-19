import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import { DownloadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import dateService from '../../../core/services/date.service';
import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import currencyService from 'app/payment/services/currency.service';
import { Loader } from '@internxt/ui';

const InvoicesList = ({ invoices, state }: { invoices: Invoice[]; state: 'loading' | 'empty' | 'ready' }) => {
  const [hoverItemIndex, setHoverItemIndex] = useState<string | null>(null);
  const { translate } = useTranslationContext();
  const isLastInvoice = (i: number) => {
    return invoices && i === invoices.length - 1;
  };

  if (state === 'loading') {
    return (
      <div className="mb-5 flex h-10 items-center justify-center">
        <Loader classNameLoader="h-6 w-6" />
      </div>
    );
  }

  return state === 'empty' ? (
    <Empty />
  ) : (
    <div className="flex">
      <InvoiceDateColumn
        invoices={invoices}
        isLastInvoice={isLastInvoice}
        translate={translate}
        setHoverItemIndex={setHoverItemIndex}
        hoverItemIndex={hoverItemIndex}
      />
      <InvoiceStorageColumn
        invoices={invoices}
        isLastInvoice={isLastInvoice}
        translate={translate}
        setHoverItemIndex={setHoverItemIndex}
        hoverItemIndex={hoverItemIndex}
      />
      <InvoiceAmountColumn
        invoices={invoices}
        isLastInvoice={isLastInvoice}
        translate={translate}
        setHoverItemIndex={setHoverItemIndex}
        hoverItemIndex={hoverItemIndex}
      />
    </div>
  );
};

interface ColumnProps {
  invoices: Invoice[];
  isLastInvoice: (i: number) => boolean;
  translate: (key: string) => string;
  setHoverItemIndex: (index: string | null) => void;
  hoverItemIndex: string | null;
}
const headerTextClass = 'text-base font-medium text-gray-100';

const InvoiceDateColumn = ({ invoices, isLastInvoice, translate, setHoverItemIndex, hoverItemIndex }: ColumnProps) => (
  <div className="-ml-5 -mt-5 flex grow flex-col">
    <h1
      className={`flex h-12 flex-row items-center justify-between rounded-tl-xl border-b border-gray-10 bg-gray-1 px-5 dark:bg-gray-5 ${headerTextClass}`}
    >
      {translate('views.account.tabs.billing.invoices.billingDate')}
    </h1>
    {invoices.map(({ created, id }, i) => (
      <div
        key={id}
        className={`flex h-12 flex-row items-center justify-between border-gray-10 px-5 text-base font-medium text-gray-100 ${
          isLastInvoice(i) ? 'rounded-bl-xl' : ' border-b'
        }
            ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
        onMouseEnter={() => setHoverItemIndex(id)}
        onMouseLeave={() => setHoverItemIndex(null)}
      >
        <p className="overflow-hidden truncate text-ellipsis whitespace-nowrap">{displayDate(created)}</p>
      </div>
    ))}
  </div>
);

const InvoiceStorageColumn = ({
  invoices,
  isLastInvoice,
  translate,
  setHoverItemIndex,
  hoverItemIndex,
}: ColumnProps) => (
  <div className="-mt-5 flex grow flex-col">
    <h1
      className={`flex h-12 items-center justify-between border-b border-l border-r border-gray-10 bg-gray-1 pl-5 pr-1 dark:bg-gray-5 ${headerTextClass}`}
    >
      {translate('views.account.tabs.billing.invoices.storage')}
    </h1>
    {invoices.map(({ bytesInPlan, id }, i) => (
      <div
        key={id}
        className={`flex h-12 items-center justify-between border-gray-10 px-5 text-base font-normal text-gray-60 ${
          isLastInvoice(i) ? '' : ' border-b'
        } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
        onMouseEnter={() => setHoverItemIndex(id)}
        onMouseLeave={() => setHoverItemIndex(null)}
      >
        {bytesToString(bytesInPlan)}
      </div>
    ))}
  </div>
);

const InvoiceAmountColumn = ({
  invoices,
  hoverItemIndex,
  isLastInvoice,
  translate,
  setHoverItemIndex,
}: ColumnProps) => (
  <div className="-mr-5 -mt-5 flex flex-col rounded-tr-xl">
    <h1
      className={`flex h-12 w-40 flex-row items-center justify-between rounded-tr-xl border-b border-gray-10 bg-gray-1 p-2 pl-5 dark:bg-gray-5 lg:w-56 ${headerTextClass}`}
    >
      {translate('views.account.tabs.billing.invoices.plan')}
    </h1>
    {invoices.map(({ pdf, id, total, currency }, i) => (
      <div
        key={id}
        className={`flex h-12 w-40 flex-row items-center justify-between border-gray-10 pl-5 text-base font-normal text-gray-60 lg:w-56 ${
          isLastInvoice(i) ? 'rounded-br-xl' : 'border-b'
        } ${hoverItemIndex === id ? 'bg-gray-1 dark:bg-gray-5' : 'bg-surface'}`}
        onMouseEnter={() => setHoverItemIndex(id)}
        onMouseLeave={() => setHoverItemIndex(null)}
      >
        {`${total / 100} ` + currencyService.getCurrencySymbol(currency.toUpperCase())}
        <a className="px-2 text-gray-100" href={pdf} target="_blank" rel="noopener noreferrer">
          <DownloadSimple className="text-gray-100" colorRendering={'bg-gray-100'} size={20} />
        </a>
      </div>
    ))}
  </div>
);

const displayDate = (unixSeconds: number) => {
  const date = new Date(unixSeconds * 1000);

  return dateService.format(date, 'dddd, DD MMMM YYYY');
};

const Empty = () => {
  const { translate } = useTranslationContext();
  return (
    <div className="flex h-full items-center justify-center text-center">
      <p className="font-regular text-base text-gray-50">{translate('preferences.workspace.billing.empty.text')}</p>
    </div>
  );
};

export default InvoicesList;

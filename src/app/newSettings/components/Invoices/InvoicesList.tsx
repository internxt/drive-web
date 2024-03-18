import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import { DownloadSimple } from '@phosphor-icons/react';
import { useState } from 'react';
import dateService from '../../../core/services/date.service';
import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Spinner from '../../../shared/components/Spinner/Spinner';

const InvoicesList = ({ invoices, state }: { invoices: Invoice[]; state: 'loading' | 'empty' | 'ready' }) => {
  const [hoverItemIndex, setHoverItemIndex] = useState<string | null>(null);
  const { translate } = useTranslationContext();
  const isLastInvoice = (i: number) => {
    return invoices && i === invoices.length - 1;
  };

  if (state === 'loading') {
    return (
      <div className="mb-5 flex h-10 items-center justify-center">
        <Spinner className="h-6 w-6" />
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
      <InvoiceAmmountColumn
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
      className={`flex flex-row justify-between rounded-tl-xl border-b border-gray-10 bg-gray-5 px-5 py-2 ${headerTextClass}`}
    >
      {translate('views.account.tabs.billing.invoices.billingDate')}
    </h1>
    {invoices.map(({ created, id }, i) => (
      <div
        key={id}
        className={`flex flex-row justify-between border-gray-10 px-5 py-2 text-base  font-medium text-gray-100 dark:bg-gray-1 ${
          isLastInvoice(i) ? 'rounded-bl-xl' : ' border-b'
        }
            ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : 'bg-surface'}`}
        onMouseEnter={() => setHoverItemIndex(id)}
        onMouseLeave={() => setHoverItemIndex(null)}
      >
        {displayDate(created)}
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
    <div className="border-b border-gray-10 bg-gray-5 py-2">
      <h1 className={`flex justify-between border-l border-r border-gray-10 bg-gray-5 pl-5 pr-1 ${headerTextClass}`}>
        {translate('views.account.tabs.billing.invoices.storage')}
      </h1>
    </div>
    {invoices.map(({ bytesInPlan, id }, i) => (
      <div
        key={id}
        className={`flex justify-between border-gray-10 px-5 py-2 text-base font-normal text-gray-60 dark:bg-gray-1 ${
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

const InvoiceAmmountColumn = ({
  invoices,
  isLastInvoice,
  translate,
  setHoverItemIndex,
  hoverItemIndex,
}: ColumnProps) => (
  <div className="-mr-5 -mt-5 flex flex-col rounded-tr-xl">
    <h1
      className={`flex w-56 flex-row justify-between rounded-tr-xl border-b border-gray-10 bg-gray-5 p-2 pl-5 ${headerTextClass}`}
    >
      {translate('views.account.tabs.billing.invoices.plan')}
    </h1>
    {invoices.map(({ pdf, id }, i) => (
      <div
        key={id}
        className={`flex w-56 flex-row items-center justify-between border-gray-10 py-2 pl-5 text-base font-normal text-gray-60 ${
          isLastInvoice(i) ? 'rounded-br-xl' : 'border-b'
        } ${hoverItemIndex === id ? 'bg-gray-5 dark:bg-gray-5' : ''}`}
        onMouseEnter={() => setHoverItemIndex(id)}
        onMouseLeave={() => setHoverItemIndex(null)}
      >
        {/* TODO: CHANGE WHEN IMPLEMENT BACKEND API CALLS */}
        36,49€
        <a className="px-2 text-gray-100" href={pdf} target="_blank" rel="noopener noreferrer">
          <DownloadSimple colorRendering={'bg-gray-100'} size={20} />
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
    <div className="text-center">
      <h1 className="font-medium text-gray-60">{translate('views.account.tabs.billing.invoices.empty.title')}</h1>
      <p className="text-sm text-gray-50">{translate('views.account.tabs.billing.invoices.empty.subtitle')}</p>
    </div>
  );
};

export default InvoicesList;

import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import dateService from '../../../core/services/date.service';
import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Spinner from '../../../shared/components/Spinner/Spinner';
import InvoicesItem from './InvoicesItem';

const InvoicesList = ({
  invoices,
  state,
}: {
  invoices: Invoice[];
  state: 'loading' | 'empty' | 'ready';
}): JSX.Element => {
  const isLastInvoice = (i: number) => {
    return invoices && i === invoices.length - 1;
  };

  if (state === 'loading') {
    return (
      <div className="flex h-10 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return state === 'empty' ? (
    <Empty />
  ) : (
    <>
      {invoices.map((invoice, index) => {
        return (
          <InvoicesItem
            key={`${invoice.created}`}
            date={displayDate(invoice.created)}
            storage={bytesToString(invoice.bytesInPlan)}
            pdf={invoice.pdf}
            amount="36,49€" // TODO: ADD WHEN THE BACKEND IS READY
            isLastItem={isLastInvoice(index)}
          />
        );
      })}
    </>
  );
};

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

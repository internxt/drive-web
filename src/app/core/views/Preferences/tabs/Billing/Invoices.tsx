import { useEffect, useState } from 'react';
import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DownloadSimple } from 'phosphor-react';
import { bytesToString } from '../../../../../drive/services/size.service';
import paymentService from '../../../../../payment/services/payment.service';
import Card from '../../../../../shared/components/Card';
import Spinner from '../../../../../shared/components/Spinner/Spinner';
import Section from '../../components/Section';

export default function Invoices({ className = '' }: { className?: string }): JSX.Element {
  const [state, setState] = useState<{ tag: 'ready'; invoices: Invoice[] } | { tag: 'loading' | 'empty' }>({
    tag: 'loading',
  });
  const { translate } = useTranslationContext();

  useEffect(() => {
    paymentService
      .getInvoices()
      .then((invoices) => setState({ tag: 'ready', invoices }))
      .catch(() => setState({ tag: 'empty' }));
  }, []);

  const invoices = state.tag === 'ready' ? state.invoices : [];

  function isLastInvoice(i: number) {
    return invoices && i === invoices.length - 1;
  }

  function displayDate(unixSeconds: number) {
    const date = new Date(unixSeconds * 1000);

    return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
  }

  const body =
    state.tag === 'empty' ? (
      <Empty />
    ) : state.tag === 'ready' ? (
      <div className="flex">
        <div className="flex flex-grow flex-col">
          <h1 className="mb-0.5 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.billing.invoices.billingDate')}
          </h1>
          {invoices.map(({ created, id }, i) => (
            <div
              key={id}
              className={`border-translate border-gray-5 ${isLastInvoice(i) ? 'pt-1' : 'py-1'} text-sm text-gray-80`}
            >
              {displayDate(created)}
            </div>
          ))}
        </div>
        <div className="flex flex-col">
          <h1 className="mb-0.5 text-xs font-medium text-gray-80">
            {translate('views.account.tabs.billing.invoices.plan')}
          </h1>
          {invoices.map(({ bytesInPlan, pdf, id }, i) => (
            <div key={id} className={`border-translate border-gray-5 ${isLastInvoice(i) ? 'pt-1' : 'py-1'}`}>
              <div className="flex justify-between">
                <p className="text-sm text-gray-50">{bytesToString(bytesInPlan)}</p>
                <a
                  className="ml-4 text-primary hover:text-primary-dark"
                  href={pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <DownloadSimple size={18} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div className="flex h-10 items-center justify-center">
        <Spinner className="h-6 w-6" />
      </div>
    );

  return (
    <Section className={className} title={translate('views.account.tabs.billing.invoices.head')}>
      <Card>{body}</Card>
    </Section>
  );
}

function Empty() {
  const { translate } = useTranslationContext();
  return (
    <div className="text-center">
      <h1 className="font-medium text-gray-60">{translate('views.account.tabs.billing.invoices.empty.title')}</h1>
      <p className="text-sm text-gray-50">{translate('views.account.tabs.billing.invoices.empty.subtitle')}</p>
    </div>
  );
}

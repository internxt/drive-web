import { Invoice, UserType } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Section from '../Sections/General/components/Section';
import Card from '../../shared/components/Card';
import InvoicesList from '../components/Invoices/InvoicesList';
import { useEffect, useState } from 'react';
import paymentService from 'app/payment/services/payment.service';

const Invoices = ({ userType, className = '' }: { className?: string; userType: UserType }): JSX.Element => {
  const { translate } = useTranslationContext();
  const [state, setState] = useState<{ tag: 'ready'; invoices: Invoice[] } | { tag: 'loading' | 'empty' }>({
    tag: 'loading',
  });

  useEffect(() => {
    paymentService
      .getInvoices({ userType })
      .then((invoices) => {
        if (invoices.length > 0) {
          setState({ tag: 'ready', invoices });
        } else {
          setState({ tag: 'empty' });
        }
      })
      .catch(() => setState({ tag: 'empty' }));
  }, []);

  const isEmpty = state.tag === 'empty';

  return (
    <Section className={className} title={translate('views.account.tabs.billing.invoices.head')}>
      <Card className={`${isEmpty ? 'h-40' : 'pb-0'}`}>
        <InvoicesList invoices={state.tag === 'ready' ? state.invoices : []} state={state.tag} />
      </Card>
    </Section>
  );
};

export default Invoices;

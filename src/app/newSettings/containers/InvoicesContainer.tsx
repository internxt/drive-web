import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Section from '../Sections/General/components/Section';
import Card from '../../shared/components/Card';
import InvoicesList from '../components/Invoices/InvoicesList';

const Invoices = ({
  className = '',
  invoices,
  state,
}: {
  className?: string;
  invoices: Invoice[];
  state: 'ready' | 'loading' | 'empty';
}): JSX.Element => {
  const { translate } = useTranslationContext();

  const isEmpty = state === 'empty';
  return (
    <Section className={className} title={translate('views.account.tabs.billing.invoices.head')}>
      <Card className={`${isEmpty ? 'h-40' : 'pb-0'}`}>
        <InvoicesList invoices={invoices} state={state} />
      </Card>
    </Section>
  );
};

export default Invoices;

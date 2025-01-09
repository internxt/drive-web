import { Invoice } from '@internxt/sdk/dist/drive/payments/types';
import { useTranslationContext } from '../../i18n/provider/TranslationProvider';
import Section from '../Sections/General/components/Section';
import Card from '../../shared/components/Card';
import InvoicesList from '../components/Invoices/InvoicesList';
import { Spinner } from '@internxt/internxtui';

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
      <Card className={`${isEmpty && 'h-20'}`}>
        {state === 'ready' ? (
          <InvoicesList invoices={invoices} state={state} />
        ) : state === 'loading' ? (
          <div className="flex h-10 items-center justify-center">
            <Spinner className="h-5 w-5" />
          </div>
        ) : state === 'empty' ? (
          <div className="flex h-full items-center justify-center text-center">
            <p className="font-regular text-base text-gray-60">
              {translate('views.account.tabs.billing.invoices.empty')}
            </p>
          </div>
        ) : null}
      </Card>
    </Section>
  );
};

export default Invoices;

import { useSelector } from 'react-redux';
import { t } from 'i18next';

import { RootState } from 'app/store';
import { PlanState } from 'app/store/slices/plan';

import Section from '../../core/views/Preferences/components/Section';
import Invoices from '../containers/InvoicesContainer';
import BillingOverview from '../components/BillingOverview';
import BillingPaymentMethodCard from '../components/BillingPaymentMethodCard';

const BillingAccountSection = () => {
  const plan = useSelector<RootState, PlanState>((state) => state.plan);

  return (
    <Section
      title={t('preferences.workspace.billing.title')}
      className="flex max-h-640 flex-1 flex-col space-y-6 overflow-y-auto p-6"
    >
      <BillingOverview plan={plan} />
      <BillingPaymentMethodCard />
      <Invoices />
    </Section>
  );
};

export default BillingAccountSection;

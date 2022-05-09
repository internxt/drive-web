import Card from '../../../../../shared/components/Card';
import CurrentPlan from '../../../../../shared/components/CurrentPlan';
import Section from '../../components/Section';

export default function CurrentPlanExtended({ className = '' }: { className?: string }): JSX.Element {
  const subscriptionExtension = { daysUntilRenewal: 7, interval: 'monthly', renewDate: '22/04/2022' };

  return (
    <Section className={className} title="Current plan">
      <Card>
        <CurrentPlan
          button="change"
          bytesInPlan={4294967296 * 5}
          planName="Subscription"
          planSubtitle={{ mainLabel: '0.99 €/month' }}
        />
        {subscriptionExtension && (
          <div className="mt-4 flex flex-col items-center border-t border-gray-5">
            <h1 className="mt-4 font-medium text-gray-80">
              Subscription renews in {subscriptionExtension.daysUntilRenewal} days
            </h1>
            <p className="text-xs text-gray-50">
              Billed {subscriptionExtension.interval} {subscriptionExtension.renewDate}
            </p>
            <button className="mt-2 text-xs text-gray-60">Cancel subscription</button>
          </div>
        )}
      </Card>
    </Section>
  );
}

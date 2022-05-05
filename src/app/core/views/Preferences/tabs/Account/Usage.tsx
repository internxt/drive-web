import Card from '../../../../../shared/components/Card';
import CurrentPlan from '../../../../../shared/components/CurrentPlan';
import UsageDetails from '../../../../../shared/components/UsageDetails';
import Section from '../../components/Section';

export default function Usage({ className = '' }: { className?: string }): JSX.Element {
  const products: Parameters<typeof UsageDetails>[0]['products'] = [
    { name: 'Drive', usageInBytes: 450000000, color: 'primary' },
    { name: 'Backups', usageInBytes: 900000000, color: 'indigo' },
    { name: 'Photos', usageInBytes: 550000000, color: 'orange' },
    { name: 'Trash', usageInBytes: 300000000, color: 'gray' },
  ];

  return (
    <Section className={className} title="Usage">
      <Card>
        <CurrentPlan
          button="upgrade"
          bytesInPlan={4294967296}
          planName="Free plan"
          planSubtitle={{ mainLabel: '0.99 €/month', beforeMainLabelCrossed: 'Free' }}
        />
        <UsageDetails className="mt-5" planLimitInBytes={4294967296} products={products} />
      </Card>
    </Section>
  );
}

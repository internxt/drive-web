import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

type CardDetails = {
  last4Digits: string;
  expiration: {
    month: string;
    year: string;
  };
  brand: string;
};

export default function PaymentMethod({ className = '' }: { className?: string }): JSX.Element {
  const card: CardDetails = {
    last4Digits: '4242',
    expiration: {
      month: '06',
      year: '25',
    },
    brand: 'Visa',
  };
  return (
    <Section className={className} title="Payment method">
      <Card>
        <div className="flex">
          <div className="flex h-9 items-center rounded-md bg-gray-5 px-4">{card.brand}</div>
          <div className="ml-4 flex-1">
            <div className="flex items-center text-gray-80">
              <p style={{ lineHeight: 1 }} className="text-2xl font-bold">
                {'···· ···· ····'}
              </p>
              <p className="ml-1.5 text-sm">{card.last4Digits}</p>
            </div>
            <p className="text-xs text-gray-50">{`${card.expiration.month}/${card.expiration.year}`}</p>
          </div>
          <Button variant="secondary" size="medium">
            Edit
          </Button>
        </div>
      </Card>
    </Section>
  );
}

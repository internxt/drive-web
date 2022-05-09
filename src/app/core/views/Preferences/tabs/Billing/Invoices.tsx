import { DownloadSimple } from 'phosphor-react';
import { bytesToString } from '../../../../../drive/services/size.service';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

export default function Invoices({ className = '' }: { className?: string }): JSX.Element {
  const data: { date: string; bytesInPlan: number; downloadLink: string }[] = [
    { date: 'Friday 22, May 2022', bytesInPlan: 214748364800, downloadLink: '' },
    { date: 'Friday 22, May 2022', bytesInPlan: 214748364800, downloadLink: '' },
  ];

  function isLastInvoice(i: number) {
    return i === data.length - 1;
  }

  const showEmpty = false;

  const body = showEmpty ? (
    <Empty />
  ) : (
    <div className="flex">
      <div className="flex flex-grow flex-col">
        <h1 className="mb-0.5 text-xs font-medium text-gray-80">Billing date</h1>
        {data.map(({ date }, i) => (
          <div className={`border-t border-gray-5 ${isLastInvoice(i) ? 'pt-1' : 'py-1'} text-sm text-gray-80`}>
            {date}
          </div>
        ))}
      </div>
      <div className="flex flex-col">
        <h1 className="mb-0.5 text-xs font-medium text-gray-80">Plan</h1>
        {data.map(({ bytesInPlan, downloadLink }, i) => (
          <div className={`border-t border-gray-5 ${isLastInvoice(i) ? 'pt-1' : 'py-1'}`}>
            <div className="flex">
              <p className="text-sm text-gray-50">{bytesToString(bytesInPlan)}</p>
              <a
                className="ml-4 text-primary hover:text-primary-dark"
                href={downloadLink}
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
  );

  return (
    <Section className={className} title="Invoices">
      <Card>{body}</Card>
    </Section>
  );
}

function Empty() {
  return (
    <div className="text-center">
      <h1 className="font-medium text-gray-60">You are on free plan</h1>
      <p className="text-sm text-gray-50">
        Issued invoices will appear here automatically when you have a paid subscription plan.
      </p>
    </div>
  );
}

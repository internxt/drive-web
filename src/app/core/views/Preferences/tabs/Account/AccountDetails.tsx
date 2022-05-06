import { CheckCircle, Warning } from 'phosphor-react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Tooltip from '../../../../../shared/components/Tooltip';
import Section from '../../components/Section';

export default function AccountDetails({ className = '' }: { className?: string }): JSX.Element {
  const isVerified = false;

  function onResend() {
    notificationsService.show({ text: 'Verification email has been sent', type: ToastType.Success });
  }

  return (
    <Section className={className} title="Account details">
      <Card>
        <div className="flex justify-between">
          <div className="flex">
            <Detail label="Name" value="John" />
            <Detail label="Lastname" value="Appleseed" className="ml-8" />
          </div>
          <Button variant="secondary">Edit</Button>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <Detail label="Email" value="john.appleseed@internxt.com" />
            {!isVerified && (
              <button onClick={onResend} className="font-medium text-primary hover:text-primary-dark">
                Resend verification email
              </button>
            )}
          </div>
          <Tooltip
            style="dark"
            title={isVerified ? 'Verified email' : 'Verify your email'}
            popsFrom="top"
            subtitle={isVerified ? undefined : 'Check your inbox or spam'}
          >
            {isVerified ? (
              <CheckCircle weight="fill" className="text-green" size={24} />
            ) : (
              <Warning weight="fill" className="text-yellow" size={24} />
            )}
          </Tooltip>
        </div>
      </Card>
    </Section>
  );
}

function Detail({ className = '', label, value }: { className?: string; label: string; value: string }): JSX.Element {
  return (
    <div className={`${className} text-gray-80`}>
      <h2 className="text-sm ">{label}</h2>
      <h1 className="text-lg font-medium">{value}</h1>
    </div>
  );
}

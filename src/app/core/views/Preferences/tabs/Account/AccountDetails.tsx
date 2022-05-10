import { CheckCircle, Warning } from 'phosphor-react';
import { useState } from 'react';
import notificationsService, { ToastType } from '../../../../../notifications/services/notifications.service';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';
import Tooltip from '../../../../../shared/components/Tooltip';
import Section from '../../components/Section';

export default function AccountDetails({ className = '' }: { className?: string }): JSX.Element {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
            Edit
          </Button>
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
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h1 className="text-2xl font-medium text-gray-80">Account details</h1>
        <Input className="mt-4" label="Name" />
        <Input className="mt-3" label="Lastname" />
        <div className="mt-3 flex justify-end">
          <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button className="ml-2">Save</Button>
        </div>
      </Modal>
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

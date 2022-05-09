import { CheckCircle } from 'phosphor-react';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

export default function TwoFA({ className = '' }: { className?: string }): JSX.Element {
  const isEnabled = false;

  return (
    <Section className={className} title="Two Factor Authentication (2FA)">
      <Card>
        <p className="text-gray-60">
          Two-factor authentication provides an extra layer of security by requiring an extra verification when you log
          in. In adittion to your password, you'll also need a generated code.
        </p>
        <div className="mt-3">
          {isEnabled ? (
            <div className="flex">
              <div className="flex items-center font-medium text-green">
                <CheckCircle size={20} weight="fill" />
                <p className="ml-1">Enabled</p>
                <Button className="ml-4" variant="secondary">
                  Disable
                </Button>
              </div>
            </div>
          ) : (
            <Button>Enable</Button>
          )}
        </div>
      </Card>
    </Section>
  );
}

import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

export default function ChangePassword({ className = '' }: { className?: string }): JSX.Element {
  return (
    <Section className={className} title="Change password">
      <Card>
        <p className="text-gray-60">
          Remember that if you forget the password, you will lose access to all your files. We recommend using a
          password manager.
        </p>
        <Button className="mt-3">Change password</Button>
      </Card>
    </Section>
  );
}

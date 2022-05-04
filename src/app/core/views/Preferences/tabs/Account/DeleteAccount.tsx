import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

export default function DeleteAccount({ className = '' }: { className?: string }): JSX.Element {
  return (
    <Section className={className} title="Delete account">
      <Card>
        <p className="text-gray-80">
          If you delete your account, your data will be gone forever. This action cannot be undone.
        </p>
        <Button className="mt-5" variant="secondary">
          Delete account
        </Button>
      </Card>
    </Section>
  );
}

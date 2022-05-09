import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Section from '../../components/Section';

export default function BackupKey({ className = '' }: { className?: string }): JSX.Element {
  return (
    <Section className={className} title="Backup key">
      <Card>
        <p className="text-gray-60">
          In case you forget your password you can use your backup key to recover your account. Never share this code
          with anyone.
        </p>
        <Button className="mt-3">Export backup key</Button>
      </Card>
    </Section>
  );
}

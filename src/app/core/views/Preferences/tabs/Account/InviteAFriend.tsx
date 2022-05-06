import { useState } from 'react';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Section from '../../components/Section';

export default function InviteAFriend({ className = '' }: { className?: string }): JSX.Element {
  const [email, setEmail] = useState('');

  return (
    <Section className={className} title="Invite a friend">
      <Card>
        <p className="text-gray-80">
          Spread the word, get 1GB per friend invited for free. You can get up to 4GB in total.
        </p>
        <Input
          className="mt-3"
          value={email}
          onChange={setEmail}
          label="Friend email address"
          placeholder="Enter friend email"
        />
        <div className="mt-5 flex">
          <Button variant="secondary">Send invitation</Button>
          <button className="ml-4 font-medium text-primary underline">See all invitations</button>
        </div>
      </Card>
    </Section>
  );
}

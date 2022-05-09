import { Info } from 'phosphor-react';
import { useState } from 'react';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Section from '../../components/Section';

export default function InviteAFriend({ className = '' }: { className?: string }): JSX.Element {
  const [email, setEmail] = useState('');

  const canInviteMore = true;

  return (
    <Section className={className} title="Invite a friend">
      <Card>
        <p className="text-gray-80">
          Spread the word, get 1GB per friend invited for free. You can get up to 4GB in total.
        </p>
        <div className="mt-3">
          {canInviteMore ? (
            <Input value={email} onChange={setEmail} label="Friend email address" placeholder="Enter friend email" />
          ) : (
            <div className="flex h-9 items-center rounded-lg bg-gray-5 px-3 py-2.5 text-gray-80">
              <Info size={18} />
              <p className="ml-1.5 text-sm">You reached the limit of 10 invitations/day</p>
            </div>
          )}
        </div>
        <div className="mt-5 flex">
          {canInviteMore && (
            <Button className="mr-4" variant="secondary">
              Send invitation
            </Button>
          )}
          <button className="font-medium text-primary underline">See all invitations</button>
        </div>
      </Card>
    </Section>
  );
}

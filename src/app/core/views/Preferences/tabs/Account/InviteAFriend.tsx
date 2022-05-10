import { CheckCircle, Info, Question } from 'phosphor-react';
import { useState } from 'react';
import Button from '../../../../../shared/components/Button/Button';
import Card from '../../../../../shared/components/Card';
import Input from '../../../../../shared/components/Input';
import Modal from '../../../../../shared/components/Modal';
import Section from '../../components/Section';

export default function InviteAFriend({ className = '' }: { className?: string }): JSX.Element {
  const [email, setEmail] = useState('');

  const canInviteMore = true;

  const [modalOpen, setModalOpen] = useState(false);

  const invites: { email: string; status: 'pending' | 'accepted' }[] = [
    { email: 'pepe@inxt.com', status: 'pending' },
    { email: 'antonio@inxt.com', status: 'accepted' },
    { email: 'juan@inxt.com', status: 'accepted' },
  ];

  const numberOfAcceptedInvites = invites.reduce((prev, current) => prev + (current.status === 'accepted' ? 1 : 0), 0);
  const numberOfPendingInvites = invites.length - numberOfAcceptedInvites;

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
          <button onClick={() => setModalOpen(true)} className="font-medium text-primary underline">
            See all invitations
          </button>
        </div>
      </Card>
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-medium text-gray-80">Friends invited</h1>
          <div className="flex">
            <div className="flex h-7 items-center rounded-md bg-gray-5 px-2 text-gray-80">
              <Question size={14} />
              <p className="ml-1 text-xs">Pending</p>
              <p className="ml-2 text-sm font-medium">{numberOfPendingInvites}</p>
            </div>
            <div className="ml-2 flex h-7 items-center rounded-md bg-gray-5 px-2 text-gray-80">
              <CheckCircle weight="fill" className="text-green" size={14} />
              <p className="ml-1 text-xs">Accepted</p>
              <p className="ml-2 text-sm font-medium">{numberOfAcceptedInvites}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-between border-b border-gray-5 px-3 pb-1 font-medium text-gray-80">
          <div className="flex items-center">
            <Info size={20} />
            <p className="ml-2">Email</p>
          </div>
          <p>Total: {invites.length}</p>
        </div>
        {invites.map((invite) => (
          <div className="group flex h-9 items-center justify-between rounded-md px-3 hover:bg-gray-5">
            <div className="flex items-center">
              {invite.status === 'accepted' ? (
                <CheckCircle className="text-green" weight="fill" size={20} />
              ) : (
                <Question className="text-gray-40" size={20} />
              )}
              <p className="ml-2 text-lg">{invite.email}</p>
            </div>
            {invite.status === 'pending' && (
              <button className="hidden font-medium text-primary group-hover:block">Resend invitation</button>
            )}
          </div>
        ))}
      </Modal>
    </Section>
  );
}

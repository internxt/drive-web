import { Avatar, Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface AccessRequestItem {
  user: {
    name: string;
    email: string;
    avatar: string;
  };
  message?: string;
  onDecline: () => void;
  onAccept: () => void;
}

const RequestCheap = ({ user, message, onDecline, onAccept }: AccessRequestItem) => {
  const { translate } = useTranslationContext();
  return (
    <div className="flex flex-col gap-3.5 border-b border-gray-10 pb-3.5 last:border-b-0 last:pb-0">
      <div className="flex flex-row justify-between">
        {/* User info */}
        <div className="flex flex-row">
          <Avatar diameter={32} fullName={user.name} src={user.avatar} />
          <div className="flex flex-col">
            <p className="font-medium text-gray-100">{user.name}</p>
            <p className="text-sm text-gray-50">{user.email}</p>
          </div>
        </div>

        <div className="flex flex-row gap-2">
          <Button variant="secondary" onClick={onDecline}>
            {translate('modals.shareModal.requests.actions.deny')}
          </Button>
          {/* TODO: Add a dropdown to select the user role */}
          <Button variant="primary" onClick={onAccept}>
            {translate('modals.shareModal.requests.actions.accept')}
          </Button>
        </div>
      </div>

      <div className="flex bg-gray-5 p-4 rounded-lg">
        <p>{message}</p>
      </div>
    </div>
  );
};

const AccessRequestsList = ({ accessRequestList }: { accessRequestList: AccessRequestItem[] }) => {
  return (
    <div className="flex flex-col w-full">
      {accessRequestList.map((request, index) => (
        <RequestCheap key={index} {...request} />
      ))}
    </div>
  );
};

export default AccessRequestsList;

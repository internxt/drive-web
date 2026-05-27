import { AcceptInvitationToSharedFolderPayload, SharingInvite } from '@internxt/sdk/dist/drive/share/types';
import { Avatar, Button, Dropdown } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { Role } from 'app/store/slices/sharedLinks/types';

interface AccessRequestItem {
  user: {
    name: string;
    email: string;
    avatar: string | null;
  };
  roles: Role[];
  message?: string;
  onAccept: (roleId: string) => Promise<void>;
  onDecline: () => void;
}

const RequestCheap = ({ user, message, roles, onDecline, onAccept }: AccessRequestItem) => {
  const { translate } = useTranslationContext();

  return (
    <div className="flex flex-col gap-3.5 border-b border-gray-10 pb-3.5 last:border-b-0 last:pb-0">
      <div className="flex flex-row justify-between">
        {/* User info */}
        <div className="flex flex-row gap-2 items-center">
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
          <Dropdown
            options={roles.map((role) => ({
              text: translate(`modals.shareModal.invite.${role.name.toLowerCase()}`),
              onClick: () => onAccept(role.id),
            }))}
            classMenuItems=""
            openDirection="left"
          >
            <Button variant="primary">{translate('modals.shareModal.requests.actions.accept')}</Button>
          </Dropdown>
        </div>
      </div>

      {message && (
        <div className="flex bg-gray-5 p-4 rounded-lg">
          <p>{message}</p>
        </div>
      )}
    </div>
  );
};

const AccessRequestsList = ({
  accessRequestList,
  roles,
  onAccept,
  onDecline,
}: {
  accessRequestList: SharingInvite[];
  roles: Role[];
  onAccept: (invitationId: string, payload: Pick<AcceptInvitationToSharedFolderPayload, 'roleId'>) => Promise<void>;
  onDecline: (inviteId) => Promise<void>;
}) => {
  return (
    <div className="flex flex-col w-full">
      {accessRequestList.map((request, index) => (
        <RequestCheap
          key={index}
          roles={roles}
          onAccept={(roleId: string) =>
            onAccept(request.id, {
              roleId: roleId,
            })
          }
          onDecline={() => onDecline(request.id)}
          user={{
            name: request.invited.name,
            email: request.invited.email,
            avatar: request.invited.avatar,
          }}
        />
      ))}
    </div>
  );
};

export default AccessRequestsList;

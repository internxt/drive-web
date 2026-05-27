import { Role } from 'app/store/slices/sharedLinks/types';
import AccessRequestsEmptyState from './empty';
import AccessRequestsList from './list';
import { AcceptInvitationToSharedFolderPayload, SharingInvite } from '@internxt/sdk/dist/drive/share/types';

interface AccessRequestsProps {
  accessRequests: SharingInvite[];
  roles: Role[];
  onAcceptRequest: (
    invitationId: string,
    payload: Pick<AcceptInvitationToSharedFolderPayload, 'roleId'>,
  ) => Promise<void>;
  onDeclineRequest: (invitationId: string) => Promise<void>;
}

const AccessRequests = ({ accessRequests, roles, onAcceptRequest, onDeclineRequest }: AccessRequestsProps) => {
  if (accessRequests.length === 0) {
    return (
      <div className="flex flex-1 flex-col justify-center">
        <AccessRequestsEmptyState />
      </div>
    );
  }

  return (
    <div className="flex min-h-[430px] flex-col items-center w-full">
      <AccessRequestsList
        accessRequestList={accessRequests}
        roles={roles}
        onAccept={onAcceptRequest}
        onDecline={onDeclineRequest}
      />
    </div>
  );
};

export default AccessRequests;

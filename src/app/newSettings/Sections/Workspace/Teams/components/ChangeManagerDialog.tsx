import { TeamMember } from '@internxt/sdk/dist/workspaces/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

import Modal from 'app/shared/components/Modal';
import { Button, Avatar } from '@internxt/ui';
import RoleBadge from 'app/newSettings/Sections/Workspace/Members/components/RoleBadge';

import { ArrowRight } from '@phosphor-icons/react';

interface ChangeManagerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isChangeManagerLoading: boolean;
  changeManager: () => void;
  newTeamManager: TeamMember | null;
  currentTeamManager: TeamMember | null;
}

const ChangeManagerDialog: React.FC<ChangeManagerDialogProps> = ({
  isOpen,
  onClose,
  isChangeManagerLoading,
  changeManager,
  newTeamManager,
  currentTeamManager,
}) => {
  const { translate } = useTranslationContext();

  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-96">
      <h2 className="mb-5 text-2xl font-medium text-gray-100">
        {translate('preferences.workspace.teams.changeManagerDialog.title')}
      </h2>
      <p className="font-regular mb-5 text-base">
        <span className="font-semibold">{`${newTeamManager?.name} ${newTeamManager?.lastname} `} </span>
        {translate('preferences.workspace.teams.changeManagerDialog.description')}
      </p>
      <div className="mb-2 flex w-full items-center justify-between rounded-xl border border-gray-10 bg-surface px-3 py-2.5 text-base font-medium">
        <div className="flex items-center">
          <Avatar
            src={currentTeamManager?.avatar ?? null}
            fullName={`${currentTeamManager?.name} ${currentTeamManager?.lastname}`}
            diameter={36}
          />
          <div className="ml-2.5">
            <span className="">{`${currentTeamManager?.name} ${currentTeamManager?.lastname} `} </span>
            <div className="flex items-center">
              <RoleBadge
                role="manager"
                roleText={translate('preferences.workspace.members.role.manager')}
                size={'small'}
              />
              <ArrowRight className="font-regular mx-1.5 text-sm text-gray-50" />
              <RoleBadge
                role="member"
                roleText={translate('preferences.workspace.members.role.member')}
                size={'small'}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full items-center justify-between rounded-xl border border-gray-10 bg-surface px-3 py-2.5 text-base font-medium">
        <div className="flex items-center">
          <Avatar
            src={newTeamManager?.avatar ?? null}
            fullName={`${newTeamManager?.name} ${newTeamManager?.lastname}`}
            diameter={36}
          />
          <div className="ml-2.5">
            <span>{`${newTeamManager?.name} ${newTeamManager?.lastname} `} </span>
            <div className="flex items-center">
              <RoleBadge
                role="member"
                roleText={translate('preferences.workspace.members.role.member')}
                size={'small'}
              />
              <ArrowRight className="font-regular mx-1.5 text-sm text-gray-50" />
              <RoleBadge
                role="manager"
                roleText={translate('preferences.workspace.members.role.manager')}
                size={'small'}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isChangeManagerLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.changeManagerDialog.cancel')}
        </Button>
        <Button loading={isChangeManagerLoading} variant="primary" onClick={changeManager}>
          {translate('preferences.workspace.teams.changeManagerDialog.change')}
        </Button>
      </div>
    </Modal>
  );
};

export default ChangeManagerDialog;

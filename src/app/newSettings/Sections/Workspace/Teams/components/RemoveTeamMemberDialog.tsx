import { TeamMember } from '@internxt/sdk/dist/workspaces/types';
import Modal from 'app/shared/components/Modal';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface RemoveTeamMemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isRemoveTeamMemberLoading: boolean;
  removeTeamMember: () => void;
  teamMemberToRemove: TeamMember | null;
}

const RemoveTeamMemberDialog: React.FC<RemoveTeamMemberDialogProps> = ({
  isOpen,
  onClose,
  isRemoveTeamMemberLoading,
  removeTeamMember,
  teamMemberToRemove,
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-96">
      <h2 className="mb-5 text-2xl font-medium text-gray-100">
        {translate('preferences.workspace.teams.removeTeamMemberDialog.title')}
      </h2>
      <p className="font-regular text-base">
        <span className="font-semibold">{`${teamMemberToRemove?.name} ${teamMemberToRemove?.lastname} `}</span>
        {translate('preferences.workspace.teams.removeTeamMemberDialog.description')}
      </p>
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isRemoveTeamMemberLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.removeTeamMemberDialog.cancel')}
        </Button>
        <Button loading={isRemoveTeamMemberLoading} variant="primary" onClick={removeTeamMember}>
          {translate('preferences.workspace.teams.removeTeamMemberDialog.delete')}
        </Button>
      </div>
    </Modal>
  );
};

export default RemoveTeamMemberDialog;

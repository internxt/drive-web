import { WorkspaceTeam } from '@internxt/sdk/dist/workspaces/types';
import Modal from 'app/shared/components/Modal';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface DeleteTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  isDeleteTeamLoading: boolean;
  deleteTeam: () => void;
  selectedTeam: WorkspaceTeam | null;
}

const DeleteTeamDialog: React.FC<DeleteTeamDialogProps> = ({
  isOpen,
  onClose,
  isDeleteTeamLoading,
  deleteTeam,
  selectedTeam,
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-96">
      <h2 className="mb-5 text-2xl font-medium text-gray-100">
        {translate('preferences.workspace.teams.deleteTeamDialog.title')}
      </h2>
      <p className="font-regular text-base">
        <span className="font-semibold">{selectedTeam?.team.name} </span>
        {translate('preferences.workspace.teams.deleteTeamDialog.description')}
      </p>
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isDeleteTeamLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.deleteTeamDialog.cancel')}
        </Button>
        <Button loading={isDeleteTeamLoading} variant="destructive" onClick={deleteTeam}>
          {translate('preferences.workspace.teams.deleteTeamDialog.delete')}
        </Button>
      </div>
    </Modal>
  );
};

export default DeleteTeamDialog;

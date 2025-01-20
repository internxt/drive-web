import Modal from 'app/shared/components/Modal';
import Input from 'app/shared/components/Input';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface CreateTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  newTeamName: string;
  setNewTeamName: (name: string) => void;
  isCreateTeamLoading: boolean;
  createTeam: () => void;
}

const CreateTeamDialog: React.FC<CreateTeamDialogProps> = ({
  isOpen,
  onClose,
  newTeamName,
  setNewTeamName,
  isCreateTeamLoading,
  createTeam,
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-96">
      <h2 className="mb-5 text-2xl font-medium text-gray-100">
        {translate('preferences.workspace.teams.createTeamDialog.title')}
      </h2>
      <Input
        label={translate('preferences.workspace.teams.createTeamDialog.title')}
        placeholder={translate('preferences.workspace.teams.createTeamDialog.placeholder')}
        variant="default"
        autoComplete="off"
        onChange={setNewTeamName}
        value={newTeamName}
        name="teamName"
        maxLength={50}
      />
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isCreateTeamLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.createTeamDialog.cancel')}
        </Button>
        <Button
          loading={isCreateTeamLoading}
          variant="primary"
          onClick={createTeam}
          disabled={newTeamName.trim().length === 0}
        >
          {translate('preferences.workspace.teams.createTeamDialog.create')}
        </Button>
      </div>
    </Modal>
  );
};

export default CreateTeamDialog;

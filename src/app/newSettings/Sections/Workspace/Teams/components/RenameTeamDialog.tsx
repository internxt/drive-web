import Modal from 'app/shared/components/Modal';
import Input from 'app/shared/components/Input';
import { Button } from '@internxt/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

interface RenameTeamDialogProps {
  isOpen: boolean;
  onClose: () => void;
  renameTeamName: string;
  setRenameTeamName: (name: string) => void;
  isRenameTeamLoading: boolean;
  renameTeam: () => void;
}

const RenameTeamDialog: React.FC<RenameTeamDialogProps> = ({
  isOpen,
  onClose,
  renameTeamName,
  setRenameTeamName,
  isRenameTeamLoading,
  renameTeam,
}) => {
  const { translate } = useTranslationContext();
  return (
    <Modal isOpen={isOpen} onClose={onClose} width="w-96">
      <h2 className="mb-5 text-2xl font-medium text-gray-100">
        {translate('preferences.workspace.teams.renameTeamDialog.title')}
      </h2>
      <Input
        label={translate('preferences.workspace.teams.renameTeamDialog.title')}
        placeholder={translate('preferences.workspace.teams.renameTeamDialog.placeholder')}
        variant="default"
        autoComplete="off"
        onChange={setRenameTeamName}
        value={renameTeamName}
        name="teamName"
        maxLength={50}
      />
      <div className="mt-5 flex w-full flex-row justify-end space-x-2">
        <Button disabled={isRenameTeamLoading} variant="secondary" onClick={onClose}>
          {translate('preferences.workspace.teams.renameTeamDialog.cancel')}
        </Button>
        <Button
          loading={isRenameTeamLoading}
          variant="primary"
          onClick={renameTeam}
          disabled={renameTeamName.trim().length === 0}
        >
          {translate('preferences.workspace.teams.renameTeamDialog.rename')}
        </Button>
      </div>
    </Modal>
  );
};

export default RenameTeamDialog;

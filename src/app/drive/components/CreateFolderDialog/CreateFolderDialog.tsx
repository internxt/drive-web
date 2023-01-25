import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import i18n from 'app/i18n/services/i18n.service';
import Button from 'app/shared/components/Button/Button';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';

interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId?: number;
  neededFolderId: number;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId, neededFolderId }: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState(i18n.get('modals.newFolderModal.untitled'));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);

  useEffect(() => {
    if (isOpen) {
      setError('');
    }
  }, [isOpen]);

  const onClose = (): void => {
    setIsLoading(false);
    dispatch(uiActions.setIsCreateFolderDialogOpen(false));
  };

  const createFolder = async () => {
    if (folderName && folderName.trim().length > 0) {
      setIsLoading(true);
      await dispatch(
        storageThunks.createFolderThunk({
          folderName,
          parentFolderId: currentFolderId ? currentFolderId : neededFolderId,
        }),
      )
        .unwrap()
        .then(() => {
          setIsLoading(false);
          onClose();
          onFolderCreated && onFolderCreated();
        })
        .catch((e) => {
          const errorMessage = e?.message?.includes('already exists')
            ? i18n.get('error.folderAlreadyExists')
            : i18n.get('error.creatingFolder');
          setError(errorMessage);
          setIsLoading(false);
          return e;
        });
    } else {
      setError(i18n.get('error.folderCannotBeEmpty'));
    }
  };

  const onCreateButtonClicked = (e) => {
    e.preventDefault();
    if (!isLoading) {
      setError('');
      createFolder();
    }
  };

  return (
    <Modal maxWidth="max-w-sm" isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={(e) => onCreateButtonClicked(e)}>
        <p className="text-2xl font-medium text-gray-100">{i18n.get('modals.newFolderModal.title')}</p>

        <Input
          disabled={isLoading}
          className={`${error !== '' ? 'error' : ''}`}
          label={i18n.get('modals.newFolderModal.label')}
          value={folderName}
          placeholder={i18n.get('modals.newFolderModal.placeholder')}
          onChange={(name) => {
            setFolderName(name);
            setError('');
          }}
          accent={error ? 'error' : undefined}
          message={error}
          autofocus
        />

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {i18n.get('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            {i18n.get('actions.create')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  neededFolderId: storageSelectors.currentFolderId(state),
}))(CreateFolderDialog);

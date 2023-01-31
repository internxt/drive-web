import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import Button from 'app/shared/components/Button/Button';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { useTranslation } from 'react-i18next';

interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId?: number;
  neededFolderId: number;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId, neededFolderId }: CreateFolderDialogProps) => {
  const { t } = useTranslation();
  const [folderName, setFolderName] = useState(t('modals.newFolderModal.untitled'));
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
            ? t('error.folderAlreadyExists')
            : t('error.creatingFolder');
          setError(errorMessage);
          setIsLoading(false);
          return e;
        });
    } else {
      setError(t('error.folderCannotBeEmpty') as string);
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
        <p className="text-2xl font-medium text-gray-100">{t('modals.newFolderModal.title')}</p>

        <Input
          disabled={isLoading}
          className={`${error !== '' ? 'error' : ''}`}
          label={t('modals.newFolderModal.label') as string}
          value={folderName as string}
          placeholder={t('modals.newFolderModal.placeholder') as string}
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
            {t('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            {t('actions.create')}
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

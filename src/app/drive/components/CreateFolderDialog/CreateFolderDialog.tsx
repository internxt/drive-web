import { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { uiActions } from 'app/store/slices/ui';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { Button } from '@internxt/ui';
import Input from 'app/shared/components/Input';
import Modal from 'app/shared/components/Modal';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import errorService from '../../../core/services/error.service';
import { storageActions } from 'app/store/slices/storage';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';

interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId: string;
  neededFolderId: string;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId, neededFolderId }: CreateFolderDialogProps) => {
  const { translate } = useTranslationContext();
  const [folderName, setFolderName] = useState(translate('modals.newFolderModal.untitled'));
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);

  useEffect(() => {
    if (isOpen) {
      setHasError(false);
      setTimeout(() => {
        setFolderName(translate('modals.newFolderModal.untitled'));
      }, 0);
    }
  }, [isOpen]);

  const onClose = (): void => {
    if (!isLoading) {
      dispatch(uiActions.setIsCreateFolderDialogOpen(false));
    }
  };

  const createFolder = async () => {
    if (folderName && folderName.trim().length > 0) {
      setIsLoading(true);
      const parentFolderId = currentFolderId ?? neededFolderId;
      await dispatch(
        storageThunks.createFolderThunk({
          folderName,
          parentFolderId,
        }),
      )
        .unwrap()
        .then(() => {
          onFolderCreated && onFolderCreated();
          dispatch(storageActions.setHasMoreDriveFolders({ folderId: parentFolderId, status: true }));
          dispatch(storageActions.setHasMoreDriveFiles({ folderId: parentFolderId, status: true }));
          setTimeout(() => {
            dispatch(fetchSortedFolderContentThunk(currentFolderId));
            setIsLoading(false);
            onClose();
          }, 500);
        })
        .catch((e) => {
          errorService.reportError(e, { extra: { folderName, parentFolderId: currentFolderId } });
          setHasError(true);
          setIsLoading(false);
          return e;
        });
    } else {
      setHasError(true);
    }
  };

  const onCreateButtonClicked = (e) => {
    e.preventDefault();
    if (!isLoading) {
      setHasError(false);
      createFolder();
    }
  };

  return (
    <Modal maxWidth="max-w-sm" isOpen={isOpen} onClose={onClose}>
      <form className="flex flex-col space-y-5" onSubmit={(e) => onCreateButtonClicked(e)}>
        <p className="text-2xl font-medium text-gray-100">{translate('modals.newFolderModal.title')}</p>

        <Input
          disabled={isLoading}
          className={hasError ? 'error' : ''}
          label={translate('modals.newFolderModal.label')}
          value={folderName}
          placeholder={translate('modals.newFolderModal.placeholder')}
          onChange={(name) => {
            setFolderName(name);
            setHasError(false);
          }}
          accent={hasError ? 'error' : undefined}
          autofocus
        />

        <div className="flex flex-row items-center justify-end space-x-2">
          <Button disabled={isLoading} variant="secondary" onClick={onClose}>
            {translate('actions.cancel')}
          </Button>
          <Button type="submit" loading={isLoading} variant="primary">
            {translate('actions.create')}
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

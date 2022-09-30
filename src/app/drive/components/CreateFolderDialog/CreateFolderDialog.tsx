import { useState, KeyboardEventHandler } from 'react';
import { connect } from 'react-redux';

import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';

import { uiActions } from 'app/store/slices/ui';
import BaseButton from 'app/shared/components/forms/BaseButton';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import i18n from 'app/i18n/services/i18n.service';
import Spinner from 'app/shared/components/Spinner/Spinner';
import Modal from 'app/shared/components/Modal';

interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId: number;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId }: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const onClose = (): void => {
    setError('');
    setIsLoading(false);
    dispatch(uiActions.setIsCreateFolderDialogOpen(false));
  };
  const createFolder = async () => {
    if (folderName && folderName.trim().length > 0) {
      setIsLoading(true);
      await dispatch(storageThunks.createFolderThunk({ folderName, parentFolderId: currentFolderId }))
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
  const onCreateButtonClicked = () => {
    if (!isLoading) {
      setError('');
      createFolder();
    }
  };
  const onKeyPressed: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      onCreateButtonClicked();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h1 className="text-2xl font-medium text-gray-80">Create folder</h1>
      <div className="mt-4 px-5">
        <span className="text-sm">Name</span>
        <input
          autoFocus
          type="text"
          placeholder="Enter folder name"
          disabled={isLoading}
          value={folderName}
          onChange={(e) => {
            setFolderName(e.target.value);
            setError('');
          }}
          onKeyPress={onKeyPressed}
          className={`w-full py-2 px-2.5 ${error !== '' ? 'error' : ''}`}
        />
        {error !== '' && <span className={'error text-sm text-red-std'}>&#9888; {error}</span>}
      </div>

      <div className="flex items-center justify-end py-6 px-5">
        <div className="flex w-64">
          <BaseButton className="cancel w-full" onClick={onClose}>
            Cancel
          </BaseButton>
          <BaseButton className="primary w-full border" onClick={onCreateButtonClicked}>
            {isLoading ? (
              <>
                Creating <Spinner className="ml-2 h-4 w-4 text-white" />
              </>
            ) : (
              'Create'
            )}
          </BaseButton>
        </div>
      </div>
    </Modal>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  currentFolderId: storageSelectors.currentFolderId(state),
}))(CreateFolderDialog);

import { useState, KeyboardEventHandler } from 'react';
import { connect } from 'react-redux';

import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { uiActions } from 'app/store/slices/ui';
import BaseButton from 'app/shared/components/forms/BaseButton';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import i18n from 'app/i18n/services/i18n.service';
import Spinner from 'app/shared/components/Spinner/Spinner';
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
    <BaseDialog isOpen={isOpen} title="Create folder" onClose={onClose}>
      <div className="mt-4 px-5">
        <span className={'text-sm'}>Name</span>
        <input
          autoFocus
          type="text"
          placeholder="Enter folder name"
          disabled={isLoading}
          value={folderName}
          onChange={(e) => { setFolderName(e.target.value); setError(''); }}
          onKeyPress={onKeyPressed}
          className={`w-full py-2 px-2.5 ${error !== '' ? 'error' : ''}`}
        />
        {error !== '' && <span className={'text-sm error text-red-std'}>&#9888; {error}</span>}
      </div>

      <div className="flex justify-end items-center py-6 px-5">
        <div className="flex w-64">
          <BaseButton className="w-full cancel" onClick={onClose}>
            Cancel
          </BaseButton>
          <BaseButton className="w-full primary border" onClick={onCreateButtonClicked}>
            {isLoading ?
              <>
                Creating <Spinner className="h-4 w-4 text-white ml-2" />
              </> :
              'Create'
            }

          </BaseButton>
        </div>
      </div>
    </BaseDialog >
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  currentFolderId: storageSelectors.currentFolderId(state),
}))(CreateFolderDialog);

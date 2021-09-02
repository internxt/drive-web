import { useState } from 'react';
import { connect } from 'react-redux';

import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { RootState } from '../../../store';

import BaseDialog from '../BaseDialog/BaseDialog';
import { uiActions } from '../../../store/slices/ui';
import BaseButton from '../../Buttons/BaseButton';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId: number;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId }: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const onClose = (): void => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(false));
  };
  const createFolder = async () => {
    setIsLoading(true);
    await dispatch(storageThunks.createFolderThunk({ folderName, parentId: currentFolderId }))
      .unwrap()
      .then(() => {
        onClose();
        onFolderCreated && onFolderCreated();
      })
      .catch((e) => e)
      .finally(() => setIsLoading(false));
  };
  const onCreateButtonClicked = () => {
    createFolder();
  };

  return (
    <BaseDialog isOpen={isOpen} title="Create folder" onClose={onClose}>
      <div className="w-64 self-center mt-4">
        <input
          autoFocus
          type="text"
          placeholder="Enter folder name"
          value={folderName}
          onChange={(e) => setFolderName(e.target.value)}
          className="w-full py-2 px-2.5"
        />
      </div>

      <div className="flex justify-center items-center bg-l-neutral-20 py-6 mt-6">
        <div className="flex w-64">
          <BaseButton classes="cancel w-full mr-4" onClick={onClose}>
            Cancel
          </BaseButton>
          <BaseButton classes="w-full primary border" disabled={isLoading} onClick={onCreateButtonClicked}>
            Create
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  currentFolderId: storageSelectors.currentFolderId(state),
}))(CreateFolderDialog);

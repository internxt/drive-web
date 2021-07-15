import { useState } from 'react';

import { useAppDispatch } from '../../../store/hooks';
import BaseDialog from '../BaseDialog/BaseDialog';
import { setIsCreateFolderDialogOpen } from '../../../store/slices/uiSlice';

import './CreateFolderDialog.scss';
import folderService, { ICreatedFolder } from '../../../services/folder.service';
import { toast } from 'react-toastify';
import { UserSettings } from '../../../models/interfaces';
import { connect } from 'react-redux';
import { RootState } from '../../../store';

interface CreateFolderDialogProps {
  open: boolean;
  currentFolderId: number | null;
  user: UserSettings;
}

const CreateFolderDialog = ({
  open,
  currentFolderId,
  user
}: CreateFolderDialogProps
) => {
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState('');
  const onCancel = (): void => {
    dispatch(setIsCreateFolderDialogOpen(false));
  };
  const onAccept = (): void => {
    if (inputValue && inputValue !== '') {
      folderService.createFolder(!!user.teams, currentFolderId, inputValue)
        .then((response: ICreatedFolder[]) => {
          // this.getFolderContent(currentFolderId, false, true, isTeam);
          dispatch(setIsCreateFolderDialogOpen(false));
        }).catch((e) => {
          if (e.includes('already exists')) {
            toast.warn('Folder with same name already exists');
          } else {
            toast.warn(`"${e}"`);
          }
        });
    } else {
      toast.warn('Invalid folder name');
    }
  };

  return (
    <BaseDialog title="Create folder" open={open} onClose={onCancel}>
      <input className='w-full h-7 text-xs mt-4 text-blue-60'
        placeholder="Enter folder name"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        type="text" />

      <div className='mt-3'>
        <button onClick={onAccept} className='px-3 h-7 text-white font-light bg-blue-60 rounded-sm'>
          Create
        </button>
        <button onClick={onCancel} className='text-blue-60 font-light ml-4'>
          Cancel
        </button>
      </div>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    user: state.user.user,
    currentFolderId: state.storage.currentFolderId
  }))(CreateFolderDialog);

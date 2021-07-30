import { createRef, useEffect, useState } from 'react';
import { connect, useSelector } from 'react-redux';

import { useAppDispatch } from '../../../store/hooks';
import BaseDialog from '../BaseDialog/BaseDialog';
import { setIsCreateFolderDialogOpen } from '../../../store/slices/ui';
import { storageSelectors, storageThunks } from '../../../store/slices/storage';
import folderService, { ICreatedFolder } from '../../../services/folder.service';
import { toast } from 'react-toastify';
import { UserSettings } from '../../../models/interfaces';
import { RootState } from '../../../store';

import './CreateFolderDialog.scss';
import { selectorIsTeam } from '../../../store/slices/team';

interface CreateFolderDialogProps {
  open: boolean;
  user: UserSettings | undefined;
}

const CreateFolderDialog = ({
  open,
  user
}: CreateFolderDialogProps
) => {
  const currentFolderId: number = useSelector((state: RootState) => storageSelectors.currentFolderId(state));
  const isTeam: boolean = useSelector((state: RootState) => selectorIsTeam(state));

  const [inputRef] = useState(createRef<HTMLInputElement>());
  const dispatch = useAppDispatch();
  const [inputValue, setInputValue] = useState('');
  const onCancel = (): void => {
    dispatch(setIsCreateFolderDialogOpen(false));
  };
  const onAccept = (): void => {
    if (inputValue && inputValue !== '') {
      folderService.createFolder(isTeam, currentFolderId, inputValue)
        .then((response: ICreatedFolder[]) => {
          dispatch(storageThunks.fetchFolderContentThunk());
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

  useEffect(() => {
    open && inputRef.current?.focus();
  }, [open, inputRef]);

  return (
    <BaseDialog title="Create folder" open={open} onClose={onCancel}>
      <div className="px-12">
        <input
          ref={inputRef}
          className='w-full h-7 text-xs text-blue-60'
          placeholder="Enter folder name"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          type="text"
          autoFocus
        />

        <div className='flex justify-center mt-3'>
          <button onClick={onCancel} className='secondary'>
            Cancel
          </button>
          <button onClick={onAccept} className='primary ml-2'>
              Create
          </button>
        </div>
      </div>
    </BaseDialog>
  );
};

export default connect(
  (state: RootState) => ({
    user: state.user.user
  }))(CreateFolderDialog);

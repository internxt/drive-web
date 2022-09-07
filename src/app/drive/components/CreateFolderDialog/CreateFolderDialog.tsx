import { useState, KeyboardEventHandler } from 'react';
import { connect } from 'react-redux';

import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';

import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { uiActions } from 'app/store/slices/ui';
//import BaseButton from 'app/shared/components/forms/BaseButton';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import Button from 'app/auth/components/Button/Button';
import errorService from 'app/core/services/error.service';
import { Warning} from 'phosphor-react';
interface CreateFolderDialogProps {
  onFolderCreated?: () => void;
  currentFolderId?: number;
  neededFolderId: number;
}

const CreateFolderDialog = ({ onFolderCreated, currentFolderId, neededFolderId }: CreateFolderDialogProps) => {
  const [folderName, setFolderName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [newFolderError, setNewFolderError] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const onClose = (): void => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(false));
  };
  const createFolder = async () => {
   
    setIsLoading(true);
    await dispatch(storageThunks.createFolderThunk({ folderName, parentFolderId: currentFolderId? currentFolderId : neededFolderId }))
      .unwrap()
      .then(() => {
        setIsLoading(false);
        onClose();
        onFolderCreated && onFolderCreated();
      })
      .catch((e) => {
        setIsLoading(false);
        const castedError = errorService.castError(e);
        setNewFolderError([castedError.message]);
        setShowErrors(true);
        return e;
      });
  };
  const onCreateButtonClicked = () => {
    createFolder();
  };
  const onKeyPressed: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      onCreateButtonClicked();
    }
  };

  return (
    <BaseDialog isOpen={isOpen} title="New folder" panelClasses='w-96 rounded-2xl pt-5' closable={false} titleClasses='text-left px-5 text-2xl font-medium' onClose={onClose}>
      <span className="text-left block w-full text-base px-5 text-neutral-900 mt-5">
        Name
      </span>
      <div className="flex justify-center text-center items-center bg-white mx-5" style={{width:'344px'}}>

        <input
          autoFocus
          type="text"
          placeholder="Folder name"
          value={folderName}
          onFocus={()=>{setShowErrors(false);}}
          onChange={(e) => setFolderName(e.target.value)}
          onKeyPress={onKeyPressed}
          className={`h-11 py-2 px-2.5 ${showErrors ? 'error' : ''}`}
          style={{width:'344px'}}
        />

        
      </div>
      <div className='ml-5'>
        {newFolderError && showErrors? (
              <div className="flex flex-row items-start">
                <div className="flex h-5 flex-row items-center">
                  <Warning className="mr-1 h-4 text-red-std" />
                </div>
                <span className="font-base w-fill text-sm text-red-60">{newFolderError}</span>
              </div>
      ):('')}
      </div>
      

      <div className="flex justify-right items-right bg-white mb-5 mt-5">
        <div className="flex w-64 ml-auto justify-right items-right">
          <Button text='Cancel' loading={false} style="quaternary text-base font-medium rounded-lg w-24 px-1 ml-auto" onClick={onClose}/>
            
          <Button text='Create' loading={isLoading} style="primary w-24 mr-5 ml-2 rounded-lg" disabled={isLoading} onClick={onCreateButtonClicked}/>
            
        </div>
      </div>
    </BaseDialog>
  );
};

export default connect((state: RootState) => ({
  user: state.user.user,
  neededFolderId: storageSelectors.currentFolderId(state),
}))(CreateFolderDialog);

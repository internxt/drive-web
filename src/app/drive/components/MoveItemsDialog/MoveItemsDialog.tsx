import { useSelector } from 'react-redux';
import {Folder, CaretRight} from 'phosphor-react';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState } from 'react';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToMove } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData, FileViewMode, FolderPath  } from '../../types';
import DriveView from 'app/drive/views/DriveView/DriveView';
import i18n from 'app/i18n/services/i18n.service';

//import MoveItemsPayload from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

import './MoveItemsDialog.scss';
import DriveExplorerList from '../DriveExplorer/DriveExplorerList/DriveExplorerList';
import DriveExplorerGrid from '../DriveExplorer/DriveExplorerGrid/DriveExplorerGrid';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';

interface MoveItemsDialogProps {
  onItemsMoved?: () => void;
  isTrash?:boolean;
  items:DriveItemData[];
}

const MoveItemsDialog = (props: MoveItemsDialogProps): JSX.Element => {
  const itemsToMove: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToMove);
  const [isLoading, setIsLoading] = useState(false);
  const [destinationId, setDestinationId] = useState(null);
  const [shownFolders, setShownFolders] = useState(props.items);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const viewModes = {
      [FileViewMode.List]: DriveExplorerList,
      [FileViewMode.Grid]: DriveExplorerGrid,
    };
  const ViewModeComponent = viewModes[FileViewMode.List];


  const onClose = (): void => {
    dispatch(uiActions.setIsMoveItemsDialogOpen(false));
    dispatch(setItemsToMove([]));
  };

  const onAccept = async (destinationFolderId): Promise<void> => {
    try {
      setIsLoading(true);
      if (itemsToMove.length > 0 && destinationId) {
        await dispatch(storageThunks.moveItemsThunk({
          items: itemsToMove,
          destinationFolderId: destinationFolderId,
        }));
      }

      props.onItemsMoved && props.onItemsMoved();

      setIsLoading(false);
      onClose();
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      setIsLoading(false);

      console.log(castedError.message);
    }
  };


databaseService.get(DatabaseCollection.Levels, props.items[0].folderId).then(
  (items)=>{

    const folders = items?.filter((i)=>{return i.isFolder;}); 

    if(folders){
       setShownFolders(folders);
    }
  }
);

const onShowFolderContentClicked = (folderId: number): void => {
  databaseService.get(DatabaseCollection.Levels,folderId).then(
    (items)=>{

      const folders = items?.filter((i)=>{return i.isFolder;}); 

      if(folders){
        setShownFolders(folders);
      }
    }
  );
};
 
  
  return (

    
    <BaseDialog isOpen={isOpen} title={`${props.isTrash? 'Recover':'Move'} ${itemsToMove.length > 0? (itemsToMove.length)+' items': ('"'+itemsToMove[0].name+'"')}`} onClose={onClose}>
    

      <div className="flex justify-center items-center bg-neutral-20 py-6 mt-6">

        <div className="block justify-center w-64 border border-gray-40 items-center bg-neutral-20 py-6">
          {props.isTrash?shownFolders.map((folder)=>{

            return (
            <div className='flex justify-left w-64 border border-gray-40 items-center bg-neutral-20'>
              <Folder className='h-6 w-6 text-primary'/>
              {folder.name}
              <CaretRight className='h-6 w-6' onClick={()=>onShowFolderContentClicked(folder.folderId)}/>
            </div>);

          }):''}
        </div>
       

        <div className="flex w-64">
          <BaseButton onClick={() => onClose()} className="cancel w-full mr-2">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-11/12 ml-2" disabled={isLoading} onClick={() => onAccept(destinationId)}>
            {isLoading ? (!props.isTrash?'Moving...':'Restoring...') : (!props.isTrash?'Move':'Recover')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
  );
};

export default MoveItemsDialog;

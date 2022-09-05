import { useSelector } from 'react-redux';
import {FolderPlus, CaretRight, HardDrive} from 'phosphor-react';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState, useEffect } from 'react';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
//import storageThunks from 'app/store/slices/storage/storage.thunks';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToMove, storageActions } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData, FolderPath  } from '../../types';
//import DriveView from 'app/drive/views/DriveView/DriveView';
import i18n from 'app/i18n/services/i18n.service';
import restoreItemsFromTrash from '../../../../../src/use_cases/trash/recover-items-from-trash';
import folderImage from 'assets/icons/light/folder.svg';
//import MoveItemsPayload from 'app/store/slices/storage/storage.thunks/moveItemsThunk';

import './MoveItemsDialog.scss';
//import DriveExplorerList from '../DriveExplorer/DriveExplorerList/DriveExplorerList';
////import DriveExplorerGrid from '../DriveExplorer/DriveExplorerGrid/DriveExplorerGrid';
import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import CreateFolderDialog from '../CreateFolderDialog/CreateFolderDialog';
import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import storageSelectors from 'app/store/slices/storage/storage.selectors';

interface MoveItemsDialogProps {
  onItemsMoved?: () => void;
  isTrash?:boolean;
  items:DriveItemData[];
}

const MoveItemsDialog = (props: MoveItemsDialogProps): JSX.Element => {
  const itemsToMove: DriveItemData[] = useSelector((state: RootState) => state.storage.itemsToMove);
  const [isLoading, setIsLoading] = useState(false);
  const [destinationId, setDestinationId] = useState(0);
  const [currentFolderId, setCurrentFolderId] = useState(0);
  const [shownFolders, setShownFolders] = useState(props.items);
  const [rootFolderId, setRootFolderId] = useState(0);
  const arrayOfPaths : FolderPath[] = [];
  const [currentNamePaths, setCurrentNamePaths] = useState(arrayOfPaths);
  const dispatch = useAppDispatch();
  const isOpen = props.items?useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen):false;
  const newFolderIsOpen = props.items?useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen):false;
  //const viewModes = {
   //   [FileViewMode.List]: DriveExplorerList,
   //   [FileViewMode.Grid]: DriveExplorerGrid,
    //};
  //const ViewModeComponent = viewModes[FileViewMode.List];

  const resetPath = ()=>{async (payload: void, { getState, dispatch }) => {
   
    const rootFolderId: number = storageSelectors.rootFolderId(getState());

    dispatch(storageActions.resetNamePath());

    setRootFolderId(rootFolderId);

    /*setCurrentNamePaths([{
          id: rootFolderId,
          name: 'Drive',
    }]); */

    };
  };

  const pushPath = (namePath)=>{async (payload: void, { getState, dispatch }) => {
    
    
      console.log('NamePath:');
      console.log(storageSelectors.currentFolderId(getState()));

      dispatch(storageActions.pushNamePath(namePath));
      

    };
  };

  const popPath = (namePath)=>{async (payload: void, { getState, dispatch }) => {
    
    
      console.log('NamePath:');
      console.log(storageSelectors.currentFolderId(getState()));

      dispatch(storageActions.popNamePathUpTo(namePath));
  

    };
  };

  const onClose = (): void => {
    dispatch(uiActions.setIsMoveItemsDialogOpen(false));
    dispatch(setItemsToMove([]));
    resetPath();
  };

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onAccept = async (destinationFolderId): Promise<void> => {
    try {

      console.log(itemsToMove);
      console.log(destinationFolderId);
      setIsLoading(true);
      if (itemsToMove.length > 0) {
        /*await dispatch(storageThunks.moveItemsThunk({
          items: itemsToMove,
          destinationFolderId: destinationFolderId,
        }));*/

        if(!destinationFolderId){
          destinationFolderId = currentFolderId;
        }

        restoreItemsFromTrash(itemsToMove, destinationFolderId);
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


  const breadcrumbItems = (currentFolderPaths): BreadcrumbItemData[] =>{
    
    const items: BreadcrumbItemData[] = [];

    if (currentFolderPaths.length > 0) {
     
      
      currentFolderPaths.forEach((path: FolderPath, i: number, namePath: FolderPath[]) => {
        
        /*if(items.includes({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => onShowFolderContentClicked(path.id, path.name),
        })){*/
          //items.pop();
       // }else{
          items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => onShowFolderContentClicked(path.id, path.name),
          });
       // }
      });
    }

    return items;
  };



useEffect(()=>{
  setCurrentNamePaths([]);
  console.log(currentNamePaths);
  resetPath();
  onShowFolderContentClicked(props.items[0].isFolder? props.items[0].parentId : props.items[0].folderId, 'Drive');
},[]);

const onShowFolderContentClicked = (folderId: number, name: string): void => {
  databaseService.get(DatabaseCollection.Levels, folderId).then(
    (items)=>{

      setCurrentFolderId(folderId);
      const folders = items?.filter((i)=>{return i.isFolder;}); 

      let auxCurrentPaths : FolderPath[] = currentNamePaths;
      if(auxCurrentPaths.find((path)=>{ return path.id === folderId;})){
        auxCurrentPaths= auxCurrentPaths.slice(0, auxCurrentPaths.indexOf({id:folderId, name: name}));
        popPath({id:folderId, name: name});
      }else{
        auxCurrentPaths.push({id:folderId, name: name});
        pushPath({id:folderId, name: name});
      }
     

      setCurrentNamePaths(auxCurrentPaths);

      console.log(currentNamePaths);

      console.log(folders);
      if(folders){
        setShownFolders(folders);
      }else{
        setShownFolders([]);
        setDestinationId(0);
        setCurrentFolderId(folderId);
      }
    }
  );
};

const onFolderClicked = (folderId: number): void => {

  if(destinationId != folderId){
    setDestinationId(folderId);
  }else{
    setDestinationId(currentFolderId);
  }
  

};
 
  
  return (

  
    <BaseDialog isOpen={isOpen} closable={false} titleClasses='flex px-5 text-left font-medium' panelClasses='text-neutral-900 flex flex-col absolute top-1/2 left-1/2 \
        transform -translate-y-1/2 -translate-x-1/2 w-max max-w-lg text-left justify-left pt-8 rounded-lg overflow-hidden bg-white' title={`${props.isTrash? 'Restore':'Move'} ${itemsToMove.length > 1? (itemsToMove.length)+' items': ('"'+itemsToMove[0].name+'"')}`} onClose={onClose}>
        <div style={{width:'512px'}}>{newFolderIsOpen && <CreateFolderDialog currentFolderId={currentFolderId}/>}</div>

      <div className="block text-left justify-left items-center w-fill bg-white py-6">
        <div className='ml-5'><Breadcrumbs  items={breadcrumbItems(currentNamePaths)} /></div>
        <div className="block w-fill h-60 border border-gray-10 rounded-md mx-5 items-center overflow-scroll hide-scroll bg-white">
          {props.isTrash?shownFolders.map((folder)=>{

            return (
            <div className={`${destinationId === folder.id? 'bg-gray-20' : ''} border border-t-0 border-l-0 border-r-0 border-white`}>
              <div className={`${destinationId === folder.id? 'bg-gray-20 border-none' : ''} flex justify-left align-middle w-fill h-12 border border-t-0 border-r-0 border-l-0 border-gray-10 items-center mx-4 bg-white cursor-pointer`} key={folder.id}>
                <div className='flex cursor-pointer w-96' onClick={()=>onFolderClicked(folder.id)}>
                <img className="h-8 w-8" alt="" src={folderImage} />
                  <span className='inline-block ml-4 text-base text-regular align-baseline mt-1'>
                    {folder.name}
                  </span>
                </div>
                <div onClick={()=>onShowFolderContentClicked(folder.id, folder.name)} className='ml-auto cursor-pointer hover:bg-gray-10'>
                  <CaretRight className='h-6 w-6' />
                </div>
              </div>
            </div>);

          }):''}
        </div>
       

        <div className="flex ml-auto mt-5">
          <BaseButton className="tertiary square w-28 h-8 ml-5 mt-1 mr-auto" onClick={onCreateFolderButtonClicked}>
            <div className='flex text-primary text-base text-medium cursor-pointer'><FolderPlus className="h-5 w-5 text-primary mr-2" />  <span className='text-primary text-base font-medium cursor-pointer'>{'New folder'}</span></div>
          </BaseButton>
          <BaseButton onClick={() => onClose()} className="quaternary text-base font-medium h-10 rounded-lg w-20 px-1">
            {i18n.get('actions.cancel')}
          </BaseButton>
          <BaseButton className="primary w-32 ml-2 mr-5" disabled={isLoading} onClick={() => onAccept(destinationId? destinationId : currentFolderId)}>
            {isLoading ? (!props.isTrash?'Moving...':'Restoring...') : (!props.isTrash?'Move':'Restore here')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
    
  );
};

export default MoveItemsDialog;

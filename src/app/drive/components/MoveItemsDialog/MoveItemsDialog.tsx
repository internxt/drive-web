import { useSelector } from 'react-redux';
import {FolderPlus, CaretRight} from 'phosphor-react';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import { useState, useEffect } from 'react';
import BaseButton from 'app/shared/components/forms/BaseButton';
import errorService from 'app/core/services/error.service';
import { uiActions } from 'app/store/slices/ui';
import { setItemsToMove, storageActions } from 'app/store/slices/storage';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { RootState } from 'app/store';
import { DriveItemData, FolderPath  } from '../../types';
import i18n from 'app/i18n/services/i18n.service';
import restoreItemsFromTrash from '../../../../../src/use_cases/trash/recover-items-from-trash';
import folderImage from 'assets/icons/light/folder.svg';

import './MoveItemsDialog.scss';

import databaseService, { DatabaseCollection } from 'app/database/services/database.service';
import CreateFolderDialog from '../CreateFolderDialog/CreateFolderDialog';
import Breadcrumbs, { BreadcrumbItemData } from 'app/shared/components/Breadcrumbs/Breadcrumbs';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchFolderContentThunk';


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
  const [currentFolderName, setCurrentFolderName] = useState('');
  const arrayOfPaths : FolderPath[] = [];
  const [currentNamePaths, setCurrentNamePaths] = useState(arrayOfPaths);
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isMoveItemsDialogOpen);
  const newFolderIsOpen = useAppSelector((state: RootState) => state.ui.isCreateFolderDialogOpen);
  const rootFolderID: number = useSelector((state: RootState) => storageSelectors.rootFolderId(state));
  const [isFirstTime, setIsFirstTime] = useState(true);
  //const databaseTest = useSelector(async (state: RootState) =>{return await databaseService.get(DatabaseCollection.Levels, currentFolderId);});

//console.log('databaseTest: ',databaseTest);

  const onClose = (): void => {
    dispatch(uiActions.setIsMoveItemsDialogOpen(false));
    dispatch(setItemsToMove([]));
  };

  const onCreateFolderButtonClicked = () => {
    
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onAccept = async (destinationFolderId, name): Promise<void> => {
    try {


      setIsLoading(true);
      if (itemsToMove.length > 0) {


        if(!destinationFolderId){
          destinationFolderId = currentFolderId;
        }

        restoreItemsFromTrash(itemsToMove, destinationFolderId, name);
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
        
  
          items.push({
          id: path.id,
          label: path.name,
          icon: null,
          active: i < namePath.length - 1,
          onClick: () => onShowFolderContentClicked(path.id, path.name),
          });
      
      });
      
    }

    return items;
  };



useEffect(()=>{
  setCurrentNamePaths([]);
 
  onShowFolderContentClicked(rootFolderID, 'Drive');
  setIsFirstTime(false);
},[]);

useEffect(()=>{
  if(!isFirstTime){
    onShowFolderContentClicked(currentFolderId, currentFolderName);
  }

}, [newFolderIsOpen]);

const onShowFolderContentClicked = (folderId: number, name: string): void => {

  dispatch(fetchFolderContentThunk(folderId)).unwrap().then(()=>{

    setIsLoading(true);

    databaseService.get(DatabaseCollection.Levels, folderId).then(
      (items)=>{
        
        setCurrentFolderId(folderId);
        setCurrentFolderName(name);
        setDestinationId(folderId);
        console.log(items);
        const folders = items?.filter((i)=>{return i.isFolder;}); 
      
        let auxCurrentPaths : FolderPath[] = [...currentNamePaths];
        const currentIndex = auxCurrentPaths.findIndex((i)=>{return i.id === folderId;});
        if(currentIndex > -1){
          auxCurrentPaths = auxCurrentPaths.slice(0, currentIndex+1);
          dispatch(storageActions.popNamePathUpTo({id:folderId, name: name}));
        }else{
          auxCurrentPaths.push({id:folderId, name: name});
          dispatch(storageActions.pushNamePath({id:folderId, name: name}));
        }
    
        setCurrentNamePaths(auxCurrentPaths);
        if(folders){
          setShownFolders(folders);
        }else{
          setShownFolders([]);
          setDestinationId(folderId);
          setCurrentFolderId(folderId);
          setCurrentFolderName(name);
        }

        setIsLoading(false);
      }
    );
  });
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
        <div style={{width:'512px'}}>{newFolderIsOpen && <CreateFolderDialog/>}</div>

      <div className="block text-left justify-left items-center w-fill bg-white py-6">
        <div className='ml-5'>{isLoading? 
       
          <svg
            role="status"
            className={ 'button-loading-spinner mb-2'}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M8 0C9.3688 1.63227e-08 10.7147 0.351209 11.909 1.02003C13.1032 1.68886 14.1059 2.65292 14.8211 3.82001C15.5363 4.9871 15.9401 6.31818 15.9938 7.68592C16.0476 9.05366 15.7495 10.4123 15.1281 11.6319C14.5066 12.8515 13.5827 13.8913 12.4446 14.6518C11.3064 15.4122 9.99225 15.8679 8.62767 15.9753C7.2631 16.0827 5.89379 15.8382 4.65072 15.2651C3.40766 14.6921 2.33242 13.8097 1.52787 12.7023L3.1459 11.5267C3.74932 12.3572 4.55575 13.0191 5.48804 13.4489C6.42034 13.8787 7.44732 14.062 8.47076 13.9815C9.49419 13.901 10.4798 13.5592 11.3334 12.9888C12.187 12.4185 12.88 11.6386 13.346 10.7239C13.8121 9.80924 14.0357 8.79025 13.9954 7.76444C13.9551 6.73863 13.6522 5.74033 13.1158 4.86501C12.5794 3.98969 11.8274 3.26664 10.9317 2.76502C10.036 2.26341 9.0266 2 8 2V0Z"
              fill="black"
            />
          </svg>
        :
        <Breadcrumbs  items={breadcrumbItems(currentNamePaths)} />}
        </div>
        <div className="block w-fill h-60 border border-gray-10 rounded-md mx-5 items-center overflow-scroll hide-scroll bg-white">
          {isLoading?
          <div className='flex ml-auto mr-auto mt-24 justify-center items-center text-center'>
            <svg
            role="status"
            className={'button-loading-spinner'}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            >
              <path
              d="M8 0C9.3688 1.63227e-08 10.7147 0.351209 11.909 1.02003C13.1032 1.68886 14.1059 2.65292 14.8211 3.82001C15.5363 4.9871 15.9401 6.31818 15.9938 7.68592C16.0476 9.05366 15.7495 10.4123 15.1281 11.6319C14.5066 12.8515 13.5827 13.8913 12.4446 14.6518C11.3064 15.4122 9.99225 15.8679 8.62767 15.9753C7.2631 16.0827 5.89379 15.8382 4.65072 15.2651C3.40766 14.6921 2.33242 13.8097 1.52787 12.7023L3.1459 11.5267C3.74932 12.3572 4.55575 13.0191 5.48804 13.4489C6.42034 13.8787 7.44732 14.062 8.47076 13.9815C9.49419 13.901 10.4798 13.5592 11.3334 12.9888C12.187 12.4185 12.88 11.6386 13.346 10.7239C13.8121 9.80924 14.0357 8.79025 13.9954 7.76444C13.9551 6.73863 13.6522 5.74033 13.1158 4.86501C12.5794 3.98969 11.8274 3.26664 10.9317 2.76502C10.036 2.26341 9.0266 2 8 2V0Z"
              fill="black"
              />
            </svg>
          </div>
          :
          props.isTrash?shownFolders.map((folder)=>{

            return (
            <div className={`${destinationId === folder.id? 'bg-blue-20 text-primary' : ''} border border-t-0 border-l-0 border-r-0 border-white`} key={folder.id.toString()}>
              <div className={`${destinationId === folder.id? 'bg-blue-20 border-none text-primary' : ''} flex justify-left align-middle w-fill h-12 border border-t-0 border-r-0 border-l-0 border-gray-10 items-center mx-4 bg-white cursor-pointer`} key={folder.id}>
                <div className='flex cursor-pointer w-96' onDoubleClick={()=>onShowFolderContentClicked(folder.id, folder.name)} onClick={()=>onFolderClicked(folder.id)}>
                <img className="h-8 w-8" alt="" src={folderImage} />
                  <span className='inline-block ml-4 text-base text-regular align-baseline mt-1 overflow-hidden overflow-ellipsis' style={{maxWidth:'280px'}}>
                    {folder.name}
                  </span>
                </div>
                <div className='ml-auto cursor-pointer'>
                  <CaretRight onClick={()=>onShowFolderContentClicked(folder.id, folder.name)} className={`h-6 w-6 {${destinationId === folder.id? 'bg-blue-20 text-primary' : ''}`} />
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
          <BaseButton className="primary w-32 ml-2 mr-5" disabled={isLoading} onClick={() => onAccept(destinationId? destinationId : currentFolderId, currentFolderName)}>
            {isLoading ? (!props.isTrash?'Moving...':'Navigating...') : (!props.isTrash?'Move':'Restore here')}
          </BaseButton>
        </div>
      </div>
    </BaseDialog>
    
  );
};

export default MoveItemsDialog;

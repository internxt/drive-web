import { createRef, ReactNode, forwardRef, useState, RefObject, useEffect } from 'react';
import { connect } from 'react-redux';
/*import UilTable from '@iconscout/react-unicons/icons/uil-table';
import UilListUiAlt from '@iconscout/react-unicons/icons/uil-list-ui-alt';
import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilCloudUpload from '@iconscout/react-unicons/icons/uil-cloud-upload';
import UilFolderPlus from '@iconscout/react-unicons/icons/uil-folder-plus';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';*/
import {
  Trash,
  DownloadSimple,
  UploadSimple,
  FolderSimplePlus,
  Rows,
  SquaresFour,
  FileArrowUp,
  Plus,
  CaretDown,
  Link,
  PencilSimple,
} from 'phosphor-react';
import { NativeTypes } from 'react-dnd-html5-backend';
import { ConnectDropTarget, DropTarget, DropTargetCollector, DropTargetSpec } from 'react-dnd';

import DriveExplorerList from './DriveExplorerList/DriveExplorerList';
import DriveExplorerGrid from './DriveExplorerGrid/DriveExplorerGrid';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import Empty from '../../../shared/components/Empty/Empty';
import { transformDraggedItems } from 'app/core/services/drag-and-drop.service';
import { StorageFilters } from 'app/store/slices/storage/storage.model';
import { AppDispatch, RootState } from 'app/store';
import { Workspace } from 'app/core/types';

import './DriveExplorer.scss';
import storageThunks from '../../../store/slices/storage/storage.thunks';
import deviceService from '../../../core/services/device.service';
import { storageActions } from '../../../store/slices/storage';
import { uiActions } from '../../../store/slices/ui';
import CreateFolderDialog from '../../../drive/components/CreateFolderDialog/CreateFolderDialog';
import DeleteItemsDialog from '../../../drive/components/DeleteItemsDialog/DeleteItemsDialog';
import BaseButton from '../../../shared/components/forms/BaseButton';
import storageSelectors from '../../../store/slices/storage/storage.selectors';
import { planSelectors } from '../../../store/slices/plan';
import { DriveItemData, FileViewMode, FolderPath } from '../../types';
import i18n from '../../../i18n/services/i18n.service';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import iconService from '../../services/icon.service';
import { IRoot } from 'app/store/slices/storage/storage.thunks/uploadFolderThunk';
import {
  transformInputFilesToJSON,
  transformJsonFilesToItems,
} from 'app/drive/services/folder.service/uploadFolderInput.service';
import Dropdown from 'app/shared/components/Dropdown';
import { useAppDispatch } from 'app/store/hooks';
import useDriveItemStoreProps from './DriveExplorerItem/hooks/useDriveStoreProps';

//import shareService from 'app/share/services/share.service';

interface DriveExplorerProps {
  title: JSX.Element | string;
  titleClassName?: string;
  isLoading: boolean;
  items: DriveItemData[];
  onItemsDeleted?: () => void;
  onFileUploaded?: () => void;
  onFolderUploaded?: () => void;
  onFolderCreated?: () => void;
  onDragAndDropEnd?: () => void;
  user: UserSettings | undefined;
  currentFolderId: number;
  selectedItems: DriveItemData[];
  storageFilters: StorageFilters;
  isAuthenticated: boolean;
  isCreateFolderDialogOpen: boolean;
  isDeleteItemsDialogOpen: boolean;
  viewMode: FileViewMode;
  namePath: FolderPath[];
  dispatch: AppDispatch;
  workspace: Workspace;
  planLimit: number;
  planUsage: number;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

const DriveExplorer = (props: DriveExplorerProps): JSX.Element => {
  const dispatch = useAppDispatch();

  const [fileInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());
  const [folderInputRef] = useState<RefObject<HTMLInputElement>>(createRef());
  const [folderInputKey, setFolderInputKey] = useState<number>(Date.now());

  const {
    selectedItems,
    isLoading,
    viewMode,
    title,
    titleClassName,
    items,
    isDeleteItemsDialogOpen,
    isCreateFolderDialogOpen,
    onItemsDeleted,
    onFolderCreated,
    isOver,
    connectDropTarget,
    storageFilters,
    currentFolderId,
    onFileUploaded
  } = props;

  useEffect(() => {
    deviceService.redirectForMobile();
  }, []);

  const hasAnyItemSelected = (): boolean => {
    return selectedItems.length > 0;
  };

  const hasItems = (): boolean => {
    return items.length > 0;
  };

  const hasFilters = (): boolean => {
    return storageFilters.text.length > 0;
  };

  const onUploadFileButtonClicked = (): void => {
    fileInputRef.current?.click();
  };

  const onUploadFolderButtonClicked = (): void => {
    folderInputRef.current?.click();
  };

  const onDownloadButtonClicked = (): void => {
    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  };

  const onUploadFileInputChanged = (e) => {
    dispatch(
      storageThunks.uploadItemsThunk({
        files: Array.from(e.target.files),
        parentFolderId: currentFolderId,
      }),
    ).then(() => onFileUploaded && onFileUploaded());
    setFileInputKey(Date.now());
  };

  const onUploadFolderInputChanged = async (e) => {
    const files = e?.target?.files as File[];

    const filesJson = transformInputFilesToJSON(files);
    const { rootList, rootFiles } = transformJsonFilesToItems(filesJson, currentFolderId);

    await uploadItems(props, rootList, rootFiles);
    setFolderInputKey(Date.now());
  };

  const onViewModeButtonClicked = (): void => {
    const setViewMode: FileViewMode = viewMode === FileViewMode.List ? FileViewMode.Grid : FileViewMode.List;

    dispatch(storageActions.setViewMode(setViewMode));
  };

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onBulkDeleteButtonClicked = () => {
    dispatch(storageActions.setItemsToDelete(selectedItems));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  const onSelectedOneItemShare = (e) => {
    e.stopPropagation();
    if (selectedItems.length === 1) {
      dispatch(storageActions.setItemToShare(selectedItems[0]));
      dispatch(uiActions.setIsShareItemDialogOpen(true));
    }
  };

  const { dirtyName } = useDriveItemStoreProps();

  const onSelectedOneItemRename = (e) => {
    e.stopPropagation();
    if (selectedItems.length === 1) {
      if (!dirtyName || dirtyName === null || dirtyName.trim() === '') {
        dispatch(uiActions.setCurrentEditingNameDirty(selectedItems[0].name));
      } else {
        dispatch(uiActions.setCurrentEditingNameDirty(dirtyName));
      }
      dispatch(uiActions.setCurrentEditingNameDriveItem(selectedItems[0]));
    }
  };

  const viewModesIcons = {
    [FileViewMode.List]: <SquaresFour className="h-6 w-6" />,
    [FileViewMode.Grid]: <Rows className="h-6 w-6" />,
  };
  const viewModes = {
    [FileViewMode.List]: DriveExplorerList,
    [FileViewMode.Grid]: DriveExplorerGrid,
  };
  const ViewModeComponent = viewModes[viewMode];

  const isRecents = title === 'Recents';

  const FileIcon = iconService.getItemIcon(false);
  const filesEmptyImage = (
    <div className="relative h-32 w-32">
      <FileIcon className="absolute -top-2.5 left-7 rotate-10 transform drop-shadow-soft filter" />
      <FileIcon className="absolute top-0.5 -left-7 rotate-10- transform drop-shadow-soft filter" />
    </div>
  );

  const separatorV = <div className="mx-3 my-2 border-r border-gray-10" />;
  const separatorH = <div className="my-0.5 mx-3 border-t border-gray-10" />;
  const MenuItem = forwardRef(({ children, onClick }: { children: ReactNode; onClick: () => void }, ref) => {
    return (
      <div
        className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5 active:bg-gray-10"
        onClick={onClick}
      >
        {children}
      </div>
    );
  });

  const driveExplorer = <div className="flex h-full flex-grow flex-col px-8" data-test="drag-and-drop-area">
    {isDeleteItemsDialogOpen && <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />}
    {isCreateFolderDialogOpen && <CreateFolderDialog onFolderCreated={onFolderCreated} />}

    <div className="flex h-full w-full max-w-full flex-grow">
      <div className="flex w-1 flex-grow flex-col pt-6">
        <div className="z-10 flex justify-between pb-4">
          <div className={`flex items-center text-lg w-full ${titleClassName || ''}`}>{title}</div>

          <div className="flex">
            <Dropdown
              classButton={
                'primary base-button flex items-center justify-center rounded-lg py-1.5 mr-1 text-base transition-all duration-75 ease-in-out'
              }
              openDirection={'right'}
              classMenuItems={'right-0 w-max rounded-md border border-black border-opacity-8 bg-white py-1.5 drop-shadow mt-11'}
              menuItems={[
                <MenuItem onClick={onCreateFolderButtonClicked}>
                  <FolderSimplePlus size={20} />
                  <p className="ml-3">{i18n.get('actions.upload.folder')}</p>
                </MenuItem>,
                separatorH,
                <MenuItem onClick={onUploadFileButtonClicked}>
                  <FileArrowUp size={20} />
                  <p className="ml-3">{i18n.get('actions.upload.uploadFiles')}</p>
                </MenuItem>,
                <MenuItem onClick={onUploadFolderButtonClicked}>
                  <UploadSimple size={20} />
                  <p className="ml-3">{i18n.get('actions.upload.uploadFolder')}</p>
                </MenuItem>
              ]}
            >
              <>
                <div className="flex flex-row items-center space-x-2.5">
                  <span className="font-medium">{i18n.get('actions.upload.new')}</span>
                  <Plus weight="bold" className="h-4 w-4" />
                </div>
                <CaretDown weight="fill" className="h-3 w-3" />
              </>
            </Dropdown>
            {hasAnyItemSelected() && (
              <>
                {separatorV}
                <BaseButton className="tertiary square w-8" onClick={onDownloadButtonClicked}>
                  <DownloadSimple className="h-6 w-6" />
                </BaseButton>
                {selectedItems.length === 1 && <>
                  <BaseButton className="tertiary square w-8" onClick={onSelectedOneItemShare}>
                    <Link className="h-6 w-6" />
                  </BaseButton>
                  <BaseButton className="tertiary square w-8" onClick={onSelectedOneItemRename}>
                    <PencilSimple className="h-6 w-6" />
                  </BaseButton>
                </>}
                <BaseButton className="tertiary square w-8" onClick={onBulkDeleteButtonClicked}>
                  <Trash className="h-6 w-6" />
                </BaseButton>
              </>
            )}
            {separatorV}
            <BaseButton className="tertiary square w-8" onClick={onViewModeButtonClicked}>
              {viewModesIcons[viewMode]}
            </BaseButton>
          </div>
        </div>

        <div className="mb-5 flex h-full flex-grow flex-col justify-between overflow-y-hidden">
          {hasItems() && (
            <div className="flex flex-grow flex-col justify-between overflow-hidden">
              <ViewModeComponent items={items} isLoading={isLoading} />
            </div>
          )}

          {/* PAGINATION */}
          {/* !isLoading ? (
            <div className="pointer-events-none bg-white p-4 h-12 flex justify-center items-center rounded-b-4px">
              <span className="text-sm w-1/3" />
              <divconst droppedType = monitor.getItemType();
              const droppedDataParentId = item.parentId || item.folderId || -1;

              return droppedType === NativeTypes.FILE || droppedDataParentId !== props.item.id; className="flex justify-center w-1/3">
                <button onClick={this.onPreviousPageButtonClicked} className="pagination-button">
                  <UilAngleDoubleLeft />
                </button>
                <button className="pagination-button">1</button>
                <button onClick={this.onNextPageButtonClicked} className="pagination-button">
                  <UilAngleDoubleRight />
                </button>
              </div>
              <div className="w-1/3"></div>
            </div>
          ) : null */}

          {
            /* EMPTY FOLDER */
            !hasItems() && !isLoading ? (
              hasFilters() ? (
                <Empty
                  icon={filesEmptyImage}
                  title="There are no results for this search"
                  subtitle="Drag and drop here or click on upload button"
                  action={{
                    icon: UploadSimple,
                    style: 'elevated',
                    text: 'Upload files',
                    onClick: onUploadFileButtonClicked,
                  }}
                />
              ) : isRecents ? (
                <Empty
                  icon={filesEmptyImage}
                  title="No recents files to show"
                  subtitle="Recent uploads or files you recently interacted with will show up here automatically"
                />
              ) : (
                <Empty
                  icon={<img className="w-36" alt="" src={folderEmptyImage} />}
                  title="This folder is empty"
                  subtitle="Drag and drop files or click to select files and upload"
                  action={{
                    icon: UploadSimple,
                    style: 'elevated',
                    text: 'Upload files',
                    onClick: onUploadFileButtonClicked,
                  }}
                />
              )
            ) : null
          }

          {
            /* DRAG AND DROP */
            isOver ? (
              <div
                className="drag-over-effect pointer-events-none\
             absolute flex h-full w-full items-end justify-center"
              ></div>
            ) : null
          }
        </div>

        <input
          key={`file-${fileInputKey}`}
          className="hidden"
          ref={fileInputRef}
          type="file"
          onChange={onUploadFileInputChanged}
          multiple={true}
        />
        <input
          key={`folder-${folderInputKey}`}
          className="hidden"
          ref={folderInputRef}
          type="file"
          directory=""
          webkitdirectory=""
          onChange={onUploadFolderInputChanged}
          multiple={true}
        />
      </div>
    </div>
  </div>;

  return connectDropTarget(driveExplorer) || driveExplorer;
};

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

const uploadItems = async (props: DriveExplorerProps, rootList: IRoot[], files: File[]) => {
  const { dispatch, currentFolderId, onDragAndDropEnd } = props;
  if (files.length) {
    // files where dragged directly
    await dispatch(
      storageThunks.uploadItemsThunk({
        files,
        parentFolderId: currentFolderId,
        options: {
          onSuccess: onDragAndDropEnd,
        },
      }),
    );
  }

  if (rootList.length) {
    for (const root of rootList) {
      await dispatch(
        storageThunks.uploadFolderThunk({
          root,
          currentFolderId,
          options: {
            onSuccess: onDragAndDropEnd,
          },
        }),
      );
    }
  }
};

const dropTargetSpec: DropTargetSpec<DriveExplorerProps> = {
  drop: (props, monitor) => {
    const droppedData: { files: File[]; items: DataTransferItemList } = monitor.getItem();
    const isAlreadyDropped = monitor.didDrop();
    const namePathDestinationArray = props.namePath.map((level) => level.name);

    if (isAlreadyDropped) {
      return;
    }

    namePathDestinationArray[0] = '';

    const folderPath = namePathDestinationArray.join('/');

    transformDraggedItems(droppedData.items, folderPath).then(async ({ rootList, files }) => {
      await uploadItems(props, rootList, files);
    });
  },
};

const dropTargetCollect: DropTargetCollector<
  { isOver: boolean; connectDropTarget: ConnectDropTarget },
  DriveExplorerProps
> = (connect, monitor) => {
  const isOver = monitor.isOver({ shallow: true });

  return {
    isOver,
    connectDropTarget: connect.dropTarget(),
  };
};

export default connect((state: RootState) => {
  const currentFolderId: number = storageSelectors.currentFolderId(state);

  /*shareService.getAllShareLinks(0,state.shared.pagination.perPage,undefined).then((response)=>{
   
    const sharedItems: DriveItemData[] = items.filter((item)=>{
      response.items.some((i) => {
        
        return item.id.toString() === (i.item as DriveItemData).id.toString() && (item.isFolder === i.isFolder || (item.isFolder === undefined && i.isFolder === false));
      });
    });
  });*/

  return {
    isAuthenticated: state.user.isAuthenticated,
    user: state.user.user,
    currentFolderId,
    selectedItems: state.storage.selectedItems,
    storageFilters: state.storage.filters,
    isCreateFolderDialogOpen: state.ui.isCreateFolderDialogOpen,
    isDeleteItemsDialogOpen: state.ui.isDeleteItemsDialogOpen,
    viewMode: state.storage.viewMode,
    namePath: state.storage.namePath,
    workspace: state.session.workspace,
    planLimit: planSelectors.planLimitToShow(state),
    planUsage: state.plan.planUsage,
  };
})(DropTarget([NativeTypes.FILE], dropTargetSpec, dropTargetCollect)(DriveExplorer));

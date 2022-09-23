import { createRef, ReactNode, Component } from 'react';
import { connect } from 'react-redux';
/*import UilTable from '@iconscout/react-unicons/icons/uil-table';
import UilListUiAlt from '@iconscout/react-unicons/icons/uil-list-ui-alt';
import UilCloudDownload from '@iconscout/react-unicons/icons/uil-cloud-download';
import UilCloudUpload from '@iconscout/react-unicons/icons/uil-cloud-upload';
import UilFolderPlus from '@iconscout/react-unicons/icons/uil-folder-plus';
import UilTrashAlt from '@iconscout/react-unicons/icons/uil-trash-alt';*/
import { Trash, DownloadSimple, UploadSimple, FolderSimplePlus, Rows, SquaresFour, FileArrowUp, Plus, CaretDown } from 'phosphor-react';
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
import { transformInputFilesToJSON, transformJsonFilesToItems } from 'app/drive/services/folder.service/uploadFolderInput.service';
import Popover from 'app/shared/components/Popover';

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

interface DriveExplorerState {
  fileInputRef: React.RefObject<HTMLInputElement>;
  fileInputKey: number; //! Changing this forces the invisible file input to render
  folderInputKey: number;
  folderInputRef: React.RefObject<HTMLInputElement>;
  email: string;
  token: string;
  isAdmin: boolean;
  isMember: boolean;
}

class DriveExplorer extends Component<DriveExplorerProps, DriveExplorerState> {
  constructor(props: DriveExplorerProps) {
    super(props);

    this.state = {
      fileInputRef: createRef(),
      fileInputKey: Date.now(),
      folderInputKey: Date.now(),
      folderInputRef: createRef(),
      email: '',
      token: '',
      isAdmin: true,
      isMember: false,
    };
  }

  get hasAnyItemSelected(): boolean {
    return this.props.selectedItems.length > 0;
  }

  get hasItems(): boolean {
    return this.props.items.length > 0;
  }

  get hasFilters(): boolean {
    return this.props.storageFilters.text.length > 0;
  }

  componentDidMount() {
    deviceService.redirectForMobile();
  }

  onUploadFileButtonClicked = (): void => {
    this.state.fileInputRef.current?.click();
  };

  onUploadFolderButtonClicked = (): void => {
    this.state.folderInputRef.current?.click();
  };

  onDownloadButtonClicked = (): void => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageThunks.downloadItemsThunk(selectedItems));
  };

  onUploadFileInputChanged = async (e) => {
    const { dispatch, onFileUploaded, currentFolderId } = this.props;

    dispatch(
      storageThunks.uploadItemsThunk({
        files: Array.from(e.target.files),
        parentFolderId: currentFolderId,
      }),
    ).then(() => onFileUploaded && onFileUploaded());

    this.setState({ fileInputKey: Date.now() });
  };

  onUploadFolderInputChanged = async (e) => {
    const files = e?.target?.files as File[];
    const { currentFolderId } = this.props;

    const filesJson = transformInputFilesToJSON(files);
    const { rootList, rootFiles } = transformJsonFilesToItems(filesJson, currentFolderId);

    await uploadItems(this.props, rootList, rootFiles);

    this.setState({ folderInputKey: Date.now() });
  };

  onViewModeButtonClicked = (): void => {
    const viewMode: FileViewMode = this.props.viewMode === FileViewMode.List ? FileViewMode.Grid : FileViewMode.List;

    this.props.dispatch(storageActions.setViewMode(viewMode));
  };

  onCreateFolderButtonClicked = () => {
    this.props.dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  onBulkDeleteButtonClicked = () => {
    const { dispatch, selectedItems } = this.props;

    dispatch(storageActions.setItemsToDelete(selectedItems));
    dispatch(uiActions.setIsDeleteItemsDialogOpen(true));
  };

  onPreviousPageButtonClicked = (): void => undefined;

  onNextPageButtonClicked = (): void => undefined;

  render(): ReactNode {
    const {
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
    } = this.props;
    const { fileInputRef, fileInputKey, folderInputKey, folderInputRef } = this.state;
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

    const separator = <div className="my-0.5 mx-3 border-t border-gray-10" />;
    const PopoverItem = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => {
      return (
        <div
          className="flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-1 active:bg-gray-5"
          onClick={onClick}
        >
          {children}
        </div>
      );
    };

    return connectDropTarget(
      <div className="flex h-full flex-grow flex-col px-8" data-test="drag-and-drop-area">
        {isDeleteItemsDialogOpen && <DeleteItemsDialog onItemsDeleted={onItemsDeleted} />}
        {isCreateFolderDialogOpen && <CreateFolderDialog onFolderCreated={onFolderCreated} />}

        <div className="flex h-full w-full max-w-full flex-grow">
          <div className="flex w-1 flex-grow flex-col pt-6">
            <div className="flex justify-between pb-4">
              <div className={`flex items-center text-lg ${titleClassName || ''}`}>{title}</div>

              <div className="flex">
                {this.hasAnyItemSelected ? (
                  <BaseButton className="primary mr-1.5 flex items-center" onClick={this.onDownloadButtonClicked}>
                    <DownloadSimple className="mr-2.5 h-5 w-5" />
                    <span>{i18n.get('actions.download')}</span>
                  </BaseButton>
                ) : (
                  <Popover
                    className={'z-40 mr-5'}
                    button={
                      <BaseButton className="primary flex items-center">
                        <span>{i18n.get('actions.upload.new')}</span>
                        <Plus className="ml-2.5 h-3 w-3" />
                        <CaretDown className="h-3 w-3" />
                      </BaseButton>
                    }
                    panel={
                      <div className="w-52">
                        <PopoverItem onClick={this.onCreateFolderButtonClicked} >
                          <FolderSimplePlus size={20} />
                          <p className="ml-3">{i18n.get('actions.upload.folder')}</p>
                        </PopoverItem>
                        {separator}
                        <PopoverItem onClick={this.onUploadFileButtonClicked} >
                          <FileArrowUp size={20} />
                          <p className="ml-3">{i18n.get('actions.upload.uploadFiles')}</p>
                        </PopoverItem>
                        <PopoverItem onClick={this.onUploadFolderButtonClicked} >
                          <UploadSimple size={20} />
                          <p className="ml-3">{i18n.get('actions.upload.uploadFolder')}</p>
                        </PopoverItem>
                      </div>
                    } />
                )}
                {this.hasAnyItemSelected ? (
                  <BaseButton className="tertiary square w-8" onClick={this.onBulkDeleteButtonClicked}>
                    <Trash className="h-6 w-6" />
                  </BaseButton>
                ) : null}
                <BaseButton className="tertiary square ml-1.5 w-8" onClick={this.onViewModeButtonClicked}>
                  {viewModesIcons[viewMode]}
                </BaseButton>
              </div>
            </div>

            <div className="mb-5 flex h-full flex-grow flex-col justify-between overflow-y-hidden">
              {this.hasItems && (
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
                !this.hasItems && !isLoading ? (
                  this.hasFilters ? (
                    <Empty
                      icon={filesEmptyImage}
                      title="There are no results for this search"
                      subtitle="Drag and drop here or click on upload button"
                      action={{
                        icon: UploadSimple,
                        style: 'elevated',
                        text: 'Upload files',
                        onClick: this.onUploadFileButtonClicked,
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
                        onClick: this.onUploadFileButtonClicked,
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
              onChange={this.onUploadFileInputChanged}
              multiple={true}
            />
            <input
              key={`folder-${folderInputKey}`}
              className="hidden"
              ref={folderInputRef}
              type="file"
              directory=""
              webkitdirectory=""
              onChange={this.onUploadFolderInputChanged}
              multiple={true}
            />
          </div>
        </div>
      </div>,
    );
  }
}

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
    console.log('droppedData', droppedData);
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

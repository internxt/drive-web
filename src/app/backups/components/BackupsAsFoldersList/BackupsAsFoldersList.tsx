import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import { SdkFactory } from '../../../core/factory/sdk';
import Empty from '../../../shared/components/Empty/Empty';
import { DriveFolderData as DriveWebFolderData, DriveItemData } from '../../../drive/types';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { uiActions } from '../../../store/slices/ui';
import BackupsAsFoldersListItem from './BackupsAsFoldersListItem';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import { deleteFile } from '../../../drive/services/file.service';
import List from '../../../shared/components/List';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';

export default function BackupsAsFoldersList({
  className = '',
  folderId,
  onFolderPush,
}: {
  className?: string;
  folderId: number;
  onFolderPush: (folder: DriveFolderData) => void;
}): JSX.Element {
  const dispatch = useDispatch();

  const [isLoading, setIsloading] = useState(true);
  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);
  const [selectedItems, setSelectedItems] = useState<DriveItemData[]>([]);

  const Skeleton = Array(10)
    .fill(0)
    .map((n, i) => <DriveListItemSkeleton key={i} />);

  async function refreshFolderContent() {
    setIsloading(true);
    const storageClient = SdkFactory.getInstance().createStorageClient();
    const [responsePromise] = storageClient.getFolderContent(folderId);
    const response = await responsePromise;
    const folders = response.children.map((folder) => ({ ...folder, isFolder: true }));
    const items = _.concat(folders as DriveItemData[], response.files as DriveItemData[]);
    setCurrentItems(items);
    setIsloading(false);
  }

  useEffect(() => {
    refreshFolderContent();
  }, [folderId]);

  const onDownloadSelectedItems = () => {
    dispatch(downloadItemsThunk(selectedItems));
  };

  async function onDeleteSelectedItems() {
    for (const item of selectedItems) {
      if (item.isFolder) {
        await deleteBackupDeviceAsFolder(item as DriveWebFolderData);
      } else {
        await deleteFile(item);
      }
      setCurrentItems((items) => items.filter((i) => !(i.id === item.id && i.isFolder === item.isFolder)));
    }
    dispatch(deleteItemsThunk(selectedItems));
  }

  const onDoubleClick = (item: DriveItemData) => {
    if (item.isFolder) onFolderPush(item as DriveFolderData);
    else {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    }
  };

  const onItemSelected = (changes: { device: DriveItemData; isSelected: boolean }[]) => {
    let updatedSelectedItems = selectedItems;
    for (const change of changes) {
      updatedSelectedItems = updatedSelectedItems.filter((item) => item.id !== change.device.id);
      if (change.isSelected) {
        updatedSelectedItems = [...updatedSelectedItems, change.device];
      }
    }
    setSelectedItems(updatedSelectedItems);
  };

  return (
    <div className={`${className} flex min-h-0 flex-grow flex-col`}>
      <div className="flex h-full w-full flex-col overflow-y-auto">
        <List<DriveItemData, 'name' | 'updatedAt' | 'size'>
          header={[
            {
              label: 'Name',
              width: 'flex flex-grow cursor-pointer items-center pl-6',
              name: 'name',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: 'Modified',
              width: 'hidden w-3/12 lg:flex pl-4',
              name: 'updatedAt',
              orderable: true,
              defaultDirection: 'ASC',
            },
            {
              label: 'Size',
              width: 'flex w-2/12 cursor-pointer items-center',
              name: 'size',
              orderable: true,
              defaultDirection: 'ASC',
            },
          ]}
          items={currentItems}
          isLoading={isLoading}
          itemComposition={[
            (item) => (
              <BackupsAsFoldersListItem
                key={`${item.isFolder ? 'folder' : 'file'}-${item.id}`}
                item={item}
                onDoubleClick={onDoubleClick}
              />
            ),
          ]}
          skinSkeleton={Skeleton}
          emptyState={
            <Empty
              icon={<img className="w-36" alt="" src={folderEmptyImage} />}
              title="This folder is empty"
              subtitle="Use Internxt Desktop to upload your data"
            />
          }
          onNextPage={() => {
            //TODO: REVISAR ESTO!
          }}
          hasMoreItems={false} //TODO: REVISAR ESTO!
          menu={contextMenuSelectedBackupItems({
            onDownloadSelectedItems,
            onDeleteSelectedItems,
          })}
          selectedItems={selectedItems}
          keyboardShortcuts={['unselectAll', 'selectAll', 'multiselect']}
          onSelectedItemsChanged={(changes) => {
            const selectedDevicesParsed = changes.map((change) => ({
              device: change.props,
              isSelected: change.value,
            }));
            onItemSelected(selectedDevicesParsed);
          }}
          disableItemCompositionStyles={true}
        />
      </div>
    </div>
  );
}

import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SdkFactory } from '../../../core/factory/sdk';
import dateService from '../../../core/services/date.service';
import { contextMenuSelectedBackupItems } from '../../../drive/components/DriveExplorer/DriveExplorerList/DriveItemContextMenu';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import { deleteFile } from '../../../drive/services/file.service';
import { deleteBackupDeviceAsFolder } from '../../../drive/services/folder.service';
import iconService from '../../../drive/services/icon.service';
import sizeService from '../../../drive/services/size.service';
import { DriveItemData, DriveFolderData as DriveWebFolderData } from '../../../drive/types';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import Empty from '../../../shared/components/Empty/Empty';
import List from '../../../shared/components/List';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { uiActions } from '../../../store/slices/ui';
import { backupsActions } from 'app/store/slices/backups';

export default function BackupsAsFoldersList({
  className = '',
  folderId,
  onFolderPush,
}: {
  className?: string;
  folderId: string;
  onFolderPush: (folder: DriveFolderData) => void;
}): JSX.Element {
  const dispatch = useDispatch();
  const { translate } = useTranslationContext();

  const [isLoading, setIsloading] = useState(true);
  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);
  const [selectedItems, setSelectedItems] = useState<DriveItemData[]>([]);

  const Skeleton = Array(10)
    .fill(0)
    .map((n, i) => <DriveListItemSkeleton key={i} />);

  async function refreshFolderContent() {
    setIsloading(true);
    setSelectedItems([]);
    const storageClient = SdkFactory.getNewApiInstance().createNewStorageClient();
    const input = {
      folderUuid: folderId,
    };
    const [responsePromise] = storageClient.getFolderContentByUuid(input);
    const response = await responsePromise;
    const files = response.files.map((file) => ({ ...file, isFolder: false, name: file.plainName }));
    const folders = response.children.map((folder) => ({ ...folder, isFolder: true, name: folder.plainName }));
    const items = _.concat(folders as DriveItemData[], files as DriveItemData[]);
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

  const onClick = (item: DriveItemData) => {
    if (item.isFolder) {
      if (!isLoading) {
        setIsloading(true);
        onFolderPush(item as DriveFolderData);
        dispatch(backupsActions.setCurrentFolder(item));
      }
    } else {
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
    <div className={`${className} flex min-h-0 grow flex-col`}>
      <div className="flex h-full w-full flex-col overflow-y-auto">
        {isLoading ? (
          Skeleton
        ) : (
          <List<DriveItemData, 'name' | 'updatedAt' | 'size'>
            header={[
              {
                label: translate('drive.list.columns.name'),
                width: 'flex-1 min-w-activity truncate cursor-pointer',
                name: 'name',
                orderable: true,
                defaultDirection: 'ASC',
              },
              {
                label: translate('drive.list.columns.modified'),
                width: 'w-date',
                name: 'updatedAt',
                orderable: true,
                defaultDirection: 'ASC',
              },
              {
                label: translate('drive.list.columns.size'),
                width: 'cursor-pointer items-center w-size',
                name: 'size',
                orderable: true,
                defaultDirection: 'ASC',
              },
            ]}
            items={currentItems}
            isLoading={isLoading}
            itemComposition={[
              (item) => {
                const displayName = item.type === 'folder' ? item.name : `${item.plainName}.${item.type}`;
                const Icon = iconService.getItemIcon(item.isFolder, item.type);

                return (
                  <div className="flex min-w-activity grow items-center justify-start pr-3">
                    <div className="mr-3 h-8 w-8">
                      <Icon className="h-8 w-8" />
                    </div>
                    <div className="grow cursor-default truncate">
                      <span className="z-10 shrink cursor-pointer truncate" onClick={() => onClick(item)}>
                        {displayName}
                      </span>
                    </div>
                  </div>
                );
              },
              (item) => {
                return <div>{dateService.format(item.createdAt, 'DD MMMM YYYY. HH:mm')}</div>;
              },
              (item) => {
                const size = 'size' in item ? sizeService.bytesToString(item.size) : '';
                return <div>{size}</div>;
              },
            ]}
            onClick={(item) => {
              const unselectedDevices = selectedItems.map((deviceSelected) => ({
                device: deviceSelected,
                isSelected: false,
              }));
              onItemSelected([...unselectedDevices, { device: item, isSelected: true }]);
            }}
            onDoubleClick={onClick}
            skinSkeleton={Skeleton}
            emptyState={
              <Empty
                icon={<img className="w-36" alt="" src={folderEmptyImage} />}
                title="This folder is empty"
                subtitle="Use Internxt Desktop to upload your data"
              />
            }
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
          />
        )}
      </div>
    </div>
  );
}

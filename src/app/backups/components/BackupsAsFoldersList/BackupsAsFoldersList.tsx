import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SdkFactory } from '../../../core/factory/sdk';
import DriveExplorerOverlay from '../../../drive/components/DriveExplorer/DriveExplorerOverlay/DriveExplorerOverlay';
import { DriveItemData } from '../../../drive/types';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import folderEmptyImage from 'assets/images/folder-empty.svg';
import { downloadItemsThunk } from '../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { uiActions } from '../../../store/slices/ui';
import BackupsAsFoldersListItem from './BackupsAsFoldersListItem';
import DriveListItemSkeleton from '../../../drive/components/DriveListItemSkeleton/DriveListItemSkeleton';
import i18n from '../../../i18n/services/i18n.service';

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
  const Skeleton = Array(10)
    .fill(0)
    .map((n, i) => <DriveListItemSkeleton key={i} />);

  const [currentItems, setCurrentItems] = useState<DriveItemData[]>([]);

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

  function onDownload(item: DriveItemData) {
    dispatch(downloadItemsThunk([item]));
  }

  async function onDelete(item: DriveItemData) {
    dispatch(deleteItemsThunk([item]));
    setCurrentItems((items) => items.filter((i) => !(i.id === item.id && i.isFolder === item.isFolder)));
  }

  function onDoubleClick(item: DriveItemData) {
    if (item.isFolder) onFolderPush(item);
    else {
      dispatch(uiActions.setIsFileViewerOpen(true));
      dispatch(uiActions.setFileViewerItem(item));
    }
  }

  const isEmpty = currentItems.length === 0;

  return (
    <div className={`${className}`}>
      {(!isEmpty || isLoading) && (
        <div
          className="files-list font-semibold flex border-b\
       border-l-neutral-30 bg-white text-neutral-400 py-3 text-sm"
        >
          <div className="w-0.5/12 pl-3 flex items-center justify-start box-content"></div>
          <div className="flex-grow flex items-center px-3">{i18n.get('drive.list.columns.name')}</div>
          <div className="w-2/12 hidden items-center xl:flex"></div>
          <div className="w-3/12 hidden items-center lg:flex">{i18n.get('drive.list.columns.modified')}</div>
          <div className="w-2/12 flex items-center">{i18n.get('drive.list.columns.size')}</div>
          <div className="w-1/12 flex items-center">Actions</div>
        </div>
      )}
      {!isLoading &&
        currentItems.map((item) => (
          <BackupsAsFoldersListItem
            key={`${item.isFolder ? 'folder' : 'file'}-${item.id}`}
            item={item}
            onDeleteClicked={onDelete}
            onDownloadClicked={onDownload}
            onDoubleClick={onDoubleClick}
          />
        ))}
      {currentItems.length === 0 && !isLoading && (
        <DriveExplorerOverlay
          icon={<img alt="" src={folderEmptyImage} className="w-full m-auto" />}
          title="This folder is empty"
          subtitle="Use Internxt Desktop to upload your data"
        />
      )}
      {isLoading && Skeleton}
    </div>
  );
}

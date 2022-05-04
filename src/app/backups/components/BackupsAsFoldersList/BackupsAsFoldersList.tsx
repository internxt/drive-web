import { DriveFolderData } from '@internxt/sdk/dist/drive/storage/types';
import _ from 'lodash';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { SdkFactory } from '../../../core/factory/sdk';
import Empty from '../../../shared/components/Empty/Empty';
import { DriveItemData } from '../../../drive/types';
import { deleteItemsThunk } from '../../../store/slices/storage/storage.thunks/deleteItemsThunk';
import folderEmptyImage from 'assets/icons/light/folder-open.svg';
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
    <div className={`${className} flex min-h-0 flex-grow flex-col`}>
      {(!isEmpty || isLoading) && (
        <div
          className="files-list border-b\ flex border-l-neutral-30
       bg-white py-3 text-sm font-semibold text-neutral-400"
        >
          <div className="box-content flex w-0.5/12 items-center justify-start pl-3"></div>
          <div className="flex flex-grow items-center px-3">{i18n.get('drive.list.columns.name')}</div>
          <div className="hidden w-2/12 items-center xl:flex"></div>
          <div className="hidden w-3/12 items-center lg:flex">{i18n.get('drive.list.columns.modified')}</div>
          <div className="flex w-2/12 items-center">{i18n.get('drive.list.columns.size')}</div>
          <div className="flex w-1/12 items-center">Actions</div>
        </div>
      )}
      <div className="flex-grow overflow-y-auto">
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
          <Empty
            icon={<img className="w-36" alt="" src={folderEmptyImage} />}
            title="This folder is empty"
            subtitle="Use Internxt Desktop to upload your data"
          />
        )}
        {isLoading && Skeleton}
      </div>
    </div>
  );
}

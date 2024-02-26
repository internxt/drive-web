import { Menu, Transition } from '@headlessui/react';
import {
  CaretDown,
  FolderSimplePlus,
  Trash,
  PencilSimple,
  Link,
  DownloadSimple,
  Users,
  Info,
} from '@phosphor-icons/react';
import { ReactComponent as MoveActionIcon } from 'assets/icons/move.svg';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import moveItemsToTrash from '../../../../../use_cases/trash/move-items-to-trash';
import { DriveItemData, DriveItemDetails } from 'app/drive/types';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { downloadItemsThunk } from 'app/store/slices/storage/storage.thunks/downloadItemsThunk';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from '../../../../store/slices/ui';
import useDriveItemStoreProps from 'app/drive/components/DriveExplorer/DriveExplorerItem/hooks/useDriveStoreProps';
import { getAppConfig } from 'app/core/services/config.service';
import { BreadcrumbItemData } from '../types';
import storageThunks from 'app/store/slices/storage/storage.thunks';
import { storageActions } from '../../../../store/slices/storage';

interface BreadcrumbsMenu {
  item: BreadcrumbItemData;
  items: BreadcrumbItemData[];
  onItemClicked: (item: BreadcrumbItemData) => void;
}

const BreadcrumbsMenu = (props: BreadcrumbsMenu) => {
  const { onItemClicked } = props;
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const allItems = useAppSelector((state) => state.storage.levels);
  const namePath = useAppSelector((state) => state.storage.namePath);
  const currentBreadcrumb = namePath[namePath.length - 1];
  const { breadcrumbDirtyName } = useDriveItemStoreProps();
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id;
  const isSharedView = pathId === 'shared';

  const findCurrentFolder = (currentBreadcrumb) => {
    const foldersList: DriveItemData[] = [];

    for (const itemsInAllitems in allItems) {
      const selectedFolder = allItems[itemsInAllitems].find((item) => item?.id === currentBreadcrumb?.id);
      if (selectedFolder) foldersList.push(selectedFolder);
    }
    return foldersList;
  };

  const currentFolder = findCurrentFolder(currentBreadcrumb);

  const onCreateFolderButtonClicked = () => {
    dispatch(uiActions.setIsCreateFolderDialogOpen(true));
  };

  const onMoveToTrashButtonClicked = async () => {
    const previousBreadcrumb = props.items[props.items.length - 2];
    await moveItemsToTrash(currentFolder);
    onItemClicked(previousBreadcrumb);
  };

  const onDownloadButtonClicked = () => {
    dispatch(storageThunks.downloadItemsThunk(currentFolder));
  };

  const onDetailsItemButtonClicked = async () => {
    const itemDetails: DriveItemDetails = {
      ...currentFolder[0],
      isShared: !!currentFolder[0].sharings?.length,
      view: 'Drive',
    };
    dispatch(uiActions.setItemDetailsItem(itemDetails));
    dispatch(uiActions.setIsItemDetailsDialogOpen(true));
  };

  const onCopyLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onMoveButtonClicked = () => {
    dispatch(storageActions.setItemsToMove(currentFolder));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onEditButtonClicked = () => {
    dispatch(storageActions.setItemToRename(currentFolder[0]));
  };

  const onDeleteBackupButtonClicked = () => {
    dispatch(uiActions.setIsDeleteBackupDialog(true));
  };

  const onDownloadBackupButtonClicked = () => {
    dispatch(downloadItemsThunk([currentDevice as DriveItemData]));
  };

  const onShareLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(storageActions.setItemToShare({ item: item as unknown as DriveItemData }));
    dispatch(uiActions.setIsShareDialogOpen(true));
  };
  return (
    <Menu as="div" className="relative">
      <Menu.Button
        className="flex max-w-fit flex-1 cursor-pointer flex-row items-center truncate rounded-md p-1 px-1.5 font-medium text-gray-100 outline-none hover:bg-gray-5  
        focus-visible:bg-gray-5"
      >
        <div className="flex max-w-fit flex-1 flex-row items-center truncate">
          <span title={breadcrumbDirtyName || props.item.label} className="max-w-sm flex-1 truncate">
            {breadcrumbDirtyName || props.item.label}
          </span>
          <CaretDown weight="fill" className={`ml-1 h-3 w-3 ${isSharedView && 'hidden'}`} />
        </div>
      </Menu.Button>
      <Transition
        className={'absolute left-0'}
        enter="transition origin-top-left duration-100 ease-out"
        enterFrom="scale-95 opacity-0"
        enterTo="scale-100 opacity-100"
        leave="transition origin-top-left duration-100 ease-out"
        leaveFrom="scale-95 opacity-100"
        leaveTo="scale-100 opacity-0"
      >
        <Menu.Items
          className={`absolute z-10 mt-1 w-56 rounded-md border border-gray-10 bg-surface py-1.5 text-base shadow-subtle-hard outline-none dark:bg-gray-5 ${
            isSharedView && 'hidden'
          }`}
        >
          {!props.item.isBackup ? (
            <>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onCreateFolderButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <FolderSimplePlus size={20} />
                    <p className="ml-3">{translate('actions.upload.folder')}</p>
                  </div>
                )}
              </Menu.Item>
              <div className="mx-3 my-0.5 border-t border-gray-10" />
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onShareLinkButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <Users size={20} />
                    <p className="ml-3">{translate('drive.dropdown.shareLink')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onCopyLinkButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <Link size={20} />
                    <p className="ml-3">{translate('drive.dropdown.copyLink')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onKeyDown={() => {
                      // No op
                    }}
                    onClick={onDetailsItemButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <Info size={20} />
                    <p className="ml-3">{translate('drive.dropdown.details')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onEditButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <PencilSimple size={20} />
                    <p className="ml-3">{translate('drive.dropdown.rename')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onMoveButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <MoveActionIcon className="h-5 w-5" />
                    <p className="ml-3">{translate('drive.dropdown.move')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onDownloadButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <DownloadSimple size={20} />
                    <p className="ml-3">{translate('drive.dropdown.download')}</p>
                  </div>
                )}
              </Menu.Item>
              <div className="mx-3 my-0.5 border-t border-gray-10" />
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onMoveToTrashButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <Trash size={20} />
                    <p className="ml-3">{translate('drive.dropdown.moveToTrash')}</p>
                  </div>
                )}
              </Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onDownloadBackupButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <DownloadSimple size={20} />
                    <p className="ml-3">{translate('backups.dropdown.download')}</p>
                  </div>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <div
                    onClick={onDeleteBackupButtonClicked}
                    className={`${
                      active && 'bg-gray-5'
                    } flex cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
                  >
                    <Trash size={20} />
                    <p className="ml-3">{translate('backups.dropdown.delete')}</p>
                  </div>
                )}
              </Menu.Item>
            </>
          )}
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default BreadcrumbsMenu;

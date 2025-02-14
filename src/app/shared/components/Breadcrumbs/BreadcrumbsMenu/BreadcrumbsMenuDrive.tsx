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
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import moveItemsToTrash from '../../../../../use_cases/trash/move-items-to-trash';
import { DriveItemData, DriveItemDetails, FolderPath } from '../../../../drive/types';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { uiActions } from '../../../../store/slices/ui';
import { getAppConfig } from '../../../../core/services/config.service';
import storageThunks from '../../../../store/slices/storage/storage.thunks';
import { storageActions } from '../../../../store/slices/storage';
import shareService from '../../../../share/services/share.service';
import { BreadcrumbsMenuProps, Dropdown } from '@internxt/ui';

const BreadcrumbsMenuDrive = (props: BreadcrumbsMenuProps): JSX.Element => {
  const { onItemClicked } = props;
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const allItems = useAppSelector((state) => state.storage.levels);
  const namePath = useAppSelector((state) => state.storage.namePath);
  const currentBreadcrumb = namePath[namePath.length - 1];
  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id;
  const isSharedView = pathId === 'shared';

  const findCurrentFolder = (currentBreadcrumb: FolderPath) => {
    const foldersList: DriveItemData[] = [];

    for (const itemsInAllItems in allItems) {
      const selectedFolder = allItems[itemsInAllItems].find((item) => item?.uuid === currentBreadcrumb?.uuid);
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
    shareService.getPublicShareLink(item.uuid as string, item.isFolder ? 'folder' : 'file');
  };

  const onMoveButtonClicked = () => {
    dispatch(storageActions.setItemsToMove(currentFolder));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onEditButtonClicked = () => {
    dispatch(storageActions.setItemToRename(currentFolder[0]));
  };

  const onShareLinkButtonClicked = () => {
    const item = currentFolder[0];
    dispatch(storageActions.setItemToShare({ item: item as unknown as DriveItemData }));
    dispatch(uiActions.setIsShareDialogOpen(true));
  };

  return (
    <Dropdown
      classButton="flex w-full overflow-hidden flex-1 cursor-pointer flex-row items-center truncate rounded-md p-1 px-1.5 font-medium text-gray-100 outline-none hover:bg-gray-5 focus-visible:bg-gray-5"
      classMenuItems={`absolute z-10 mt-1 w-56 rounded-md border border-gray-10 bg-surface text-base shadow-subtle-hard outline-none dark:bg-gray-5 ${
        isSharedView && 'hidden'
      }`}
      openDirection="left"
      dropdownActionsContext={[
        {
          icon: FolderSimplePlus,
          name: translate('actions.upload.folder'),
          action: onCreateFolderButtonClicked,
        },
        { separator: true },
        {
          icon: Users,
          name: translate('drive.dropdown.shareLink'),
          action: onShareLinkButtonClicked,
        },
        {
          icon: Link,
          name: translate('drive.dropdown.copyLink'),
          action: onCopyLinkButtonClicked,
        },
        {
          icon: Info,
          name: translate('drive.dropdown.details'),
          action: onDetailsItemButtonClicked,
        },
        {
          icon: PencilSimple,
          name: translate('drive.dropdown.rename'),
          action: onEditButtonClicked,
        },
        {
          icon: MoveActionIcon as React.ForwardRefExoticComponent<{ size?: number | string }>,
          name: translate('drive.dropdown.move'),
          action: onMoveButtonClicked,
        },
        {
          icon: DownloadSimple,
          name: translate('drive.dropdown.download'),
          action: onDownloadButtonClicked,
        },
        { separator: true },
        {
          icon: Trash,
          name: translate('drive.dropdown.moveToTrash'),
          action: onMoveToTrashButtonClicked,
        },
      ]}
      item={props.item.label}
      children={
        <div className="flex max-w-fit flex-1 flex-row items-center truncate">
          <span title={props.item.label} className="max-w-sm flex-1 truncate">
            {props.item.label}
          </span>
          {!isSharedView && <CaretDown weight="fill" className="ml-1 h-3 w-3" />}
        </div>
      }
    />
  );
};

export default BreadcrumbsMenuDrive;

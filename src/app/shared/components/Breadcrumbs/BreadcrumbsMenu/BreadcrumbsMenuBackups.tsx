import { CaretDown, Trash, DownloadSimple } from '@phosphor-icons/react';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import { downloadItemsThunk } from '../../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { uiActions } from '../../../../store/slices/ui';
import { getAppConfig } from '../../../../core/services/config.service';
import { DriveItemData } from '../../../../drive/types';
import { BreadcrumbsMenuProps, Dropdown } from '@internxt/ui';

const BreadcrumbsMenuBackups = (props: BreadcrumbsMenuProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const currentFolder = useAppSelector((state) => state.backups.currentFolder);
  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id;
  const isSharedView = pathId === 'shared';
  const isFolder = props.items.length > 2;

  const onDeleteBackupButtonClicked = () => {
    dispatch(uiActions.setIsDeleteBackupDialog(true));
  };

  const onDownloadBackupButtonClicked = async () => {
    if (isFolder) {
      dispatch(downloadItemsThunk([currentFolder as DriveItemData]));
    } else {
      dispatch(downloadItemsThunk([currentDevice as DriveItemData]));
    }
  };

  return (
    <Dropdown
      classButton="flex max-w-fit flex-1 cursor-pointer flex-row items-center truncate rounded-md p-1 px-1.5 font-medium text-gray-100 outline-none hover:bg-gray-5 focus-visible:bg-gray-5"
      classMenuItems={`absolute z-10 mt-1 w-56 rounded-md border border-gray-10 bg-surface text-base shadow-subtle-hard outline-none dark:bg-gray-5 ${
        isSharedView && 'hidden'
      }`}
      openDirection="left"
      dropdownActionsContext={[
        {
          icon: DownloadSimple,
          name: translate('backups.dropdown.download'),
          action: onDownloadBackupButtonClicked,
        },
        {
          icon: Trash,
          name: translate('backups.dropdown.delete'),
          action: onDeleteBackupButtonClicked,
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

export default BreadcrumbsMenuBackups;

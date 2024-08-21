import { Menu, Transition } from '@headlessui/react';
import { CaretDown, Trash, DownloadSimple } from '@phosphor-icons/react';
import { useTranslationContext } from '../../../../i18n/provider/TranslationProvider';
import { downloadItemsThunk } from '../../../../store/slices/storage/storage.thunks/downloadItemsThunk';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { uiActions } from '../../../../store/slices/ui';
import useDriveItemStoreProps from '../../../../drive/components/DriveExplorer/DriveExplorerItem/hooks/useDriveStoreProps';
import { getAppConfig } from '../../../../core/services/config.service';
import { BreadcrumbsMenuProps } from '../types';
import { DriveItemData } from '../../../../drive/types';

const BreadcrumbsMenuBackups = (props: BreadcrumbsMenuProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const { breadcrumbDirtyName } = useDriveItemStoreProps();
  const currentDevice = useAppSelector((state) => state.backups.currentDevice);
  const path = getAppConfig().views.find((view) => view.path === location.pathname);
  const pathId = path?.id;
  const isSharedView = pathId === 'shared';

  const onDeleteBackupButtonClicked = () => {
    dispatch(uiActions.setIsDeleteBackupDialog(true));
  };

  const onDownloadBackupButtonClicked = () => {
    dispatch(downloadItemsThunk([currentDevice as DriveItemData]));
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
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onDownloadBackupButtonClicked}
                className={`${
                  active && 'bg-gray-5'
                } flex w-full cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
              >
                <DownloadSimple size={20} />
                <p className="ml-3">{translate('backups.dropdown.download')}</p>
              </button>
            )}
          </Menu.Item>
          <Menu.Item>
            {({ active }) => (
              <button
                onClick={onDeleteBackupButtonClicked}
                className={`${
                  active && 'bg-gray-5'
                } flex w-full cursor-pointer items-center px-3 py-2 text-gray-80 hover:bg-gray-5 dark:hover:bg-gray-10`}
              >
                <Trash size={20} />
                <p className="ml-3">{translate('backups.dropdown.delete')}</p>
              </button>
            )}
          </Menu.Item>
        </Menu.Items>
      </Transition>
    </Menu>
  );
};

export default BreadcrumbsMenuBackups;

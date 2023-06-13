import { FC, useMemo } from 'react';
import { Transition, Menu } from '@headlessui/react';
import {
  ArrowsOutCardinal,
  Copy,
  DotsThree,
  DownloadSimple,
  Gear,
  Link,
  LinkBreak,
  PencilSimple,
  Trash,
} from '@phosphor-icons/react';
import moveItemsToTrash from 'use_cases/trash/move-items-to-trash';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import { storageActions } from 'app/store/slices/storage';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch } from 'app/store/hooks';
import { DriveItemData } from 'app/drive/types';
import UilImport from '@iconscout/react-unicons/icons/uil-import';
import Button from '../../../../shared/components/Button/Button';
import { t } from 'i18next';
import notificationsService, { ToastType } from '../../../../notifications/services/notifications.service';

interface TopBarActionsProps {
  background?: string;
  onDownload: () => void;
  file: DriveItemData;
  isAuthenticated: boolean;
  isShareView?: boolean;
}

const TopBarActions: FC<TopBarActionsProps> = ({
  background,
  onDownload,
  file,
  isAuthenticated,
  isShareView,
}: TopBarActionsProps) => {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();

  const isFileShared = useMemo(() => file?.shares?.length ?? 0 > 0, [file]);

  const onMoveToTrashButtonClicked = async () => {
    await moveItemsToTrash([file]);
  };

  const onCreateLinkButtonClicked = () => {
    const item = file;
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onCopyLinkButtonClicked = () => {
    const item = file;
    dispatch(sharedThunks.getSharedLinkThunk({ item }));
  };

  const onDeleteLinkButtonClicked = () => {
    dispatch(sharedThunks.deleteLinkThunk({ linkId: file?.shares?.[0]?.id as string, item: file }));
  };

  const onLinkSettingsButtonClicked = () => {
    const item = file;
    dispatch(storageActions.setItemToShare({ share: item?.shares?.[0], item }));
    dispatch(uiActions.setIsShareItemDialogOpenInPreviewView(true));
  };

  const onMoveButtonClicked = () => {
    dispatch(storageActions.setItemsToMove(file ? [file] : []));
    dispatch(uiActions.setIsMoveItemsDialogOpen(true));
  };

  const onEditButtonClicked = () => {
    dispatch(storageActions.setItemToRename(file));
    dispatch(uiActions.setIsEditFolderNameDialog(true));
  };

  const copyNavigatorLink = () => {
    navigator.clipboard.writeText(window.location.href);
    notificationsService.show({ text: translate('success.linkCopied'), type: ToastType.Success });
  };

  return (
    <div
      className={`${background} z-10 mt-3 flex h-11 flex-shrink-0 flex-row items-center justify-end space-x-2 rounded-lg`}
    >
      <div className="flex flex-row items-center justify-center space-x-2 px-5">
        {!isAuthenticated && isShareView && (
          <button
            onClick={copyNavigatorLink}
            title={translate('actions.copyLink')}
            className="outline-none flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white bg-opacity-0 font-medium transition duration-50 ease-in-out hover:bg-opacity-10 focus:bg-opacity-5 focus-visible:bg-opacity-5"
          >
            <Link size={20} />
          </button>
        )}
        <button
          onClick={onDownload}
          title={translate('actions.download')}
          className="outline-none flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white bg-opacity-0 font-medium transition duration-50 ease-in-out hover:bg-opacity-10 focus:bg-opacity-5 focus-visible:bg-opacity-5"
        >
          <UilImport size={20} />
        </button>
      </div>
      {file && isAuthenticated && (
        <Menu as="div" className="relative inline-block text-left">
          <Menu.Button className="outline-none flex h-11 w-11 cursor-pointer flex-row items-center justify-center rounded-lg bg-white bg-opacity-0 font-medium transition duration-50 ease-in-out hover:bg-opacity-10 focus:bg-opacity-5 focus-visible:bg-opacity-5">
            <DotsThree weight="bold" size={20} />
          </Menu.Button>
          <Transition
            className={'flex'}
            enter="transform transition duration-100 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transform transition duration-100 ease-out"
            leaveFrom="scale-95 opacity-100"
            leaveTo="scale-100 opacity-0"
          >
            <Menu.Items
              className={
                'outline-none absolute right-0 mt-1 w-56 origin-top-right rounded-md border border-black border-opacity-8 bg-white py-1.5 text-base shadow-subtle-hard'
              }
            >
              <>
                {!isFileShared ? (
                  <Menu.Item>
                    {({ active }) => (
                      <div
                        onClick={onCreateLinkButtonClicked}
                        className={`${
                          active && 'bg-gray-5'
                        } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                      >
                        <Link size={20} />
                        <p className="ml-3">{translate('drive.dropdown.getLink')}</p>
                      </div>
                    )}
                  </Menu.Item>
                ) : (
                  <>
                    <Menu.Item>
                      {({ active }) => (
                        <div
                          onClick={onCopyLinkButtonClicked}
                          className={`${
                            active && 'bg-gray-5'
                          } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                        >
                          <Copy size={20} />
                          <p className="ml-3">{translate('drive.dropdown.copyLink')}</p>
                        </div>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <div
                          onClick={onLinkSettingsButtonClicked}
                          className={`${
                            active && 'bg-gray-5'
                          } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                        >
                          <Gear size={20} />
                          <p className="ml-3">{translate('drive.dropdown.linkSettings')}</p>
                        </div>
                      )}
                    </Menu.Item>
                    <Menu.Item>
                      {({ active }) => (
                        <div
                          onClick={onDeleteLinkButtonClicked}
                          className={`${
                            active && 'bg-gray-5'
                          } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                        >
                          <LinkBreak size={20} />
                          <p className="ml-3">{translate('drive.dropdown.deleteLink')}</p>
                        </div>
                      )}
                    </Menu.Item>
                  </>
                )}
                <div className="my-0.5 mx-3 border-t border-gray-10" />
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={onEditButtonClicked}
                      className={`${
                        active && 'bg-gray-5'
                      } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
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
                      } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                    >
                      <ArrowsOutCardinal size={20} />
                      <p className="ml-3">{translate('drive.dropdown.move')}</p>
                    </div>
                  )}
                </Menu.Item>
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={onDownload}
                      className={`${
                        active && 'bg-gray-5'
                      } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                    >
                      <DownloadSimple size={20} />
                      <p className="ml-3">{translate('drive.dropdown.download')}</p>
                    </div>
                  )}
                </Menu.Item>
                <div className="my-0.5 mx-3 border-t border-gray-10" />
                <Menu.Item>
                  {({ active }) => (
                    <div
                      onClick={onMoveToTrashButtonClicked}
                      className={`${
                        active && 'bg-gray-5'
                      } flex cursor-pointer items-center py-2 px-3 text-gray-80 hover:bg-gray-5`}
                    >
                      <Trash size={20} />
                      <p className="ml-3">{translate('drive.dropdown.moveToTrash')}</p>
                    </div>
                  )}
                </Menu.Item>
              </>
            </Menu.Items>
          </Transition>
        </Menu>
      )}
      {!isAuthenticated && (
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            window.location.href = process.env.REACT_APP_HOSTNAME + '/login';
          }}
          className="px-5"
        >
          {t('auth.login.title')}
        </Button>
      )}
    </div>
  );
};

export default TopBarActions;

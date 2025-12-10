import { useState, useEffect } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import {
  Header,
  CurrentVersionItem,
  VersionItem,
  AutosaveSection,
  VersionActionDialog,
  VersionHistorySkeleton,
} from './components';
import { FileVersion } from './types';
import fileVersionService from 'views/Drive/components/VersionHistory/services/file-version.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isVersionHistorySidebarOpen);
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);
  const user = useAppSelector((state: RootState) => state.user.user);
  const isDeleteVersionDialogOpen = useAppSelector((state: RootState) => state.ui.isDeleteVersionDialogOpen);
  const versionToDelete = useAppSelector((state: RootState) => state.ui.versionToDelete);
  const isRestoreVersionDialogOpen = useAppSelector((state: RootState) => state.ui.isRestoreVersionDialogOpen);
  const versionToRestore = useAppSelector((state: RootState) => state.ui.versionToRestore);
  const { translate } = useTranslationContext();

  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectAllAutosave, setSelectAllAutosave] = useState(false);
  const autosaveVersions = versions.filter((v) => v.isAutosave);
  const totalAutosaveCount = autosaveVersions.length;

  const userName = user?.name && user?.lastname ? `${user.name} ${user.lastname}` : user?.email || 'Unknown User';

  const fetchVersions = async () => {
    if (!item || !isOpen) return;

    setIsLoading(true);
    try {
      const fileVersions = await fileVersionService.getFileVersions(item.uuid);
      // TODO: Determine if autosave
      setVersions(fileVersions);
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [item, isOpen]);

  const onClose = () => {
    dispatch(uiActions.setIsVersionHistorySidebarOpen(false));
  };

  const handleCloseDeleteDialog = () => {
    dispatch(uiActions.setIsDeleteVersionDialogOpen(false));
    dispatch(uiActions.setVersionToDelete(null));
  };

  const handleCloseRestoreDialog = () => {
    dispatch(uiActions.setIsRestoreVersionDialogOpen(false));
    dispatch(uiActions.setVersionToRestore(null));
  };

  const handleDeleteConfirm = async () => {
    if (!versionToDelete || !item) return;

    try {
      await fileVersionService.deleteVersion(item.uuid, versionToDelete.id.toString());
      notificationsService.show({
        text: translate('modals.versionHistory.deleteSuccess'),
        type: ToastType.Success,
      });
      await fetchVersions();
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
      notificationsService.show({
        text: translate('modals.versionHistory.deleteError'),
        type: ToastType.Error,
      });
      throw error;
    }
  };

  const handleRestoreConfirm = async () => {
    if (!versionToRestore || !item) return;

    try {
      await fileVersionService.restoreVersion(item.uuid, versionToRestore.id.toString());
      notificationsService.show({
        text: translate('modals.versionHistory.restoreSuccess'),
        type: ToastType.Success,
      });
      await fetchVersions();
    } catch (error) {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
      notificationsService.show({
        text: translate('modals.versionHistory.restoreError'),
        type: ToastType.Error,
      });
      throw error;
    }
  };

  if (!item) return null;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 transition-opacity" onClick={onClose} aria-hidden />}
      <div
        className={`absolute right-0 top-0 z-50 h-full w-80 transform bg-surface dark:bg-gray-1 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="flex h-full flex-col">
          <Header title={translate('modals.versionHistory.title')} onClose={onClose} />

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <VersionHistorySkeleton />
            ) : (
              <>
                <CurrentVersionItem key={item.id} version={item} userName={userName} />

                <AutosaveSection
                  totalAutosaveCount={totalAutosaveCount}
                  selectAllAutosave={selectAllAutosave}
                  onSelectAllChange={setSelectAllAutosave}
                  onDeleteAll={() => {}}
                />

                {versions.map((version) => (
                  <VersionItem key={version.id} version={version} userName={userName} />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
      <VersionActionDialog
        isOpen={isDeleteVersionDialogOpen}
        actionType="delete"
        onClose={handleCloseDeleteDialog}
        onConfirm={handleDeleteConfirm}
      />
      <VersionActionDialog
        isOpen={isRestoreVersionDialogOpen}
        actionType="restore"
        onClose={handleCloseRestoreDialog}
        onConfirm={handleRestoreConfirm}
      />
    </>
  );
};

export default Sidebar;

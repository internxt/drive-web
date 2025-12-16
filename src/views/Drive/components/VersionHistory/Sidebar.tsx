import { useState, useEffect, useCallback, useMemo } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import {
  Header,
  CurrentVersionItem,
  VersionItem,
  AutosaveSection,
  VersionActionDialog,
  VersionHistorySkeleton,
} from './components';
import fileVersionService from 'views/Drive/components/VersionHistory/services/fileVersion.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { fetchFileVersionsThunk, fetchVersionLimitsThunk, fileVersionsActions } from 'app/store/slices/fileVersions';

type VersionInfo = { id: string; updatedAt: string };

const Sidebar = () => {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state: RootState) => state.ui.isVersionHistorySidebarOpen);
  const item = useAppSelector((state: RootState) => state.ui.versionHistoryItem);
  const user = useAppSelector((state: RootState) => state.user.user);
  const isDeleteVersionDialogOpen = useAppSelector((state: RootState) => state.ui.isDeleteVersionDialogOpen);
  const versionToDelete = useAppSelector((state: RootState) => state.ui.versionToDelete);
  const isRestoreVersionDialogOpen = useAppSelector((state: RootState) => state.ui.isRestoreVersionDialogOpen);
  const versionToRestore = useAppSelector((state: RootState) => state.ui.versionToRestore);
  const currentFolderId = useAppSelector(storageSelectors.currentFolderId);
  const { translate } = useTranslationContext();

  const limits = useAppSelector((state: RootState) => state.fileVersions.limits);
  const versions =
    useAppSelector((state: RootState) => (item ? state.fileVersions.versionsByFileId[item.uuid] : [])) || [];
  const isLoading =
    useAppSelector((state: RootState) => (item ? state.fileVersions.loadingStates[item.uuid] : false)) || false;
  const [selectedAutosaveVersions, setSelectedAutosaveVersions] = useState<Set<string>>(new Set());
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo>({
    id: '',
    updatedAt: '',
  });

  useEffect(() => {
    if (item) {
      setCurrentVersion({
        id: item.fileId,
        updatedAt: item.updatedAt,
      });
    }
  }, [item]);
  const totalVersionsCount = versions.length;
  const selectedCount = selectedAutosaveVersions.size;
  const selectAllAutosave = selectedCount === totalVersionsCount && totalVersionsCount > 0;
  const totalAllowedVersions = limits?.versioning.maxVersions ?? 0;

  const userName = useMemo(
    () => (user?.name && user?.lastname ? `${user.name} ${user.lastname}` : user?.email || 'Unknown User'),
    [user],
  );

  useEffect(() => {
    if (!item || !isOpen) return;

    if (!limits) {
      dispatch(fetchVersionLimitsThunk());
    }

    const hasCachedVersions = versions && versions.length > 0;
    if (!hasCachedVersions) {
      dispatch(fetchFileVersionsThunk(item.uuid));
    }
  }, [item?.uuid, isOpen, dispatch]);

  const handleError = useCallback(
    (error: unknown, messageKey: string) => {
      const castedError = errorService.castError(error);
      errorService.reportError(castedError);
      notificationsService.show({
        text: translate(messageKey),
        type: ToastType.Error,
      });
    },
    [translate],
  );

  const onClose = useCallback(() => {
    dispatch(uiActions.setIsVersionHistorySidebarOpen(false));
    setSelectedAutosaveVersions(new Set());
    setIsBatchDeleteMode(false);
  }, [dispatch]);

  const removeVersionsFromSelection = (versionIds: string[]) => {
    setSelectedAutosaveVersions((prev) => {
      const updated = new Set(prev);
      versionIds.forEach((id) => updated.delete(id));
      return updated;
    });
  };

  const handleCloseDeleteDialog = () => {
    dispatch(uiActions.setIsDeleteVersionDialogOpen(false));
    dispatch(uiActions.setVersionToDelete(null));
    setIsBatchDeleteMode(false);
  };

  const handleCloseRestoreDialog = () => {
    dispatch(uiActions.setIsRestoreVersionDialogOpen(false));
    dispatch(uiActions.setVersionToRestore(null));
  };

  const handleDeleteConfirm = async () => {
    if (!item) return;

    let versionIdsToDelete: string[] = [];

    if (isBatchDeleteMode) {
      versionIdsToDelete = Array.from(selectedAutosaveVersions);
    } else if (versionToDelete) {
      versionIdsToDelete = [versionToDelete.id];
    }

    if (versionIdsToDelete.length === 0) return;

    try {
      await Promise.all(versionIdsToDelete.map((versionId) => fileVersionService.deleteVersion(item.uuid, versionId)));

      versionIdsToDelete.forEach((versionId) => {
        dispatch(fileVersionsActions.updateVersionsAfterDelete({ fileUuid: item.uuid, versionId }));
      });

      notificationsService.show({
        text: translate('modals.versionHistory.deleteSuccess'),
        type: ToastType.Success,
      });
      removeVersionsFromSelection(versionIdsToDelete);
    } catch (error) {
      handleError(error, 'modals.versionHistory.deleteError');
    } finally {
      setIsBatchDeleteMode(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!versionToRestore || !item) return;

    try {
      const restoredVersion = await fileVersionService.restoreVersion(item.uuid, versionToRestore.id);

      setCurrentVersion({
        id: restoredVersion.fileId,
        updatedAt: new Date().toISOString(),
      });

      dispatch(fileVersionsActions.invalidateCache(item.uuid));
      dispatch(fetchFileVersionsThunk(item.uuid));

      notificationsService.show({
        text: translate('modals.versionHistory.restoreSuccess'),
        type: ToastType.Success,
      });
      if (currentFolderId) {
        await dispatch(fetchSortedFolderContentThunk(currentFolderId));
      }
      removeVersionsFromSelection([versionToRestore.id]);
    } catch (error) {
      handleError(error, 'modals.versionHistory.restoreError');
    }
  };

  const handleSelectAllAutosave = useCallback(
    (checked: boolean) => {
      setSelectedAutosaveVersions(checked ? new Set(versions.map((v) => v.id)) : new Set());
    },
    [versions],
  );

  const handleVersionSelectionChange = useCallback((versionId: string, selected: boolean) => {
    setSelectedAutosaveVersions((prev) => {
      const newSelection = new Set(prev);
      selected ? newSelection.add(versionId) : newSelection.delete(versionId);
      return newSelection;
    });
  }, []);

  const handleDeleteSelectedVersions = useCallback(() => {
    if (!item || selectedCount === 0) return;
    setIsBatchDeleteMode(true);
    dispatch(uiActions.setIsDeleteVersionDialogOpen(true));
  }, [item, selectedCount, dispatch]);

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
                <CurrentVersionItem key={currentVersion.id} createdAt={currentVersion.updatedAt} userName={userName} />

                <AutosaveSection
                  totalVersionsCount={totalVersionsCount}
                  totalAllowedVersions={totalAllowedVersions}
                  selectedCount={selectedCount}
                  selectAllAutosave={selectAllAutosave}
                  onSelectAllChange={handleSelectAllAutosave}
                  onDeleteAll={handleDeleteSelectedVersions}
                />

                {versions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    userName={userName}
                    isSelected={selectedAutosaveVersions.has(version.id)}
                    onSelectionChange={(selected) => handleVersionSelectionChange(version.id, selected)}
                  />
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

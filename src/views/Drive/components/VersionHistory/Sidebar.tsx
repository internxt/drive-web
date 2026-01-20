import { useState, useEffect, useCallback, useMemo } from 'react';
import { RootState } from 'app/store';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { uiActions } from 'app/store/slices/ui';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import storageSelectors from 'app/store/slices/storage/storage.selectors';
import { fetchSortedFolderContentThunk } from 'app/store/slices/storage/storage.thunks/fetchSortedFolderContentThunk';
import workspacesSelectors from 'app/store/slices/workspaces/workspaces.selectors';
import navigationService from 'services/navigation.service';
import {
  Header,
  CurrentVersionItem,
  VersionItem,
  AutosaveSection,
  VersionActionDialog,
  VersionHistorySkeleton,
  LockedFeatureModal,
} from './components';
import fileVersionService from 'views/Drive/services/fileVersion.service';
import errorService from 'services/error.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import {
  fetchFileVersionsThunk,
  fetchVersionLimitsThunk,
  fileVersionsActions,
  fileVersionsSelectors,
} from 'app/store/slices/fileVersions';

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
  const selectedWorkspace = useAppSelector(workspacesSelectors.getSelectedWorkspace);
  const { translate } = useTranslationContext();

  const limits = useAppSelector(fileVersionsSelectors.getLimits);
  const isLimitsLoading = useAppSelector(fileVersionsSelectors.isLimitsLoading);
  const versions = useAppSelector((state: RootState) =>
    item ? fileVersionsSelectors.getVersionsByFileId(state, item.uuid) : [],
  );
  const isLoading = useAppSelector((state: RootState) =>
    item ? fileVersionsSelectors.isLoadingByFileId(state, item.uuid) : false,
  );
  const [selectedAutosaveVersions, setSelectedAutosaveVersions] = useState<Set<string>>(new Set());
  const [isBatchDeleteMode, setIsBatchDeleteMode] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<VersionInfo>({
    id: '',
    updatedAt: '',
  });

  const isVersioningEnabled = limits?.versioning?.enabled ?? false;
  const isLoadingContent = (isVersioningEnabled && isLoading) || isLimitsLoading;

  const blurredBackgroundVersions = useMemo(() => {
    if (isVersioningEnabled) return [];

    const fixedDate = new Date('2024-05-01').toISOString();
    return Array.from({ length: 10 }, (_, i) => ({
      id: `mock-${i}`,
      fileId: '',
      size: '1000000',
      createdAt: fixedDate,
      updatedAt: fixedDate,
      type: 'file',
    }));
  }, [isVersioningEnabled]);

  const displayVersions = isVersioningEnabled ? versions : blurredBackgroundVersions;

  useEffect(() => {
    if (item) {
      setCurrentVersion({
        id: item.fileId,
        updatedAt: item.updatedAt,
      });
    }
  }, [item]);
  const totalVersionsCount = displayVersions.length;
  const selectedCount = selectedAutosaveVersions.size;
  const selectAllAutosave = selectedCount === totalVersionsCount && totalVersionsCount > 0;
  const totalAllowedVersions = limits?.versioning.maxVersions ?? 0;

  const userName = useMemo(
    () => (user?.name && user?.lastname ? `${user.name} ${user.lastname}` : user?.email || 'Unknown User'),
    [user],
  );

  const userAvatar = user?.avatar ?? null;

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
        id: restoredVersion.fileId as string,
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

  const handleUpgrade = () => {
    dispatch(uiActions.setIsPreferencesDialogOpen(true));
    navigationService.openPreferencesDialog({
      section: 'account',
      subsection: 'plans',
      workspaceUuid: selectedWorkspace?.workspaceUser.workspaceId,
    });
  };

  const shouldShowSidebar = isOpen && item;

  return (
    <>
      {shouldShowSidebar && <div className="fixed inset-0 z-40 transition-opacity" onClick={onClose} aria-hidden />}
      <div
        className={`absolute right-0 top-0 z-50 h-full w-80 transform bg-surface dark:bg-gray-1 transition-transform duration-300 ease-in-out ${
          shouldShowSidebar ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)' }}
      >
        <div className="flex h-full flex-col">
          <Header title={translate('modals.versionHistory.title')} onClose={onClose} />

          <div className={`flex-1 relative ${isVersioningEnabled ? 'overflow-y-auto' : 'overflow-y-hidden'}`}>
            {isLoadingContent ? (
              <VersionHistorySkeleton />
            ) : (
              <>
                <CurrentVersionItem
                  key={currentVersion.id}
                  createdAt={currentVersion.updatedAt}
                  userName={userName}
                  userAvatar={userAvatar}
                />

                <AutosaveSection
                  totalVersionsCount={totalVersionsCount}
                  totalAllowedVersions={totalAllowedVersions}
                  selectedCount={selectedCount}
                  selectAllAutosave={selectAllAutosave}
                  onSelectAllChange={handleSelectAllAutosave}
                  onDeleteAll={handleDeleteSelectedVersions}
                />

                {displayVersions.map((version) => (
                  <VersionItem
                    key={version.id}
                    version={version}
                    userName={userName}
                    userAvatar={userAvatar}
                    isSelected={selectedAutosaveVersions.has(version.id)}
                    onSelectionChange={(selected) => handleVersionSelectionChange(version.id, selected)}
                  />
                ))}
              </>
            )}
            {!isVersioningEnabled && !isLimitsLoading && <LockedFeatureModal onUpgrade={handleUpgrade} />}
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

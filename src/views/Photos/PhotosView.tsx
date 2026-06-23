import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { CaretRight } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { DriveFolderData } from 'app/drive/types';
import FileViewerWrapper from 'app/drive/components/FileViewer/FileViewerWrapper';
import { useBackupListActions } from 'views/Backups/hooks/useBackupListActions';
import { useBackupsPagination } from 'views/Backups/hooks/useBackupsPagination';
import WarningMessageWrapper from 'views/Home/components/WarningMessageWrapper';
import { Dialog } from '@internxt/ui';
import errorService from 'services/error.service';
import { fetchPhotoDevicesThunk, setCurrentDevice, deletePhotoDeviceThunk } from './store';
import PhotoDeviceList from './components/PhotoDeviceList';
import PhotosAsFoldersList from './components/PhotosAsFoldersList';
import PhotosGalleryView from './components/PhotosGalleryView';
import { PhotoDevice } from './services/photos.service';

type PhotosTab = 'devices' | 'gallery';

export default function PhotosView(): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useAppDispatch();
  const isLoadingDevices = useAppSelector((state) => state.photos.isLoadingDevices);
  const devices = useAppSelector((state) => state.photos.devices);
  const currentDevice = useAppSelector((state) => state.photos.currentDevice);
  const [foldersInBreadcrumbs, setFoldersInBreadcrumbs] = useState<DriveFolderData[]>([]);
  const [deviceToDelete, setDeviceToDelete] = useState<PhotoDevice | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<PhotosTab>('gallery');

  const {
    folderUuid,
    selectedItems,
    itemToPreview,
    isFileViewerOpen,
    onFolderUuidChanges,
    onCloseFileViewer,
    clearSelectedItems,
    onItemSelected,
    onItemClicked,
    onSelectedItemsChanged,
  } = useBackupListActions(setFoldersInBreadcrumbs, dispatch);

  const { currentItems, areFetchingItems, hasMoreItems, getMorePaginatedItems } = useBackupsPagination(
    folderUuid,
    clearSelectedItems,
  );

  useEffect(() => {
    dispatch(fetchPhotoDevicesThunk());
  }, []);

  const onDeviceClicked = (device: PhotoDevice) => {
    dispatch(setCurrentDevice(device));
    onFolderUuidChanges(device.uuid);
  };

  const goToRootFolder = () => {
    dispatch(setCurrentDevice(null));
    setFoldersInBreadcrumbs([]);
    onFolderUuidChanges(undefined);
  };

  const goToDeviceRoot = () => {
    if (!currentDevice) return;
    setFoldersInBreadcrumbs([]);
    onFolderUuidChanges(currentDevice.uuid);
  };

  const goToFolder = (_folderId: number, folderUuid?: string) => {
    const index = foldersInBreadcrumbs.findIndex((f) => f.uuid === folderUuid);
    const newPath = foldersInBreadcrumbs.slice(0, index + 1);
    setFoldersInBreadcrumbs(newPath);
    onFolderUuidChanges(folderUuid);
  };

  const onConfirmDeleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      setIsDeleting(true);
      await dispatch(deletePhotoDeviceThunk(deviceToDelete)).unwrap();
    } catch (e) {
      errorService.reportError(e);
    } finally {
      setIsDeleting(false);
      setDeviceToDelete(null);
    }
  };

  const handleTabChange = (tab: PhotosTab) => {
    setActiveTab(tab);
    if (tab === 'devices') {
      dispatch(setCurrentDevice(null));
      setFoldersInBreadcrumbs([]);
      onFolderUuidChanges(undefined);
    }
  };

  const devicesBody = currentDevice ? (
    <PhotosAsFoldersList
      currentItems={currentItems}
      selectedItems={selectedItems}
      hasMoreItems={hasMoreItems}
      isLoading={areFetchingItems}
      getPaginatedList={getMorePaginatedItems}
      onItemClicked={onItemClicked}
      onItemSelected={onItemSelected}
      onSelectedItemsChanged={onSelectedItemsChanged}
    />
  ) : (
    <PhotoDeviceList
      items={devices}
      isLoading={isLoadingDevices}
      onDeviceClicked={onDeviceClicked}
      onDeviceDeleteRequested={setDeviceToDelete}
    />
  );

  return (
    <div role="none" className="flex w-full shrink-0 grow flex-col" onContextMenu={(e) => e.preventDefault()}>
      <Helmet>
        <title>{translate('sideNav.photos')} - Internxt Drive</title>
      </Helmet>

      {/* Header */}
      <div className="flex h-14 shrink-0 items-center px-5">
        {activeTab === 'devices' && currentDevice ? (
          /* Breadcrumb: Your devices > Device name > Year > Month > Day */
          <nav className="flex items-center gap-1 text-sm min-w-0">
            <button
              onClick={goToRootFolder}
              className="shrink-0 font-medium text-gray-50 hover:text-gray-80 transition-colors"
            >
              {translate('photos.your-devices')}
            </button>
            <CaretRight size={12} className="shrink-0 text-gray-30" />
            {foldersInBreadcrumbs.length === 0 ? (
              <span className="truncate font-medium text-gray-80">{currentDevice.plainName}</span>
            ) : (
              <>
                <button
                  onClick={goToDeviceRoot}
                  className="shrink-0 font-medium text-gray-50 hover:text-gray-80 transition-colors"
                >
                  {currentDevice.plainName}
                </button>
                {foldersInBreadcrumbs.map((folder, i) => {
                  const isLast = i === foldersInBreadcrumbs.length - 1;
                  return (
                    <span key={folder.uuid} className="flex items-center gap-1 min-w-0">
                      <CaretRight size={12} className="shrink-0 text-gray-30" />
                      {isLast ? (
                        <span className="truncate font-medium text-gray-80">{folder.name}</span>
                      ) : (
                        <button
                          onClick={() => goToFolder(folder.id, folder.uuid)}
                          className="shrink-0 font-medium text-gray-50 hover:text-gray-80 transition-colors"
                        >
                          {folder.name}
                        </button>
                      )}
                    </span>
                  );
                })}
              </>
            )}
          </nav>
        ) : (
          <p className="text-lg font-medium">{translate('sideNav.photos')}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex shrink-0 border-b border-gray-10 px-5">
        <button
          onClick={() => handleTabChange('gallery')}
          className={`mr-6 pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'gallery'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-50 hover:text-gray-80'
          }`}
        >
          {translate('photos.tabs.gallery')}
        </button>
        <button
          onClick={() => handleTabChange('devices')}
          className={`pb-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === 'devices'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-50 hover:text-gray-80'
          }`}
        >
          {translate('photos.tabs.devices')}
        </button>
      </div>

      <WarningMessageWrapper />

      {activeTab === 'gallery' ? (
        <PhotosGalleryView devices={devices} isLoadingDevices={isLoadingDevices} />
      ) : (
        <>
          {devicesBody}
          {itemToPreview && (
            <FileViewerWrapper
              file={itemToPreview}
              onClose={onCloseFileViewer}
              showPreview={isFileViewerOpen}
              folderItems={currentItems}
              contextMenu={[]}
            />
          )}
        </>
      )}

      <Dialog
        isOpen={!!deviceToDelete}
        onClose={() => setDeviceToDelete(null)}
        onSecondaryAction={() => setDeviceToDelete(null)}
        onPrimaryAction={onConfirmDeleteDevice}
        title={translate('photos.deleteDevice.title')}
        subtitle={translate('photos.deleteDevice.subtitle')}
        primaryAction={translate('photos.deleteDevice.confirm')}
        secondaryAction={translate('photos.deleteDevice.cancel')}
        primaryActionColor="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

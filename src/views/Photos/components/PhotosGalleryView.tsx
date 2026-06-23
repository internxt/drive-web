import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import FileViewerWrapper from 'app/drive/components/FileViewer/FileViewerWrapper';
import { PhotoDevice } from '../services/photos.service';
import { usePhotosGallery } from '../hooks/usePhotosGallery';
import DeviceFilterBar from './DeviceFilterBar';
import PhotoThumbnailCell from './PhotoThumbnailCell';

interface PhotosGalleryViewProps {
  devices: PhotoDevice[];
  isLoadingDevices: boolean;
}

function toDriveItemData(photo: DriveFileData): DriveItemData {
  return {
    ...photo,
    isFolder: false,
    name: photo.plainName ?? photo.plain_name ?? photo.name,
  } as DriveItemData;
}

export default function PhotosGalleryView({
  devices,
  isLoadingDevices,
}: Readonly<PhotosGalleryViewProps>): JSX.Element {
  const { translate } = useTranslationContext();
  const [selectedUuids, setSelectedUuids] = useState<Set<string>>(new Set());
  const [itemToPreview, setItemToPreview] = useState<DriveItemData | null>(null);
  const [allGalleryItems, setAllGalleryItems] = useState<DriveItemData[]>([]);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  const effectiveDeviceUuids = useMemo(() => {
    if (selectedUuids.size === 0 || selectedUuids.size === devices.length) {
      return devices.map((d) => d.uuid);
    }
    return Array.from(selectedUuids);
  }, [selectedUuids, devices]);

  const { groups, isLoading, hasMore, loadMore } = usePhotosGallery(effectiveDeviceUuids);

  useEffect(() => {
    const flat = groups.flatMap((g) => g.photos.map(toDriveItemData));
    setAllGalleryItems(flat);
  }, [groups]);

  useEffect(() => {
    if (!loadMoreTriggerRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMore();
        }
      },
      { rootMargin: '300px' },
    );
    observer.observe(loadMoreTriggerRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  const handlePhotoClick = useCallback((photo: DriveFileData) => {
    setItemToPreview(toDriveItemData(photo));
  }, []);

  const isEmpty = !isLoading && !isLoadingDevices && groups.length === 0;

  if (isLoadingDevices) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center px-8">
        <p className="text-lg font-medium text-gray-80">{translate('photos.gallery.empty.noDevices.title')}</p>
        <p className="text-sm text-gray-50">{translate('photos.gallery.empty.noDevices.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <DeviceFilterBar devices={devices} selectedUuids={selectedUuids} onSelectionChange={setSelectedUuids} />

      <div className="flex-1 overflow-y-auto">
        {isLoading && groups.length === 0 ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center px-8 py-20">
            <p className="text-lg font-medium text-gray-80">{translate('photos.gallery.empty.title')}</p>
            <p className="text-sm text-gray-50">{translate('photos.gallery.empty.subtitle')}</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section key={group.id}>
                <div className="sticky top-0 z-10 bg-white/90 px-5 py-2 backdrop-blur-sm dark:bg-gray-1/90">
                  <p className="text-sm font-semibold text-gray-80">{group.label}</p>
                </div>
                <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                  {group.photos.map((photo) => (
                    <PhotoThumbnailCell key={photo.uuid} photo={photo} onClick={handlePhotoClick} />
                  ))}
                </div>
              </section>
            ))}

            <div ref={loadMoreTriggerRef} className="flex justify-center py-6">
              {isLoading && (
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              )}
            </div>
          </>
        )}
      </div>

      {itemToPreview && (
        <FileViewerWrapper
          file={itemToPreview}
          onClose={() => setItemToPreview(null)}
          showPreview={true}
          folderItems={allGalleryItems}
          contextMenu={[]}
        />
      )}
    </div>
  );
}

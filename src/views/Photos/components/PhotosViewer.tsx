import { MenuItemType } from '@internxt/ui';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import FileViewerWrapper from 'app/drive/components/FileViewer/FileViewerWrapper';
import { DriveItemData } from 'app/drive/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { DownloadManager } from 'app/network/DownloadManager';
import { useMemo } from 'react';
import { getPhotoFiles } from '../services/photoFolders.service';
import { Photo } from '../types';

interface PhotosViewerProps {
  photo: Photo;
  photos: Photo[];
  onClose: () => void;
}

const PhotosViewer = ({ photo, photos, onClose }: PhotosViewerProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const files = useMemo(() => photos.map(({ file }) => file), [photos]);
  const photoByFileId = useMemo(() => new Map(photos.map((shownPhoto) => [shownPhoto.file.id, shownPhoto])), [photos]);

  const downloadPhoto = (file: DriveItemData) => {
    const shownPhoto = photoByFileId.get(file.id);
    if (!shownPhoto) return;
    void DownloadManager.downloadItem({
      payload: getPhotoFiles([shownPhoto]),
      selectedWorkspace: null,
      workspaceCredentials: null,
    });
  };

  const menu: MenuItemType<DriveItemData>[] = [
    {
      name: translate('drive.dropdown.download'),
      icon: DownloadSimpleIcon,
      action: downloadPhoto,
    },
  ];

  return (
    <FileViewerWrapper
      file={photo.file}
      folderItems={files}
      showPreview
      onClose={onClose}
      contextMenu={menu}
      onDownloadFile={downloadPhoto}
      refreshesThumbnail={false}
    />
  );
};

export default PhotosViewer;

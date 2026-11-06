import { getDatabaseFilePreviewData, updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { downloadThumbnail } from 'app/drive/services/thumbnail.service';
import errorService from 'services/error.service';
import { Photo, PhotoThumbnail } from '../types';

export class PhotoThumbnailsService {
  public static readonly instance: PhotoThumbnailsService = new PhotoThumbnailsService();

  async getThumbnail(photo: Photo, thumbnail: PhotoThumbnail, abortController: AbortController): Promise<Blob> {
    const cachedPreview = await getDatabaseFilePreviewData({ fileId: photo.id });
    const isCachedPreviewUpToDate = cachedPreview?.updatedAt === photo.updatedAt;
    if (cachedPreview?.preview && isCachedPreviewUpToDate) return cachedPreview.preview;

    const thumbnailBlob = await downloadThumbnail(thumbnail, false, abortController);
    updateDatabaseFilePreviewData({
      fileId: photo.id,
      folderId: photo.folderId,
      previewBlob: thumbnailBlob,
      updatedAt: photo.updatedAt,
    }).catch(errorService.reportError);

    return thumbnailBlob;
  }
}

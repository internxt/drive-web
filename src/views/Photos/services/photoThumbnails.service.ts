import { updateDatabaseFilePreviewData } from 'app/drive/services/database.service';
import { downloadThumbnail, getCachedThumbnail } from 'app/drive/services/thumbnail.service';
import errorService from 'services/error.service';
import { Photo, PhotoThumbnail } from '../types';

export class PhotoThumbnailsService {
  public static readonly instance: PhotoThumbnailsService = new PhotoThumbnailsService();

  async getThumbnail(photo: Photo, thumbnail: PhotoThumbnail, abortController: AbortController): Promise<Blob> {
    const cachedThumbnail = await getCachedThumbnail(photo);
    if (cachedThumbnail) return cachedThumbnail;

    const thumbnailBlob = await downloadThumbnail(thumbnail, false, abortController);
    updateDatabaseFilePreviewData({
      fileUuid: photo.uuid,
      folderId: photo.folderId,
      previewBlob: thumbnailBlob,
      updatedAt: photo.updatedAt,
    }).catch(errorService.reportError);

    return thumbnailBlob;
  }
}

import { queue, QueueObject } from 'async';
import { getDatabasePhotoThumbnail, updateDatabasePhotoThumbnail } from 'app/drive/services/database.service';
import { downloadThumbnail, getCachedThumbnail } from 'app/drive/services/thumbnail.service';
import errorService from 'services/error.service';
import { Photo, PhotoThumbnail } from '../types';

const MAX_PARALLEL_DOWNLOADS = 6;

interface ThumbnailDownload {
  thumbnail: PhotoThumbnail;
  abortController: AbortController;
}

export class PhotoThumbnailsService {
  public static readonly instance: PhotoThumbnailsService = new PhotoThumbnailsService();

  private readonly downloads: QueueObject<ThumbnailDownload> = queue(
    async ({ thumbnail, abortController }: ThumbnailDownload) => {
      abortController.signal.throwIfAborted();
      return downloadThumbnail(thumbnail, false, abortController);
    },
    MAX_PARALLEL_DOWNLOADS,
  );

  async getThumbnail(photo: Photo, thumbnail: PhotoThumbnail, abortController: AbortController): Promise<Blob> {
    const cachedThumbnail = await getCachedThumbnail(photo, getDatabasePhotoThumbnail);
    if (cachedThumbnail) return cachedThumbnail;

    const thumbnailBlob = await this.downloads.pushAsync<Blob>({ thumbnail, abortController });
    updateDatabasePhotoThumbnail({
      fileId: photo.id,
      previewBlob: thumbnailBlob,
      updatedAt: photo.updatedAt,
    }).catch(errorService.reportError);

    return thumbnailBlob;
  }

  pauseDownloads(): void {
    this.downloads.pause();
  }

  resumeDownloads(): void {
    this.downloads.resume();
  }
}

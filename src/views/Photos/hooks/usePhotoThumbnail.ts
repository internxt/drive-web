import { useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoThumbnailsService } from '../services/photoThumbnails.service';
import { Photo, PhotoThumbnail } from '../types';

export type PhotoThumbnailState = { status: 'loading' } | { status: 'unavailable' } | { status: 'loaded'; url: string };

export const usePhotoThumbnail = (photo: Photo, isNearViewport: boolean): PhotoThumbnailState => {
  const [thumbnail, setThumbnail] = useState<PhotoThumbnailState>(
    photo.thumbnail ? { status: 'loading' } : { status: 'unavailable' },
  );
  const shouldLoad = isNearViewport && thumbnail.status === 'loading';

  useEffect(() => {
    if (!shouldLoad || !photo.thumbnail) return;

    const abortController = new AbortController();

    const loadThumbnail = async (photoThumbnail: PhotoThumbnail) => {
      try {
        const blob = await PhotoThumbnailsService.instance.getThumbnail(photo, photoThumbnail, abortController);
        if (abortController.signal.aborted) return;
        setThumbnail({ status: 'loaded', url: URL.createObjectURL(blob) });
      } catch (error) {
        if (abortController.signal.aborted) return;
        errorService.reportError(error);
        setThumbnail({ status: 'unavailable' });
      }
    };

    void loadThumbnail(photo.thumbnail);

    return () => abortController.abort();
  }, [photo, shouldLoad]);

  useEffect(() => {
    if (thumbnail.status !== 'loaded') return;

    return () => URL.revokeObjectURL(thumbnail.url);
  }, [thumbnail]);

  return thumbnail;
};

import { useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoThumbnailsService } from '../services/photoThumbnails.service';
import { Photo, PhotoThumbnail } from '../types';

export type PhotoThumbnailState = { status: 'loading' } | { status: 'unavailable' } | { status: 'loaded'; url: string };

export const usePhotoThumbnail = (photo: Photo): PhotoThumbnailState => {
  const [thumbnail, setThumbnail] = useState<PhotoThumbnailState>(
    photo.thumbnail ? { status: 'loading' } : { status: 'unavailable' },
  );

  useEffect(() => {
    if (!photo.thumbnail) return;

    const abortController = new AbortController();
    let thumbnailUrl: string | undefined;

    const loadThumbnail = async (photoThumbnail: PhotoThumbnail) => {
      try {
        const blob = await PhotoThumbnailsService.instance.getThumbnail(photo, photoThumbnail, abortController);
        if (abortController.signal.aborted) return;
        thumbnailUrl = URL.createObjectURL(blob);
        setThumbnail({ status: 'loaded', url: thumbnailUrl });
      } catch (error) {
        if (abortController.signal.aborted) return;
        errorService.reportError(error);
        setThumbnail({ status: 'unavailable' });
      }
    };

    void loadThumbnail(photo.thumbnail);

    return () => {
      abortController.abort();
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [photo]);

  return thumbnail;
};

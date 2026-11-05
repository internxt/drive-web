import { useEffect, useState } from 'react';
import errorService from 'services/error.service';
import { PhotoThumbnailsService } from '../services/photoThumbnails.service';
import { Photo, PhotoThumbnail } from '../types';

type PhotoThumbnailState = { status: 'loading' } | { status: 'unavailable' } | { status: 'loaded'; blob: Blob };

export const usePhotoThumbnail = (photo: Photo, isNearViewport: boolean) => {
  const [state, setState] = useState<PhotoThumbnailState>(
    photo.thumbnail ? { status: 'loading' } : { status: 'unavailable' },
  );
  const [thumbnailUrl, setThumbnailUrl] = useState<string>();
  const shouldLoad = isNearViewport && state.status === 'loading';

  useEffect(() => {
    if (!shouldLoad || !photo.thumbnail) return;

    const abortController = new AbortController();

    const loadThumbnail = async (thumbnail: PhotoThumbnail) => {
      try {
        const blob = await PhotoThumbnailsService.instance.getThumbnail(photo, thumbnail, abortController);
        if (abortController.signal.aborted) return;
        setState({ status: 'loaded', blob });
      } catch (error) {
        if (abortController.signal.aborted) return;
        errorService.reportError(error);
        setState({ status: 'unavailable' });
      }
    };

    void loadThumbnail(photo.thumbnail);

    return () => abortController.abort();
  }, [photo, shouldLoad]);

  useEffect(() => {
    if (state.status !== 'loaded') return;

    const blobUrl = URL.createObjectURL(state.blob);
    setThumbnailUrl(blobUrl);

    return () => URL.revokeObjectURL(blobUrl);
  }, [state]);

  return { status: state.status, url: thumbnailUrl };
};

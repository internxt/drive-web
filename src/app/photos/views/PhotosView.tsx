import { PhotoId } from '@internxt/sdk/dist/photos';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Empty from '../../shared/components/Empty/Empty';
import { getPhotoPreview } from 'app/network/download';
import Dialog from '../../shared/components/Dialog/Dialog';
import { RootState } from '../../store';
import { photosSlice, PhotosState, SerializablePhoto } from '../../store/slices/photos';
import photosThunks from '../../store/slices/photos/thunks';
import EmptyPicture from '../../../assets/images/empty-photos.png';
import PhotoThumbnail from '../components/PhotoThumbnail';
import Preview from '../components/Preview';
import ShareDialog from '../components/ShareDialog';
import Skeleton from '../components/Skeleton';
import Toolbar from '../components/Toolbar';
import * as Sentry from '@sentry/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const { translate } = useTranslationContext();
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  useEffect(fetchPhotos, []);

  const [deletePending, setDeletePending] = useState<null | 'selected' | 'preview'>(null);
  const [sharePending, setSharePending] = useState<null | 'selected' | 'preview'>(null);

  useEffect(() => {
    const listener = (e) => {
      if (e.code === 'Escape' && photosState.previewIndex === null && deletePending === null && sharePending === null) {
        dispatch(photosSlice.actions.unselectAll());
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [photosState.previewIndex, deletePending, sharePending]);

  function onConfirmDelete() {
    if (deletePending === 'selected') {
      dispatch(photosThunks.deleteThunk(photosState.selectedItems));
      dispatch(photosSlice.actions.unselectAll());
    } else if (deletePending === 'preview' && photosState.previewIndex !== null) {
      const { items, previewIndex } = photosState;
      const previewIndexIsOutOfBounds = previewIndex > items.length - 2;
      if (previewIndexIsOutOfBounds) {
        dispatch(photosSlice.actions.setPreviewIndex(items.length - 1 > 0 ? previewIndex - 1 : null));
      }

      dispatch(photosThunks.deleteThunk([items[previewIndex].id]));
    }
    setDeletePending(null);
  }

  const showEmpty = !photosState.isLoading && photosState.items.length === 0;

  const showSkeleton = photosState.isLoading && photosState.items.length === 0;

  const numberOfSelectedItems = photosState.selectedItems.length;

  const toolbarProps =
    numberOfSelectedItems !== 0
      ? {
          onDeleteClick: () => setDeletePending('selected'),
          onShareClick: () => setSharePending('selected'),
          onDownloadClick: () => {
            const photos = photosState.selectedItems.map(
              (id) => photosState.items.find((item) => item.id === id) as SerializablePhoto,
            );
            dispatch(photosThunks.downloadThunk(photos));
            dispatch(photosSlice.actions.unselectAll());
          },
          onUnselectClick: () => dispatch(photosSlice.actions.unselectAll()),
        }
      : {};

  return (
    <>
      <div className={`${className} flex h-full w-full flex-col overflow-y-hidden`} data-test="photos-gallery">
        {showEmpty ? (
          <Empty
            title={translate('views.photos.empty.title')}
            subtitle={translate('views.photos.empty.description')}
            icon={
              <img className="h-auto w-72" src={EmptyPicture} draggable="false" alt="Photos used in the Internxt app" />
            }
          />
        ) : (
          <>
            <Toolbar {...toolbarProps} numberOfSelectedItems={numberOfSelectedItems} />
            {showSkeleton ? (
              <Skeleton />
            ) : (
              <Grid
                selected={photosState.selectedItems}
                photos={photosState.items}
                isMorePhotos={photosState.thereIsMore}
                onUserScrolledToTheEnd={fetchPhotos}
              />
            )}
          </>
        )}
      </div>
      <Preview
        onDeleteClick={() => setDeletePending('preview')}
        onShareClick={() => setSharePending('preview')}
        onDownloadClick={() =>
          photosState.previewIndex !== null &&
          dispatch(photosThunks.downloadThunk([photosState.items[photosState.previewIndex]]))
        }
        onClose={() => {
          if (photosState.previewIndex !== null && deletePending === null && sharePending === null)
            dispatch(photosSlice.actions.setPreviewIndex(null));
        }}
      />
      {/* These dialogs are duplicated to avoid flickering while using headless ui transitions */}
      <Dialog
        onClose={() => setDeletePending(null)}
        onPrimaryAction={onConfirmDelete}
        isOpen={deletePending === 'selected'}
        title={
          numberOfSelectedItems > 1
            ? translate('modals.deletePhotosModal.multiTitle', { item: numberOfSelectedItems })
            : translate('modals.deletePhotosModal.singleTitle', { item: numberOfSelectedItems })
        }
        subtitle={translate('modals.deletePhotosModal.subtitle')}
        onSecondaryAction={() => setDeletePending(null)}
        primaryAction={translate('modals.deletePhotosModal.buttons.delete')}
        secondaryAction={translate('modals.deletePhotosModal.buttons.cancel')}
        primaryActionColor="danger"
      />
      <Dialog
        onClose={() => setDeletePending(null)}
        onPrimaryAction={onConfirmDelete}
        isOpen={deletePending === 'preview'}
        title="Delete this item?"
        subtitle={translate('modals.deletePhotosModal.subtitle')}
        onSecondaryAction={() => setDeletePending(null)}
        primaryAction="Delete"
        secondaryAction="Cancel"
        primaryActionColor="danger"
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'selected'}
        photos={photosState.selectedItems}
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'preview'}
        photos={photosState.previewIndex !== null ? [photosState.items[photosState.previewIndex].id] : []}
      />
    </>
  );
}

function Grid({
  photos,
  selected,
  isMorePhotos,
  onUserScrolledToTheEnd,
}: {
  photos: SerializablePhoto[];
  selected: PhotoId[];
  isMorePhotos: boolean;
  onUserScrolledToTheEnd: () => void;
}) {
  const dispatch = useDispatch();

  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = (entries) => {
      const element = entries[0];
      if (element.isIntersecting) {
        onUserScrolledToTheEnd();
      }
    };

    const observer = new IntersectionObserver(onScroll, {
      rootMargin: '200px',
    });

    elementRef.current && observer.observe(elementRef.current as Element);

    return () => observer.disconnect();
  }, [photos]);

  return (
    <div className="overflow-y-auto">
      <div
        className="grid gap-1 px-5"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
        data-test="photos-grid"
      >
        {photos.map((photo, i) => {
          const isSelected = selected.some((el) => photo.id === el);
          const thereAreSelected = selected.length > 0;
          function onSelect() {
            dispatch(photosSlice.actions.toggleSelect(photo.id));
          }
          return (
            <PhotoItem
              onClick={() => {
                if (thereAreSelected) {
                  onSelect();
                } else {
                  dispatch(photosSlice.actions.setPreviewIndex(i));
                }
              }}
              onSelect={onSelect}
              selected={isSelected}
              photo={photo}
              key={photo.id}
              photoId={photo.id}
            />
          );
        })}
      </div>
      <div className="mt-1" ref={elementRef}>
        {isMorePhotos && <Skeleton />}
      </div>
    </div>
  );
}

function PhotoItem({
  onClick,
  onSelect,
  selected,
  photo,
  photoId,
}: {
  onClick: () => void;
  onSelect: () => void;
  selected: boolean;
  photo: SerializablePhoto;
  photoId: string;
}) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const bucketId = useSelector<RootState, string | undefined>((state) => state.photos.bucketId);

  useEffect(() => {
    const photoBucketId = photo.networkBucketId ? photo.networkBucketId : bucketId;
    if (photoBucketId) {
      getPhotoPreview({
        photo,
        bucketId: photoBucketId,
      })
        .then(setSrc)
        .catch((err) => {
          Sentry.captureException(err, {
            extra: {
              photoId: photo.id,
              bucketId: photoBucketId,
            },
          });
        });
    }
  }, []);

  return <PhotoThumbnail onClick={onClick} onSelect={onSelect} selected={selected} src={src} photoId={photoId} />;
}

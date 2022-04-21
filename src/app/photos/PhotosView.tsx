import { PhotoId, PhotoWithDownloadLink } from '@internxt/sdk/dist/photos';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPhotoPreview } from '../drive/services/network.service/download';
import { RootState } from '../store';
import { photosSlice, PhotosState } from '../store/slices/photos';
import photosThunks from '../store/slices/photos/thunks';
import DeletePhotosDialog from './DeletePhotosDialog';
import Empty from './Empty';
import PhotoThumbnail from './PhotoThumbnail';
import Preview from './Preview';
import ShareDialog from './ShareDialog';
import Skeleton from './Skeleton';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  useEffect(fetchPhotos, []);

  useEffect(() => {
    const listener = (e) => {
      if (e.code === 'Escape' && photosState.previewIndex === null) {
        dispatch(photosSlice.actions.unselectAll());
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [photosState.previewIndex]);

  const [deletePending, setDeletePending] = useState<null | 'selected' | 'preview'>(null);
  const [sharePending, setSharePending] = useState<null | 'selected' | 'preview'>(null);

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

  const toolbarProps =
    photosState.selectedItems.length === 0
      ? {}
      : {
          onDeleteClick: () => setDeletePending('selected'),
          onShareClick: () => setSharePending('selected'),
          onDownloadClick: () => {
            const photos = photosState.selectedItems.map((id) => photosState.items.find((item) => item.id === id)!);
            dispatch(photosThunks.downloadThunk(photos));
            dispatch(photosSlice.actions.unselectAll());
          },
          onUnselectClick: () => dispatch(photosSlice.actions.unselectAll()),
        };

  return (
    <>
      <div className={`${className} h-full w-full ${showSkeleton ? 'overflow-y-hidden' : 'overflow-y-auto'} px-5 pt-2`}>
        {showEmpty ? (
          <Empty />
        ) : (
          <>
            <Toolbar {...toolbarProps} numberOfSelectedItems={photosState.selectedItems.length} />
            {showSkeleton ? (
              <Skeleton />
            ) : (
              <Grid
                selected={photosState.selectedItems}
                photos={photosState.items}
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
          photosState.previewIndex &&
          dispatch(photosThunks.downloadThunk([photosState.items[photosState.previewIndex]]))
        }
      />
      {/* These dialogs are duplicated to avoid flickering while using headless ui transitions */}
      <DeletePhotosDialog
        onClose={() => setDeletePending(null)}
        onConfirm={onConfirmDelete}
        isOpen={deletePending === 'selected'}
        numberOfSelectedItems={photosState.selectedItems.length}
      />
      <DeletePhotosDialog
        onClose={() => setDeletePending(null)}
        onConfirm={onConfirmDelete}
        isOpen={deletePending === 'preview'}
        numberOfSelectedItems={1}
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'selected'}
        photos={photosState.selectedItems}
      />
      <ShareDialog
        onClose={() => setSharePending(null)}
        isOpen={sharePending === 'preview'}
        photos={photosState.previewIndex !== null ? [photosState.items[photosState.previewIndex!].id] : []}
      />
    </>
  );
}

function Grid({
  photos,
  selected,
  onUserScrolledToTheEnd,
}: {
  photos: PhotoWithDownloadLink[];
  selected: PhotoId[];
  onUserScrolledToTheEnd: () => void;
}) {
  const dispatch = useDispatch();

  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const options = {};

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];

      if (entry.isIntersecting) {
        onUserScrolledToTheEnd();
      }
    }, options);

    const lastChild = listRef.current?.lastElementChild;

    if (lastChild) observer.observe(lastChild as Element);

    return () => observer.disconnect();
  }, [photos]);

  return (
    <div
      className="mt-2 mb-5 grid gap-1"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      ref={listRef}
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
          />
        );
      })}
    </div>
  );
}

function PhotoItem({
  onClick,
  onSelect,
  selected,
  photo,
}: {
  onClick: () => void;
  onSelect: () => void;
  selected: boolean;
  photo: PhotoWithDownloadLink;
}) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const bucketId = useSelector<RootState, string>((state) => state.photos.bucketId!);

  useEffect(() => {
    getPhotoPreview({
      photo,
      bucketId,
    }).then(setSrc);
  }, []);

  return <PhotoThumbnail onClick={onClick} onSelect={onSelect} selected={selected} src={src} />;
}

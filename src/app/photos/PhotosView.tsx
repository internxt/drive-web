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
import Skeleton from './Skeleton';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  useEffect(fetchPhotos, []);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  function onConfirmDelete() {
    setShowDeleteDialog(false);
    dispatch(photosThunks.deleteThunk());
  }

  const showEmpty = !photosState.isLoading && photosState.items.length === 0;

  const showSkeleton = photosState.isLoading && photosState.items.length === 0;

  const toolbarProps =
    photosState.selectedItems.length === 0
      ? {}
      : {
          onDeleteClick: () => setShowDeleteDialog(true),
          onShareClick: () => undefined,
          onDownloadClick: () => undefined,
          onUnselectClick: () => dispatch(photosSlice.actions.unselectAll()),
        };

  return (
    <>
      <div className={`${className} h-full w-full ${showSkeleton ? 'overflow-y-hidden' : 'overflow-y-auto'} px-5 pt-2`}>
        <Toolbar {...toolbarProps} numberOfSelectedItems={photosState.selectedItems.length} />
        {showEmpty ? (
          <Empty />
        ) : showSkeleton ? (
          <Skeleton />
        ) : (
          <Grid selected={photosState.selectedItems} photos={photosState.items} onUserScrolledToTheEnd={fetchPhotos} />
        )}
      </div>
      <DeletePhotosDialog
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={onConfirmDelete}
        isOpen={showDeleteDialog}
        numberOfSelectedItems={photosState.selectedItems.length}
      />
      <Preview />
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
      className="mt-2 grid gap-1"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      ref={listRef}
    >
      {photos.map((photo, i) => {
        const isSelected = selected.some((el) => photo.id === el);

        return (
          <PhotoItem
            onClick={() => dispatch(photosSlice.actions.setPreviewIndex(i))}
            onSelect={() => dispatch(photosSlice.actions.toggleSelect(photo.id))}
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

import { PhotoId, PhotoWithDownloadLink } from '@internxt/sdk/dist/photos';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getPhotoPreview } from '../drive/services/network.service/download';
import { RootState } from '../store';
import { photosSlice, PhotosState } from '../store/slices/photos';
import photosThunks from '../store/slices/photos/thunks';
import Empty from './Empty';
import PhotoThumbnail from './PhotoThumbnail';
import Toolbar from './Toolbar';

export default function PhotosView({ className = '' }: { className?: string }): JSX.Element {
  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);

  function fetchPhotos() {
    dispatch(photosThunks.fetchThunk());
  }

  useEffect(fetchPhotos, []);

  return (
    <div className={`${className} h-full w-full overflow-y-auto px-5 pt-2`}>
      <Toolbar onDeleteClick={console.log} onDownloadClick={console.log} onShareClick={console.log} />
      {!photosState.isLoading && photosState.items.length === 0 ? (
        <Empty />
      ) : (
        <Grid selected={photosState.selectedItems} photos={photosState.items} onUserScrolledToTheEnd={fetchPhotos} />
      )}
    </div>
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
      {photos.map((photo) => {
        const isSelected = selected.some((el) => photo.id === el);

        return (
          <PhotoItem
            onClick={() => console.log('Clicked')}
            onSelect={() => dispatch(photosSlice.actions.toggleSelect(photo.id))}
            selected={isSelected}
            downloadLink={photo.previewLink}
            index={photo.previewIndex}
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
  downloadLink,
  index,
}: {
  onClick: () => void;
  onSelect: () => void;
  selected: boolean;
  downloadLink: string;
  index: string;
}) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const mnemonic = useSelector<RootState, string>((state) => state.user.user!.mnemonic);
  const bucketId = useSelector<RootState, string>((state) => state.photos.bucketId!);

  useEffect(() => {
    getPhotoPreview({
      link: downloadLink,
      index,
      bucketId,
      mnemonic,
    }).then(setSrc);
  }, []);

  return <PhotoThumbnail onClick={onClick} onSelect={onSelect} selected={selected} src={src} />;
}

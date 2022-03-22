import { Photo, PhotoId } from '@internxt/sdk/dist/photos';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  photos: Photo[];
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
          <PhotoThumbnail
            onClick={() => console.log('Clicked')}
            onSelect={() => dispatch(photosSlice.actions.toggleSelect(photo.id))}
            selected={isSelected}
            src="https://source.unsplash.com/random"
            key={photo.id}
          />
        );
      })}
    </div>
  );
}

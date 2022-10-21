import { PhotoId } from '@internxt/sdk/dist/photos';
import { getPhotoPreview } from 'app/network/download';
import { RootState } from 'app/store';
import { SerializablePhoto } from 'app/store/slices/photos';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import PhotoThumbnail from './PhotoThumbnail';

type GridProps = {
  photos: SerializablePhoto[];
  selected: PhotoId[];
  onUserScrolledToTheEnd: () => void;
  setPreviewIndex: (index: number) => void;
  toggleSelect: (id: string) => void;
};

export function Grid({
  photos,
  selected,
  onUserScrolledToTheEnd,
  setPreviewIndex,
  toggleSelect,
}: GridProps): JSX.Element {
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
      className="grid gap-1 overflow-y-auto px-5"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
      ref={listRef}
    >
      {photos.map((photo, i) => {
        const isSelected = selected.some((el) => photo.id === el);
        const thereAreSelected = selected.length > 0;
        function onSelect() {
          toggleSelect(photo.id);
        }
        return (
          <PhotoItem
            onClick={() => {
              if (thereAreSelected) {
                onSelect();
              } else {
                setPreviewIndex(i);
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
  photo: SerializablePhoto;
}) {
  const [src, setSrc] = useState<string | undefined>(undefined);
  const bucketId = useSelector<RootState, string | undefined>((state) => state.photos.bucketId);

  useEffect(() => {
    if (bucketId) {
      getPhotoPreview({
        photo,
        bucketId,
      }).then(setSrc);
    }
  }, []);

  return <PhotoThumbnail onClick={onClick} onSelect={onSelect} selected={selected} src={src} />;
}

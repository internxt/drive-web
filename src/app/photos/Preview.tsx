import { DownloadSimple, Share, Trash, X } from 'phosphor-react';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useEffectAsync from '../core/hooks/useEffectAsync';
import { getPhotoPreview, getPhotoSource } from '../drive/services/network.service/download';
import { RootState } from '../store';
import { photosSlice, PhotosState } from '../store/slices/photos';

export default function Preview(): JSX.Element {
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);
  const { previewIndex } = photosState;
  const bucketId = useSelector<RootState, string>((state) => state.photos.bucketId!);
  const dispatch = useDispatch();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    if (previewIndex !== null) {
      const photo = photosState.items[previewIndex];
      getPhotoPreview({
        photo,
        bucketId,
      }).then(setPreviewSrc);
    } else {
      setPreviewSrc(null);
    }
  }, [previewIndex]);

  const [src, setSrc] = useState<string | null>(null);

  useEffectAsync(async () => {
    if (previewIndex !== null) {
      const photo = photosState.items[previewIndex];
      const [srcPromise, actionState] = await getPhotoSource({ photo, bucketId });
      srcPromise.then(setSrc);
      return () => actionState?.stop();
    } else {
      setSrc(null);
    }
  }, [previewIndex]);

  return (
    <div className={`absolute inset-0 isolate bg-black ${photosState.previewIndex === null ? 'hidden' : 'block'}`}>
      <div className="absolute top-0 z-10 flex w-full items-center justify-between bg-transparent p-5">
        <Icon Target={X} onClick={() => dispatch(photosSlice.actions.setPreviewIndex(null))} />
        <div className="flex">
          <Icon Target={DownloadSimple} onClick={console.log} />
          <Icon Target={Share} onClick={console.log} />
          <Icon Target={Trash} onClick={console.log} />
        </div>
      </div>
      {src ? (
        <img className="absolute inset-0 h-full w-full object-contain" src={src} />
      ) : (
        <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform">
          <img
            className={`h-64 w-64 rounded-xl object-cover ${previewSrc ? '' : 'opacity-0'}`}
            src={previewSrc ?? ''}
          />
          <div className="mt-4 flex items-center justify-center text-lg font-medium text-gray-20">
            <Spinner />
            <p className="ml-3">Loading...</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Icon({ Target, onClick }: { Target: typeof DownloadSimple; onClick?: () => void }) {
  return (
    <div
      className={`${
        onClick ? 'cursor-pointer text-white hover:opacity-75' : 'text-gray-40'
      } flex h-10 w-10 items-center justify-center rounded-lg `}
      onClick={onClick}
    >
      <Target size={24} />
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      fill="none"
      viewBox="0 0 14 14"
    >
      <path stroke="#D1D1D7" strokeWidth="2.333" d="M7 12.834A5.833 5.833 0 107 1.167a5.833 5.833 0 000 11.667z"></path>
      <path
        fill="#000"
        d="M2.333 7A4.667 4.667 0 017 2.333V0a7 7 0 00-7 7h2.333zM3.5 10.086A4.644 4.644 0 012.333 7H0a6.98 6.98 0 001.75 4.63l1.75-1.544z"
      ></path>
    </svg>
  );
}

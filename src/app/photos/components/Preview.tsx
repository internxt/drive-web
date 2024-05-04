import { Transition } from '@headlessui/react';
import { PhotosItemType } from '@internxt/sdk/dist/photos';
import { CaretLeft, DownloadSimple, Share, X } from '@phosphor-icons/react';
import * as Sentry from '@sentry/react';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { getPhotoBlob, getPhotoPreview } from 'app/network/download';
import { Fragment, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import useIdle from '../../core/hooks/useIdle';
import { RootState } from '../../store';
import { PhotosState, photosSlice } from '../../store/slices/photos';

export default function Preview({
  onDownloadClick,
  onDeleteClick,
  onShareClick,
  onClose,
}: {
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
  onClose: () => void;
}): JSX.Element {
  const { translate } = useTranslationContext();
  const MS_TO_BE_IDLE = 5000;
  const isIdle = useIdle(MS_TO_BE_IDLE);

  const dispatch = useDispatch();
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);
  const { previewIndex, items } = photosState;
  const bucketId = useSelector<RootState, string | undefined>((state) => state.photos.bucketId);

  const [thumbnailSrc, setThumbnailSrc] = useState<string | null>(null);

  useEffect(() => {
    if (previewIndex === null) return;
    setThumbnailSrc(null);
    const photo = items[previewIndex];
    const photoBucketId = photo.networkBucketId ? photo.networkBucketId : bucketId;
    if (!photoBucketId) return;

    getPhotoPreview({
      photo,
      bucketId: photoBucketId,
    })
      .then(setThumbnailSrc)
      .catch((err) => {
        Sentry.captureException(err, {
          extra: {
            photoId: photo.id,
            bucketId: photoBucketId,
          },
        });
      });
  }, [previewIndex, items]);

  const [src, setSrc] = useState<string | null>(null);
  const [itemType, setItemType] = useState<PhotosItemType>(PhotosItemType.PHOTO);

  useEffect(() => {
    if (previewIndex === null) return;

    setSrc(null);

    const abortController = new AbortController();
    const photo = items[previewIndex];
    const photoBucketId = photo.networkBucketId ? photo.networkBucketId : bucketId;
    if (!photoBucketId) return;

    getPhotoBlob({ photo, bucketId: photoBucketId, abortController })
      .then((blob) => {
        setItemType(photo.itemType);
        return setSrc(URL.createObjectURL(blob));
      })
      .catch((err) => {
        if (abortController.signal.aborted) {
          return;
        }

        Sentry.captureException(err, {
          extra: {
            photoId: photo.id,
            bucketId: photoBucketId,
          },
        });
      });

    return () => {
      abortController.abort();
    };
  }, [previewIndex, items]);

  const canGoRight = previewIndex !== null && previewIndex < photosState.items.length - 1;
  const canGoLeft = previewIndex !== null && previewIndex > 0;

  function goRight() {
    if (previewIndex !== null) dispatch(photosSlice.actions.setPreviewIndex(previewIndex + 1));
  }
  function goLeft() {
    if (previewIndex !== null) dispatch(photosSlice.actions.setPreviewIndex(previewIndex - 1));
  }

  useEffect(() => {
    const listener = (event) => {
      if (previewIndex !== null) {
        const { code } = event;
        if (code === 'ArrowLeft' && canGoLeft) {
          goLeft();
        } else if (code === 'ArrowRight' && canGoRight) {
          goRight();
        } else if (code === 'Escape') {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [previewIndex, onClose]);

  return (
    <Transition
      as={Fragment}
      show={photosState.previewIndex !== null}
      enter="origin-center overflow-hidden transition-all duration-100 ease-out"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="origin-center overflow-hidden transition-all duration-100 ease-in"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className="absolute inset-0 isolate z-50" data-test="photos-preview">
        <Transition.Child
          as={Fragment}
          enter="transition-all duration-200 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-all duration-100 ease-in"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 h-screen w-screen bg-black" />
        </Transition.Child>
        <Toolbar
          onDeleteClick={onDeleteClick}
          onDownloadClick={onDownloadClick}
          onExit={onClose}
          onShareClick={onShareClick}
          isIdle={isIdle}
        />
        {src ? (
          <Transition.Child
            as={Fragment}
            enter="transition-all will-change duration-50 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
          >
            {itemType === PhotosItemType.VIDEO ? (
              <video className="will-change absolute inset-0 h-full w-full object-contain" controls src={src} />
            ) : (
              <img className="will-change absolute inset-0 h-full w-full object-contain" draggable="false" src={src} />
            )}
          </Transition.Child>
        ) : (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {thumbnailSrc && <img className="h-64 w-64 rounded-xl object-cover" src={thumbnailSrc} />}
            <div className="mt-4 flex items-center justify-center text-lg font-medium text-gray-20">
              <Spinner />
              <p className="ml-3">{translate('general.loading.default')}</p>
            </div>
          </div>
        )}
        <Arrows
          className="absolute top-1/2 -translate-y-1/2"
          hideLeft={!canGoLeft}
          hideRight={!canGoRight}
          onClickLeft={goLeft}
          onClickRight={goRight}
          isIdle={isIdle}
        />
      </div>
    </Transition>
  );
}

function Toolbar({
  onDownloadClick,
  onDeleteClick,
  onShareClick,
  onExit,
  isIdle,
}: {
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
  onExit?: () => void;
  isIdle: boolean;
}) {
  return (
    <Transition
      enter="ease-out duration-10"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={!isIdle}
    >
      <div className="absolute top-0 z-10 flex h-32 w-full items-start justify-between bg-gradient-to-b from-black/75 to-transparent p-5">
        <TopIcon Target={X} onClick={onExit} />
        <div className="flex">
          <TopIcon Target={DownloadSimple} onClick={onDownloadClick} />
          <TopIcon Target={Share} onClick={onShareClick} />
        </div>
      </div>
    </Transition>
  );
}

function TopIcon({ Target, onClick }: { Target: typeof DownloadSimple; onClick?: () => void }) {
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

function Arrows({
  onClickLeft,
  onClickRight,
  hideLeft,
  hideRight,
  className,
  isIdle,
}: {
  className: string;
  onClickLeft: () => void;
  onClickRight: () => void;
  hideLeft: boolean;
  hideRight: boolean;
  isIdle: boolean;
}) {
  return (
    <Transition
      enter="ease-out duration-10"
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave="ease-in duration-200"
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      show={!isIdle}
    >
      <div className={`${className} flex w-full justify-between px-10`}>
        {hideLeft ? <div /> : <Arrow pointsTo="left" onClick={onClickLeft} />}
        {hideRight ? <div /> : <Arrow pointsTo="right" onClick={onClickRight} />}
      </div>
    </Transition>
  );
}

function Arrow({
  className = '',
  pointsTo,
  onClick,
}: {
  className?: string;
  pointsTo: 'left' | 'right';
  onClick: () => void;
}) {
  return (
    <div
      className={`${className} flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-black/50 text-white backdrop-blur`}
      onClick={onClick}
    >
      <CaretLeft size={40} className={pointsTo === 'right' ? ' rotate-180' : ''} />
    </div>
  );
}

import { ActionState } from '@internxt/inxt-js/build/api';
import { CaretLeft, DownloadSimple, Share, Trash, X } from 'phosphor-react';
import { useState, useEffect, Fragment } from 'react';
import { Transition } from '@headlessui/react';
import { useDispatch, useSelector } from 'react-redux';
import { getPhotoBlob, getPhotoPreview } from '../drive/services/network.service/download';
import { RootState } from '../store';
import { photosSlice, PhotosState } from '../store/slices/photos';
import _ from 'lodash';

export default function Preview({
  onDownloadClick,
  onDeleteClick,
  onShareClick,
}: {
  onDownloadClick?: () => void;
  onShareClick?: () => void;
  onDeleteClick?: () => void;
}): JSX.Element {
  const photosState = useSelector<RootState, PhotosState>((state) => state.photos);
  const { previewIndex, items } = photosState;
  const bucketId = useSelector<RootState, string | undefined>((state) => state.photos.bucketId);
  const dispatch = useDispatch();

  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  useEffect(() => {
    setPreviewSrc(null);
    if (previewIndex !== null && bucketId) {
      const photo = items[previewIndex];
      getPhotoPreview({
        photo,
        bucketId,
      }).then(setPreviewSrc);
    }
  }, [previewIndex, items]);

  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    setSrc(null);
    if (previewIndex !== null && bucketId) {
      let actionState: ActionState | undefined;
      const photo = items[previewIndex];
      getPhotoBlob({ photo, bucketId })
        .then(([blobPromise, srcActionState]) => {
          actionState = srcActionState;
          return blobPromise;
        })
        .then((blob) => setSrc(URL.createObjectURL(blob)))
        .catch(console.log);
      return () => {
        actionState?.stop();
      };
    }
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
          dispatch(photosSlice.actions.setPreviewIndex(null));
        }
      }
    };
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [previewIndex]);

  return (
    <Transition
      as={Fragment}
      show={photosState.previewIndex !== null}
      enter="transform origin-center overflow-hidden transition-all duration-100 ease-out"
      enterFrom="opacity-0 scale-95"
      enterTo="opacity-100 scale-100"
      leave="transform origin-center overflow-hidden transition-all duration-100 ease-in"
      leaveFrom="opacity-100 scale-100"
      leaveTo="opacity-0 scale-95"
    >
      <div className="absolute inset-0 isolate">
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

        <div className="absolute top-0 z-10 flex h-32 w-full items-start justify-between bg-gradient-to-b from-black-75 to-transparent p-5">
          <Icon Target={X} onClick={() => dispatch(photosSlice.actions.setPreviewIndex(null))} />
          <div className="flex">
            <Icon Target={DownloadSimple} onClick={onDownloadClick} />
            <Icon Target={Share} onClick={onShareClick} />
            <Icon Target={Trash} onClick={onDeleteClick} />
          </div>
        </div>
        {src ? (
          <Transition.Child
            as={Fragment}
            enter="transition-all will-change duration-50 ease-out"
            enterFrom="opacity-0"
            enterTo="opacity-100"
          >
            <img className="will-change absolute inset-0 h-full w-full object-contain" draggable="false" src={src} />
          </Transition.Child>
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-y-1/2 -translate-x-1/2 transform">
            {previewSrc && <img className="h-64 w-64 rounded-xl object-cover" src={previewSrc} />}
            <div className="mt-4 flex items-center justify-center text-lg font-medium text-gray-20">
              <Spinner />
              <p className="ml-3">Loading...</p>
            </div>
          </div>
        )}
        <Arrows
          className="absolute top-1/2 -translate-y-1/2"
          hideLeft={!canGoLeft}
          hideRight={!canGoRight}
          onClickLeft={goLeft}
          onClickRight={goRight}
        />
      </div>
    </Transition>
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

function Arrows({
  onClickLeft,
  onClickRight,
  hideLeft,
  hideRight,
  className,
}: {
  className: string;
  onClickLeft: () => void;
  onClickRight: () => void;
  hideLeft: boolean;
  hideRight: boolean;
}) {
  const MS_TO_BE_IDLE = 5000;

  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let timeout;

    function setUpTimeout() {
      timeout = setTimeout(() => {
        setIsIdle(true);
      }, MS_TO_BE_IDLE);
    }

    function listener() {
      setIsIdle(false);
      if (timeout) clearTimeout(timeout);
      setUpTimeout();
    }

    const throttledListener = _.throttle(listener, 100);

    document.addEventListener('mousemove', throttledListener);
    document.addEventListener('keydown', throttledListener);

    setUpTimeout();

    return () => {
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('mousemove', throttledListener);
      document.removeEventListener('keydown', throttledListener);
    };
  }, []);

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
      className={`${className} flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-black bg-opacity-50 text-white backdrop-blur backdrop-filter`}
      onClick={onClick}
    >
      <CaretLeft size={40} className={pointsTo === 'right' ? ' rotate-180 transform' : ''} />
    </div>
  );
}

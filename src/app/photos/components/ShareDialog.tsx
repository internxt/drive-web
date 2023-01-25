import { PhotoId } from '@internxt/sdk/dist/photos';
import { Copy, Link, XCircle } from 'phosphor-react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { SdkFactory } from '../../core/factory/sdk';
import i18n from '../../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { RootState } from '../../store';
import crypto from 'crypto';
import { useAppSelector } from '../../store/hooks';
import { aes } from '@internxt/lib';
import { Network } from '../../drive/services/network.service';
import { Transition } from '@headlessui/react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export default function ShareDialog({
  onClose,
  photos,
  isOpen,
}: {
  onClose: () => void;
  photos: PhotoId[];
  isOpen: boolean;
}): JSX.Element {
  useEffect(() => {
    if (!isOpen) return;

    const listener = (e) => {
      if (e.code === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [isOpen]);

  const numberOfSelectedItems = photos.length;

  const DEFAULT_VIEWS = 10;
  const DEFAULT_STATUS = { tag: 'ready' } as const;

  const [views, setViews] = useState(DEFAULT_VIEWS);
  const [status, setStatus] = useState<{ tag: 'ready' } | { tag: 'loading' } | { tag: 'done'; link: string }>(
    DEFAULT_STATUS,
  );

  function goBackToStart() {
    setViews(DEFAULT_VIEWS);
    setStatus(DEFAULT_STATUS);
  }

  useEffect(() => {
    if (isOpen) {
      goBackToStart();
    }
  }, [isOpen]);

  const bucket = useSelector<RootState, string | undefined>((state) => state.photos.bucketId);
  const { mnemonic, email, userId } = useAppSelector((state) => state.user.user) as UserSettings;

  async function onCreateShare() {
    if (bucket) {
      setStatus({ tag: 'loading' });

      const network = new Network(email, userId, mnemonic);
      const token = await network.createFileToken(bucket, '', 'PULL');

      const { shares } = await SdkFactory.getInstance().createPhotosClient();

      const code = crypto.randomBytes(32).toString('hex');
      const encryptedMnemonic = aes.encrypt(mnemonic, code);
      const share = await shares.createShare({ bucket, encryptedMnemonic, photoIds: photos, token, views });

      const link = `${window.location.origin}/sh/photos/${share.id}/${code}`;

      setStatus({ tag: 'done', link });
    }
  }

  function onCopy() {
    if (status.tag === 'done') {
      navigator.clipboard.writeText(status.link);
      notificationsService.show({ text: i18n.get('success.linkCopied'), type: ToastType.Success });
      onClose();
    }
  }

  return (
    <Transition show={isOpen}>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        className={'absolute inset-0 bg-black bg-opacity-40'}
        onClick={onClose}
      ></Transition.Child>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-3 text-center"
      >
        <XCircle
          className="absolute top-2 right-2 cursor-pointer text-gray-20"
          onClick={onClose}
          weight="fill"
          size={24}
        />
        <h1 className="mt-4 text-xl font-semibold text-gray-80">
          {numberOfSelectedItems > 1
            ? i18n.get('modals.sharePhotosModal.multiTitle', { item: numberOfSelectedItems })
            : i18n.get('modals.sharePhotosModal.singleTitle', { item: numberOfSelectedItems })}
        </h1>
        <p className="mt-3 ml-5 text-left font-medium text-gray-80">{i18n.get('modals.sharePhotosModal.options')}</p>
        <div className="mt-1 rounded-lg bg-gray-5 p-4 text-left">
          <div className="flex font-medium text-gray-80">
            <p>{i18n.get('modals.sharePhotosModal.openCount')}</p>
            <input
              disabled={status.tag !== 'ready'}
              className="outline-none mx-2 inline-block w-12 rounded-md border border-transparent bg-white px-1 font-medium text-gray-80 focus:border-primary-dark focus:ring-2 focus:ring-primary focus:ring-opacity-10 disabled:bg-gray-10"
              style={{ textAlign: 'right' }}
              type="number"
              value={views}
              onChange={(e) => setViews(parseInt(e.target.value))}
            />
            <p>{i18n.get('modals.sharePhotosModal.times')}</p>
            {status.tag === 'done' && (
              <button className="ml-4 text-sm font-medium text-primary" onClick={goBackToStart}>
                {i18n.get('modals.sharePhotosModal.change')}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-40">{i18n.get('modals.sharePhotosModal.limit')}</p>
        </div>
        <div className="mt-3 flex h-10 space-x-2">
          {status.tag === 'ready' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-gray-5 font-medium text-gray-80 active:bg-gray-10"
              >
                {i18n.get('modals.sharePhotosModal.buttons.cancel')}
              </button>
              <button
                onClick={onCreateShare}
                className="flex flex-1 items-center justify-center rounded-lg bg-primary font-medium text-white active:bg-primary-dark"
              >
                <p>{i18n.get('modals.sharePhotosModal.buttons.create')}</p> <Link className="ml-3" size={20} />
              </button>
            </>
          ) : status.tag === 'loading' ? (
            <button disabled className="flex-1 rounded-lg bg-gray-5 font-medium text-gray-80 active:bg-gray-10">
              {i18n.get('modals.sharePhotosModal.buttons.creating')}
            </button>
          ) : (
            <button
              onClick={onCopy}
              className="flex flex-1 items-center justify-center rounded-lg bg-primary font-medium text-white active:bg-primary-dark"
            >
              <p>{i18n.get('modals.sharePhotosModal.buttons.copyLink')}</p> <Copy className="ml-3" size={20} />
            </button>
          )}
        </div>
      </Transition.Child>
    </Transition>
  );
}

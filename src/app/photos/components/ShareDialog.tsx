import { PhotoId } from '@internxt/sdk/dist/photos';
import { Copy, Link, XCircle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { SdkFactory } from '../../core/factory/sdk';
import notificationsService, { ToastType } from '../../notifications/services/notifications.service';
import { RootState } from '../../store';
import crypto from 'crypto';
import { useAppSelector } from '../../store/hooks';
import { aes } from '@internxt/lib';
import { Network } from '../../drive/services/network.service';
import { Transition } from '@headlessui/react';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import Button from 'app/shared/components/Button/Button';

export default function ShareDialog({
  onClose,
  photos,
  isOpen,
  zIndex,
}: {
  onClose: () => void;
  photos: PhotoId[];
  isOpen: boolean;
  zIndex?: number;
}): JSX.Element {
  const { translate } = useTranslationContext();

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
      notificationsService.show({ text: translate('success.linkCopied'), type: ToastType.Success });
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
        style={{
          zIndex,
        }}
        className={'absolute inset-0 bg-black/40'}
        onClick={onClose}
      ></Transition.Child>
      <Transition.Child
        enter="ease-out duration-150"
        enterFrom="opacity-0 scale-95"
        enterTo="opacity-100 scale-100"
        leave="ease-in duration-100"
        leaveFrom="opacity-100 scale-100"
        leaveTo="opacity-0 scale-95"
        style={{
          zIndex,
        }}
        className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface p-3 text-center dark:bg-gray-1"
      >
        <XCircle
          className="absolute right-2 top-2 cursor-pointer text-gray-20"
          onClick={onClose}
          weight="fill"
          size={24}
        />
        <h1 className="mt-4 text-xl font-semibold text-gray-100">
          {numberOfSelectedItems > 1
            ? translate('modals.sharePhotosModal.multiTitle', { item: numberOfSelectedItems })
            : translate('modals.sharePhotosModal.singleTitle', { item: numberOfSelectedItems })}
        </h1>
        <p className="ml-5 mt-3 text-left font-medium text-gray-80">{translate('modals.sharePhotosModal.options')}</p>
        <div className="mt-1 rounded-lg bg-gray-5 p-4 text-left">
          <div className="flex font-medium text-gray-100">
            <p>{translate('modals.sharePhotosModal.openCount')}</p>
            <input
              disabled={status.tag !== 'ready'}
              className="mx-2 inline-block w-12 rounded-md border border-transparent bg-surface px-1 font-medium text-gray-100 outline-none focus:border-primary-dark focus:ring-2 focus:ring-primary focus:ring-primary/10 disabled:bg-gray-10 dark:bg-gray-20"
              style={{ textAlign: 'right' }}
              type="number"
              value={views}
              onChange={(e) => setViews(parseInt(e.target.value))}
            />
            <p>{translate('modals.sharePhotosModal.times')}</p>
            {status.tag === 'done' && (
              <button className="ml-4 text-sm font-medium text-primary" onClick={goBackToStart}>
                {translate('modals.sharePhotosModal.change')}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-40">{translate('modals.sharePhotosModal.limit')}</p>
        </div>
        <div className="mt-3 flex h-10 space-x-2">
          {status.tag === 'ready' ? (
            <>
              <Button variant="secondary" className="flex-1" onClick={onClose}>
                {translate('modals.sharePhotosModal.buttons.cancel')}
              </Button>
              <Button variant="primary" className="flex-1" onClick={onClose}>
                <p>{translate('modals.sharePhotosModal.buttons.create')}</p> <Link size={20} />
              </Button>
            </>
          ) : status.tag === 'loading' ? (
            <Button variant="secondary" disabled className="flex-1">
              {translate('modals.sharePhotosModal.buttons.creating')}
            </Button>
          ) : (
            <Button variant="primary" className="flex-1" onClick={onCopy}>
              <p>{translate('modals.sharePhotosModal.buttons.copyLink')}</p> <Copy size={20} />
            </Button>
          )}
        </div>
      </Transition.Child>
    </Transition>
  );
}

import { PhotoId } from '@internxt/sdk/dist/photos';
import { Copy, Link, XCircle } from 'phosphor-react';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { SdkFactory } from '../core/factory/sdk';
import i18n from '../i18n/services/i18n.service';
import notificationsService, { ToastType } from '../notifications/services/notifications.service';
import { RootState } from '../store';
import crypto from 'crypto';
import { useAppSelector } from '../store/hooks';
import { aes } from '@internxt/lib';
import { Network } from '../drive/services/network.service';

export default function ShareDialog({
  onClose,
  photos,
  isOpen,
}: {
  onClose: () => void;
  photos: PhotoId[];
  isOpen: boolean;
}): JSX.Element {
  const numberOfSelectedItems = photos.length;
  const views = 10;

  const [status, setStatus] = useState<{ tag: 'ready' } | { tag: 'loading' } | { tag: 'done'; link: string }>({
    tag: 'ready',
  });
  const bucket = useSelector<RootState, string>((state) => state.photos.bucketId!);
  const { mnemonic, email, userId } = useAppSelector((state) => state.user.user)!;

  async function onCreateShare() {
    setStatus({ tag: 'loading' });

    const network = new Network(email, userId, mnemonic);
    const token = await network.createFileToken(bucket, '', 'PULL');

    const { shares } = SdkFactory.getInstance().createPhotosClient();
    const code = crypto.randomBytes(32).toString('hex');
    const encryptedMnemonic = aes.encrypt(mnemonic, code);
    const share = await shares.createShare({ bucket, encryptedMnemonic, photoIds: photos, token, views });
    const link = `${window.location.origin}/s/photos/${share.id}/${code}`;
    setStatus({ tag: 'done', link });
  }

  function onCopy() {
    if (status.tag === 'done') {
      navigator.clipboard.writeText(status.link);
      notificationsService.show(i18n.get('success.linkCopied'), ToastType.Success);
      onClose();
    }
  }

  return (
    <div className={`absolute inset-0 bg-black bg-opacity-40 ${isOpen ? 'block' : 'hidden'}`}>
      <div className="absolute left-1/2 top-1/2 w-96 -translate-x-1/2 -translate-y-1/2 transform rounded-2xl bg-white p-3 text-center">
        <XCircle
          className="absolute top-2 right-2 cursor-pointer text-gray-20"
          onClick={onClose}
          weight="fill"
          size={24}
        />
        <h1 className="mt-4 text-xl font-semibold text-gray-80">Share {numberOfSelectedItems} photos</h1>
        <div className=" mt-3 flex items-center justify-center rounded-lg bg-gray-5 p-5">
          <div className="w-40 text-left">
            <p className="font-medium text-gray-80">Open count limit</p>
            <p className="text-gray-40">Limit number of times users can open this link</p>
          </div>
          <div className="flex flex-grow items-center justify-end">
            <div className="h-10 w-24 rounded-lg border border-gray-10 bg-white leading-10">
              <p className="font-medium text-gray-80">
                {views}
                <span className="text-gray-50"> times</span>
              </p>
            </div>
          </div>
        </div>
        <div className="mt-7 flex h-10 space-x-2">
          {status.tag === 'ready' ? (
            <>
              <button
                onClick={onClose}
                className="flex-1 rounded-lg bg-gray-5 font-medium text-gray-80 active:bg-gray-10"
              >
                Cancel
              </button>
              <button
                onClick={onCreateShare}
                className="flex flex-1 items-center justify-center rounded-lg bg-primary font-medium text-white active:bg-primary-dark"
              >
                <p>Create link</p> <Link className="ml-3" size={20} />
              </button>
            </>
          ) : status.tag === 'loading' ? (
            <button disabled className="flex-1 rounded-lg bg-gray-5 font-medium text-gray-80 active:bg-gray-10">
              Creating link...
            </button>
          ) : (
            <button
              onClick={onCopy}
              className="flex flex-1 items-center justify-center rounded-lg bg-primary font-medium text-white active:bg-primary-dark"
            >
              <p>Copy link</p> <Copy className="ml-3" size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

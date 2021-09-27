import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { UilClipboardAlt } from '@iconscout/react-unicons';
import { useState } from 'react';
import { useEffect } from 'react';

import { generateFileKey, Network } from '../../../lib/network';
import { DriveItemData } from '../../../models/interfaces';
import { uiActions } from '../../../store/slices/ui';
import BaseDialog from '../BaseDialog/BaseDialog';
import shareService from '../../../services/share.service';
import './ShareItemDialog.scss';
import { storageActions } from '../../../store/slices/storage';
import { trackShareLinkBucketIdUndefined } from '../../../services/analytics.service';
import { userThunks } from '../../../store/slices/user';
import i18n from '../../../services/i18n.service';
import notificationsService, { ToastType } from '../../../services/notifications.service';
import { items } from '@internxt/lib';
import navigationService from '../../../services/navigation.service';
import { AppView } from '../../../models/enums';
import errorService from '../../../services/error.service';
import storageThunks from '../../../store/slices/storage/storage.thunks';

interface ShareItemDialogProps {
  item: DriveItemData;
}

const DEFAULT_VIEWS = 10;

const ShareItemDialog = ({ item }: ShareItemDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const [linkToCopy, setLinkToCopy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [numberOfAttempts, setNumberOfAttempts] = useState(DEFAULT_VIEWS);
  const isOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const onClose = (): void => {
    close();
  };

  const close = () => {
    dispatch(uiActions.setIsShareItemDialogOpen(false));
    dispatch(storageActions.setItemToShare(null));
  };

  const itemFullName = items.getItemDisplayName(item);

  const handleShareLink = async (views: number) => {
    try {
      const fileId = item.fileId;

      if (!user) {
        return navigationService.push(AppView.Login);
      }

      const { bucket, mnemonic, userId, bridgeUser: email } = user;

      if (!bucket) {
        trackShareLinkBucketIdUndefined({ email });
        close();
        notificationsService.show(i18n.get('error.shareLinkMissingBucket'), ToastType.Error);
        dispatch(userThunks.logoutThunk());

        return;
      }

      const network = new Network(email, userId, mnemonic);
      const { index } = await network.getFileInfo(bucket, fileId);
      const fileToken = await network.createFileToken(bucket, fileId, 'PULL');
      const fileEncryptionKey = await generateFileKey(mnemonic, bucket, Buffer.from(index, 'hex'));

      const link = await shareService.generateShareLink(fileId, {
        bucket,
        fileToken,
        isFolder: false,
        views,
        encryptionKey: fileEncryptionKey.toString('hex'),
      });

      window.analytics.track('file-share');
      setLinkToCopy(link);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      }
      notificationsService.show(castedError.message, ToastType.Error);

      setLinkToCopy(i18n.get('error.unavailableLink'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const delay = setTimeout(() => {
      handleShareLink(numberOfAttempts);
    }, 750);

    return () => clearTimeout(delay);
  }, [numberOfAttempts]);

  return (
    <BaseDialog isOpen={isOpen} title={itemFullName} titleClasses="text-m-neutral-100 text-base" onClose={onClose}>
      <div className="share-dialog flex flex-col mb-8">
        <hr className="border-t-1 border-l-neutral-50 mt-7 mb-6" />

        <div className="px-8">
          <p className="w-full text-neutral-500 text-center">
            Share your Drive {item.isFolder ? 'folder' : 'file'} with this private link
          </p>

          <div className="flex mt-3">
            <span className="text-blue-60 mr-4">1.</span>
            <div className="flex w-72 items-center rounded-md bg-l-neutral-20 px-4 py-3">
              <span className="text-neutral-500 text-sm">
                Enter the number of times you'd like the link to be valid:
              </span>
              <input
                type="number"
                value={numberOfAttempts}
                min={1}
                className="w-12 content-center text-blue-60"
                onChange={(e) => setNumberOfAttempts(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="self-start mt-4">
            <span className="text-blue-60 mr-4">2.</span>
            <span className="text-neutral-500">Get link to share</span>
          </div>

          <div
            className="flex w-72 items-center justify-between rounded-md bg-l-neutral-20 px-4 py-2 ml-8 mt-3 cursor-pointer select-text"
            onClick={() => {
              navigator.clipboard.writeText(linkToCopy);
              notificationsService.show(i18n.get('success.linkCopied'), ToastType.Info);
            }}
          >
            <span className="text-neutral-900 text-xs w-56 truncate overflow-hidden">
              {isLoading ? 'Loading link...' : linkToCopy}
            </span>
            <UilClipboardAlt className="text-blue-60" />
          </div>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ShareItemDialog;

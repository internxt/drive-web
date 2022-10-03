import UilClipboardAlt from '@iconscout/react-unicons/icons/uil-clipboard-alt';
import { useEffect, useState } from 'react';

import { DriveItemData } from 'app/drive/types';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import shareService from 'app/share/services/share.service';
import './ShareItemDialog.scss';
import { storageActions } from 'app/store/slices/storage';
import { trackShareLinkBucketIdUndefined } from 'app/analytics/services/analytics.service';
import { userThunks } from 'app/store/slices/user';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { aes, items } from '@internxt/lib';
import navigationService from 'app/core/services/navigation.service';
import { AppView } from 'app/core/types';
import errorService from 'app/core/services/error.service';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import { referralsThunks } from 'app/store/slices/referrals';
import { ShareTypes } from '@internxt/sdk/dist/drive';
import crypto from 'crypto';
import { Environment } from '@internxt/inxt-js';
import PasswordInput from './components/PasswordInput';
import { Check, Copy, Icon } from 'phosphor-react';
import dateService from 'app/core/services/date.service';
import useDriveItemActions from 'app/drive/components/DriveExplorer/DriveExplorerItem/hooks/useDriveItemActions';

interface ShareItemDialogProps {
  item: DriveItemData;
}

const DEFAULT_VIEWS = -1;

const ShareItemDialog = ({ item }: ShareItemDialogProps): JSX.Element => {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.user.user);
  const [linkToCopy, setLinkToCopy] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(true);
  const [numberOfAttempts] = useState(DEFAULT_VIEWS);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
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
      if (!user) {
        return navigationService.push(AppView.Login);
      }

      const { bucket, bridgeUser, userId, mnemonic } = user;

      if (!bucket) {
        trackShareLinkBucketIdUndefined({ email: bridgeUser });
        close();
        notificationsService.show({ text: i18n.get('error.shareLinkMissingBucket'), type: ToastType.Error });
        dispatch(userThunks.logoutThunk());

        return;
      }

      const code = crypto.randomBytes(32).toString('hex');

      const encryptedMnemonic = aes.encrypt(mnemonic, code);
      const encryptedCode = aes.encrypt(code, mnemonic);

      const payload: ShareTypes.GenerateShareLinkPayload = {
        itemId: item.id.toString(),
        type: item.isFolder ? 'folder' : 'file',
        bucket: bucket,
        itemToken: await new Environment({
          bridgePass: userId,
          bridgeUser,
          bridgeUrl: process.env.REACT_APP_STORJ_BRIDGE,
        }).createFileToken(bucket, item.fileId, 'PULL'),
        timesValid: views,
        encryptedMnemonic,
        encryptedCode,
      };

      const link = await shareService.createShareLink(code, mnemonic, payload);

      dispatch(referralsThunks.refreshUserReferrals());

      // window.analytics.track('file-share');
      setLinkToCopy(link);
    } catch (err: unknown) {
      const castedError = errorService.castError(err);

      if (castedError.message === 'unauthenticated') {
        return navigationService.push(AppView.Login);
      }
      notificationsService.show({ text: castedError.message, type: ToastType.Error });

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
    <BaseDialog
      isOpen={isOpen}
      title={'Share settings'}
      subTitle={itemFullName}
      dialogRounded={true}
      textLeft={true}
      panelClasses="w-screen max-w-lg"
      titleClasses="text-black font-medium"
      closeClass="flex w-10 h-10 items-center mt-2 text-black hover:bg-black hover:bg-opacity-2 rounded-md focus:bg-black focus:bg-opacity-5"
      onClose={onClose}
    >
      <hr className="border-t-1 mb-5 w-screen border-neutral-40" />
      <div className="share-dialog mb-5 flex flex-col">
        <div className="mx-5">
          <div className="justify-left flex flex-col">
            <p className="text-base font-medium">Access</p>
            <div className="flex flex-row items-center">
              <input type={'checkbox'} onChange={() => setIsPasswordProtected(!isPasswordProtected)} />
              <p className="ml-2 text-base font-medium">Protect with password</p>
            </div>
            <p className="px-6 text-sm font-normal">Secure this link by setting up a password</p>
          </div>
          <div className="ml-6 mt-3 w-80">
            <PasswordInput placeholder="Password" disabled={isPasswordProtected} />
          </div>
          <hr className="border-t-1 my-6 border-neutral-40" />
          <div className="mb-8 flex flex-row justify-between">
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">Views</p>
              <p className="text-base font-normal">{'No views yet'}</p>
            </div>
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">Date created</p>
              <p className="text-base font-normal">{dateService.format(item.createdAt, 'dddd, D MMM YYYY, hh:mm')}</p>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <button
              className={`${
                isLinkCopied ? ' z-10 flex bg-blue-10 bg-opacity-5' : ''
              }flex h-10 w-32 flex-row items-center justify-center rounded-md border border-primary`}
              onClick={() => {
                setIsLinkCopied(true);
                setTimeout(() => {
                  setIsLinkCopied(false);
                }, 4000);
                navigator.clipboard.writeText(linkToCopy);
                notificationsService.show({ text: i18n.get('success.linkCopied'), type: ToastType.Info });
              }}
            >
              {isLinkCopied ? (
                <>
                  <Check size={24} className="mr-2 text-primary" />
                  <p className="text-base font-medium text-primary">Link copied</p>
                </>
              ) : (
                <>
                  <Copy size={24} className="mr-2 text-primary" />
                  <p className="text-base font-medium text-primary">Copy link</p>
                </>
              )}
            </button>
            <div className="flex">
              <button onClick={onClose} className="mr-2 rounded-lg bg-gray-5 px-5 py-2 text-base font-medium">
                Cancel
              </button>
              <button className="rounded-lg bg-primary px-5 py-2 text-base font-medium text-white">Save</button>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ShareItemDialog;

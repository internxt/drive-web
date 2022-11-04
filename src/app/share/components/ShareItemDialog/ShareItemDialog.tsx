import { useEffect, useState } from 'react';

import copy from 'copy-to-clipboard';
import { DriveItemData } from 'app/drive/types';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import './ShareItemDialog.scss';
import { storageActions } from 'app/store/slices/storage';
import i18n from 'app/i18n/services/i18n.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { aes, items } from '@internxt/lib';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import PasswordInput from './components/PasswordInput';
import { Check, Copy } from 'phosphor-react';
import dateService from 'app/core/services/date.service';
import shareService from 'app/share/services/share.service';
import { sharedThunks } from 'app/store/slices/sharedLinks';
import localStorageService from 'app/core/services/local-storage.service';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';

interface ShareItemDialogProps {
  share?: ShareLink;
  item: DriveItemData;
}

function copyShareLink(type: string, code: string, token: string) {
  const REACT_APP_SHARE_LINKS_DOMAIN = process.env.REACT_APP_SHARE_LINKS_DOMAIN || window.location.origin;
  copy(`${REACT_APP_SHARE_LINKS_DOMAIN}/s/${type}/${token}/${code}`);
  notificationsService.show({ text: i18n.get('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
}

const ShareItemDialog = ({ share, item }: ShareItemDialogProps): JSX.Element => {
  const isSavedAlreadyWithPassword = !!share?.hashed_password;
  const dispatch = useAppDispatch();
  const [itemPassword, setItemPassword] = useState('');
  const [passwordInputVirgin, setPasswordInputVirgin] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(isSavedAlreadyWithPassword);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const isOpen = useAppSelector((state) => state.ui.isShareItemDialogOpen);
  const dateShareLink = share?.createdAt;

  const onClose = (): void => {
    close();
  };

  const close = () => {
    dispatch(uiActions.setIsShareItemDialogOpen(false));
    dispatch(storageActions.setItemToShare(null));
  };

  const onSubmit = async () => {
    await shareService.updateShareLink({
      itemId: share?.id as string,
      plainPassword: isPasswordProtected ? itemPassword : null,
    });
    notificationsService.show({ text: 'Link updated', type: ToastType.Info });

    close();
  };

  const itemFullName = items.getItemDisplayName(item);

  return (
    <BaseDialog
      isOpen={isOpen}
      title="Share settings"
      subTitle={itemFullName}
      dialogRounded={true}
      textLeft={true}
      panelClasses="w-screen max-w-lg"
      titleClasses="text-black font-medium"
      closeClass="flex-shrink-0 flex items-center justify-center h-10 w-10 text-black hover:bg-black hover:bg-opacity-2 rounded-md focus:bg-black focus:bg-opacity-5"
      onClose={onClose}
      weightIcon="light"
    >
      <hr className="border-t-1 mb-5 w-screen border-neutral-40" />
      <div className="mb-5 flex flex-col">
        <div className="mx-5">
          <div className="justify-left flex flex-col">
            <p className="text-base font-medium">Access</p>
            <div>
              <label className="flex flex-row items-center">
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={() => setIsPasswordProtected(!isPasswordProtected)}
                />
                <p className="ml-2 text-base font-medium">Protect with password</p>
              </label>
            </div>
            <p className="px-6 text-sm font-normal">Secure this link by setting up a password</p>
          </div>
          <div className="ml-6 mt-3 w-80">
            <PasswordInput
              value={isSavedAlreadyWithPassword ? (passwordInputVirgin ? 'xxxxxxxxx' : itemPassword) : itemPassword}
              placeholder="Password"
              disabled={!isPasswordProtected}
              onChange={(evt) => setItemPassword(evt.target.value)}
              onFocus={() => setPasswordInputVirgin(false)}
            />
          </div>
          <hr className="border-t-1 my-6 border-neutral-40" />
          <div className="mb-8 flex flex-row justify-between">
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">Views</p>
              <p className="text-base font-normal">{share?.views === 0 ? 'No views yet' : share?.views}</p>
            </div>
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">Date created</p>
              <p className="text-base font-normal">
                {dateService.format(dateShareLink as string, 'dddd, D MMM YYYY, hh:mm')}
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <button
              className={`${
                isLinkCopied ? ' z-10 flex bg-blue-10 bg-opacity-5' : ''
              } flex h-10 flex-row items-center justify-center rounded-md border border-primary px-5`}
              onClick={() => {
                setIsLinkCopied(true);
                setTimeout(() => {
                  setIsLinkCopied(false);
                }, 4000);
                const temporaryShare = share as ShareLink & { is_folder: boolean; encryptedCode?: string };
                const itemType = share?.isFolder || temporaryShare.is_folder ? 'folder' : 'file';
                const encryptedCode = share?.code || (temporaryShare?.encryptedCode as string);
                const plainCode = aes.decrypt(encryptedCode, localStorageService.getUser()!.mnemonic);
                copyShareLink(itemType, plainCode, share?.token as string);
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
              <button onClick={onSubmit} className="rounded-lg bg-primary px-5 py-2 text-base font-medium text-white">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ShareItemDialog;

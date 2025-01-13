import { useState } from 'react';

import copy from 'copy-to-clipboard';
import { DriveItemData } from 'app/drive/types';
import { uiActions } from 'app/store/slices/ui';
import BaseDialog from 'app/shared/components/BaseDialog/BaseDialog';
import './ShareItemDialog.scss';
import { storageActions } from 'app/store/slices/storage';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import { aes, items } from '@internxt/lib';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import PasswordInput from './components/PasswordInput';
import { Check, Copy } from '@phosphor-icons/react';
import dateService from 'app/core/services/date.service';
import shareService from 'app/share/services/share.service';
import localStorageService from 'app/core/services/local-storage.service';
import { ShareLink } from '@internxt/sdk/dist/drive/share/types';
import { TFunction } from 'i18next';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { domainManager } from '../../services/DomainManager';
import _ from 'lodash';
import { AdvancedSharedItem } from 'app/share/types';

interface ShareItemDialogProps {
  share?: ShareLink;
  item: DriveItemData | AdvancedSharedItem;
  isPreviewView?: boolean;
}

async function copyShareLink(type: string, code: string, token: string, translate: TFunction) {
  const domainList =
    domainManager.getDomainsList().length > 0 ? domainManager.getDomainsList() : [window.location.origin];
  const shareDomain = _.sample(domainList);

  copy(`${shareDomain}/sh/${type}/${token}/${code}`);
  notificationsService.show({ text: translate('shared-links.toast.copy-to-clipboard'), type: ToastType.Success });
}

const ShareItemDialog = ({ share, item, isPreviewView }: ShareItemDialogProps): JSX.Element => {
  const { translate } = useTranslationContext();
  const isSavedAlreadyWithPassword = !!share?.hashed_password;
  const dispatch = useAppDispatch();
  const [itemPassword, setItemPassword] = useState('');
  const [passwordInputVirgin, setPasswordInputVirgin] = useState(true);
  const [isPasswordProtected, setIsPasswordProtected] = useState(isSavedAlreadyWithPassword);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const isOpen = useAppSelector(
    isPreviewView ? (state) => state.ui.isShareItemDialogOpenInPreviewView : (state) => state.ui.isShareItemDialogOpen,
  );

  const dateShareLink = share?.createdAt;

  const onClose = (): void => {
    close();
  };

  const close = () => {
    dispatch(
      isPreviewView
        ? uiActions.setIsShareItemDialogOpenInPreviewView(false)
        : uiActions.setIsShareItemDialogOpen(false),
    );
    dispatch(storageActions.setItemToShare(null));
  };

  const onSubmit = async () => {
    await shareService.updateShareLink({
      itemId: share?.id as string,
      plainPassword: isPasswordProtected ? itemPassword : null,
    });
    notificationsService.show({ text: translate('notificationMessages.linkUpdated'), type: ToastType.Info });

    close();
  };

  const itemFullName = items.getItemDisplayName(item);

  return (
    <BaseDialog
      isOpen={isOpen}
      title={translate('shareItemDialog.title')}
      subTitle={itemFullName}
      dialogRounded={true}
      panelClasses="w-screen max-w-lg"
      titleClasses="text-black font-medium text-left"
      closeClass="shrink-0 flex items-center justify-center h-10 w-10 text-black hover:bg-black/2 rounded-md focus:bg-black/5"
      onClose={onClose}
      weightIcon="light"
      dataTest="share-item-dialog"
    >
      <hr className="border-translate-1 mb-5 w-screen border-gray-10" />
      <div className="mb-5 flex flex-col">
        <div className="mx-5">
          <div className="justify-left flex flex-col">
            <p className="text-base font-medium">{translate('shareItemDialog.access')}</p>
            <div>
              <label className="flex flex-row items-center">
                <input
                  type="checkbox"
                  checked={isPasswordProtected}
                  onChange={() => setIsPasswordProtected(!isPasswordProtected)}
                />
                <p className="ml-2 text-base font-medium">{translate('shareItemDialog.protect')}</p>
              </label>
            </div>
            <p className="px-6 text-sm font-normal">{translate('shareItemDialog.addSecurePassword')}</p>
          </div>
          <div className="ml-6 mt-3 w-80">
            <PasswordInput
              value={isSavedAlreadyWithPassword ? (passwordInputVirgin ? 'xxxxxxxxx' : itemPassword) : itemPassword}
              placeholder={translate('shareItemDialog.password') as string}
              disabled={!isPasswordProtected}
              onChange={(evt) => setItemPassword(evt.target.value)}
              onFocus={() => setPasswordInputVirgin(false)}
            />
          </div>
          <hr className="border-translate-1 my-6 border-gray-10" />
          <div className="mb-8 flex flex-row justify-between">
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">{translate('shareItemDialog.views')}</p>
              <p className="text-base font-normal">
                {share?.views === 0 ? translate('shareItemDialog.noViewsYet') : share?.views}
              </p>
            </div>
            <div className="flex w-52 flex-col items-start">
              <p className="text-base font-medium">{translate('shareItemDialog.dateCreated')}</p>
              <p className="text-base font-normal">
                {dateService.formatDefaultDate(dateShareLink as string, translate)}
              </p>
            </div>
          </div>
          <div className="flex flex-row justify-between">
            <button
              className={`${
                isLinkCopied ? ' z-10 flex bg-primary/5' : ''
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
                copyShareLink(itemType, plainCode, share?.token as string, translate as TFunction);
              }}
            >
              {isLinkCopied ? (
                <>
                  <Check size={24} className="mr-2 text-primary" />
                  <p className="text-base font-medium text-primary">
                    {translate('shareItemDialog.buttons.linkCopied')}
                  </p>
                </>
              ) : (
                <>
                  <Copy size={24} className="mr-2 text-primary" />
                  <p className="text-base font-medium text-primary">{translate('shareItemDialog.buttons.copyLink')}</p>
                </>
              )}
            </button>
            <div className="flex">
              <button onClick={onClose} className="mr-2 rounded-lg bg-gray-5 px-5 py-2 text-base font-medium">
                {translate('shareItemDialog.buttons.cancel')}
              </button>
              <button onClick={onSubmit} className="rounded-lg bg-primary px-5 py-2 text-base font-medium text-white">
                {translate('shareItemDialog.buttons.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseDialog>
  );
};

export default ShareItemDialog;

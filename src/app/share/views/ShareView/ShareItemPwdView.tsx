import React, { useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import PasswordInput from 'app/share/components/ShareItemDialog/components/PasswordInput';
import { ReactComponent as LockLogo } from 'assets/icons/Lock.svg';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import iconService from 'app/drive/services/icon.service';
import sizeService from 'app/drive/services/size.service';
import transformItemService from 'app/drive/services/item-transform.service';
import { DriveItemData } from 'app/drive/types';

export interface ShareItemPwdViewProps {
  onPasswordSubmitted: (password: string) => Promise<void>;
  itemPassword: string;
  setItemPassword: (password: string) => void;
  itemData?: { plainName: string; size: number; type?: string };
}

const ShareItemPwdView = (props: ShareItemPwdViewProps) => {
  const { translate } = useTranslationContext();
  const { onPasswordSubmitted, setItemPassword, itemPassword } = props;
  const [onPasswordError, setOnPasswordError] = useState(false);
  const Icon = props.itemData ? iconService.getItemIcon(props.itemData.type === 'folder', props.itemData.type) : null;
  if (!onPasswordError) {
    setTimeout(() => setOnPasswordError(false), 6000);
  }

  function handleChange(pwd) {
    const value = pwd.target.value;
    setItemPassword(value);
  }

  return (
    <div className="flex w-full flex-col items-center space-y-0 space-y-8 px-5 sm:w-96">
      {/* <div className="flex w-96 flex-col items-center justify-center px-5 sm:px-0"> */}
      <div className="flex w-full flex-col items-center justify-center space-y-2 text-center">
        <LockLogo className="mb-6 h-14 w-14 text-white" />
        <p className="text-xl font-medium">{translate('shareItemPwdView.title')}</p>
        <p className="text-base font-normal text-gray-80">
          {translate('shareItemPwdView.putPwd')}
          <br />
          {translate('shareItemPwdView.putPwd1')}
        </p>
      </div>
      {props.itemData && Icon !== null && (
        <div className="inline-flex w-full items-center justify-start gap-2.5 rounded-lg border-gray-10 bg-gray-5 p-4">
          <div className="flex h-10 w-10 items-center justify-center px-[5px]">
            <div className="flex h-10 w-10 justify-center drop-shadow-soft">
              <Icon className="h-full" />
            </div>
          </div>
          <div className="ml-1 inline-flex shrink grow basis-0 flex-col items-start justify-start gap-0.5">
            <div className="text-zinc-900 self-stretch text-base font-medium leading-tight">
              {transformItemService.getItemPlainNameWithExtension(props.itemData as DriveItemData)}
            </div>
            <div className="self-stretch text-sm font-normal text-neutral-700">
              {sizeService.bytesToString(props.itemData?.size ?? 0)}
            </div>
          </div>
        </div>
      )}
      {/* </div> */}
      <form className="flex w-full flex-col text-left sm:px-0">
        <p className="pb-2 text-sm font-medium">{translate('shareItemPwdView.password')}</p>
        <PasswordInput
          placeholder={translate('shareItemPwdView.pwdLayout') as string}
          onChange={handleChange}
          value={itemPassword}
          passwordError={onPasswordError}
        />
        {onPasswordError && (
          <div className="flex flex-row items-center space-x-1 pt-1">
            <WarningCircle size={16} color="red" weight="fill" />
            <p className="text-sm font-normal text-red-std">{translate('error.wrongPassword')}</p>
          </div>
        )}
        <button
          type="submit"
          onClick={(evt) => {
            evt.preventDefault();
            onPasswordSubmitted(itemPassword).catch((err) => {
              if (err.message === 'Forbidden') {
                setOnPasswordError(true);
                return;
              }
              notificationsService.show({
                text: errorService.castError(err).message,
                type: ToastType.Warning,
                duration: 50000,
              });
            });
          }}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-blue-60 font-medium text-white"
        >
          <p className="text-sm font-medium">{translate('shareItemPwdView.access')}</p>
        </button>
      </form>
    </div>
  );
};

export default ShareItemPwdView;

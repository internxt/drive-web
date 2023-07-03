import React, { useState } from 'react';
import { WarningCircle } from '@phosphor-icons/react';
import PasswordInput from 'app/share/components/ShareItemDialog/components/PasswordInput';
import { ReactComponent as LockLogo } from 'assets/icons/Lock.svg';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import errorService from 'app/core/services/error.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';

export interface ShareItemPwdViewProps {
  onPasswordSubmitted: (password: string) => Promise<void>;
  itemPassword: string;
  setItemPassword: (password: string) => void;
}

const ShareItemPwdView = (props: ShareItemPwdViewProps) => {
  const { translate } = useTranslationContext();
  const { onPasswordSubmitted, setItemPassword, itemPassword } = props;
  const [onPasswordError, setOnPasswordError] = useState(false);

  if (!onPasswordError) {
    setTimeout(() => setOnPasswordError(false), 6000);
  }

  function handleChange(pwd) {
    const value = pwd.target.value;
    setItemPassword(value);
  }

  return (
    <div className="flex w-full flex-col items-center space-y-8 px-5 sm:w-96 sm:space-y-0">
      {/* <div className="flex w-96 flex-col items-center justify-center px-5 sm:px-0"> */}
      <div className="flex flex-col items-center justify-center space-y-2 text-center">
        <LockLogo className="mb-6 h-14 w-14 text-white" />
        <p className="text-xl font-medium">{translate('shareItemPwdView.title')}</p>
        <p className="text-base font-normal text-gray-80">
          {translate('shareItemPwdView.putPwd')}
          <br />
          {translate('shareItemPwdView.putPwd1')}
        </p>
      </div>
      {/* </div> */}
      <form className="flex w-full flex-col pt-10 text-left sm:px-0">
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

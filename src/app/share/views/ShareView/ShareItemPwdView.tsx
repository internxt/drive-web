import React, { useState } from 'react';
import { LockSimple, WarningCircle } from 'phosphor-react';
import PasswordInput from 'app/share/components/ShareItemDialog/components/PasswordInput';

export interface ShareItemPwdViewProps {
  password: string;
  passwordChecked: (pasword: boolean) => void;
}

const ShareItemPwdView = (props: ShareItemPwdViewProps) => {
  const [onPasswordError, setOnPasswordError] = useState(false);
  const [itemPassword, setItemPassword] = useState('');
  if (!onPasswordError) {
    setTimeout(() => setOnPasswordError(false), 6000);
  }

  function handleChange(pwd) {
    const value = pwd.target.value;
    setItemPassword(value);
  }

  return (
    <>
      <div className="flex flex-col space-y-4">
        <div className="flex w-96 flex-col items-center justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
            <LockSimple size={32} color="white" weight="fill" />
          </div>
          <div className="flex flex-col items-center justify-center space-y-2 pt-6 text-center">
            <p className="text-2xl font-medium">This link is password protected</p>
            <p className="text-xl font-normal">Please enter the password provided by the sender for access.</p>
          </div>
        </div>
        <div className="flex flex-col pt-10 text-left">
          <p className="pb-2 text-sm font-medium">Password</p>
          <PasswordInput
            placeholder="Password"
            onChange={handleChange}
            value={itemPassword}
            passwordError={onPasswordError}
          />
          {onPasswordError && (
            <div className="flex flex-row items-center space-x-1 pt-1">
              <WarningCircle size={16} color="red" weight="fill" />
              <p className="text-sm font-normal text-red-std">Wrong password, try again or contact link owner</p>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            if (props.password === itemPassword) {
              setOnPasswordError(false);
              props.passwordChecked(false);
            } else {
              setOnPasswordError(true);
              setItemPassword('');
            }
          }}
          className="flex h-11 items-center justify-center rounded-lg bg-blue-60 px-6 font-medium text-white"
        >
          <p className="text-sm font-medium">Access</p>
        </button>
      </div>
    </>
  );
};

export default ShareItemPwdView;

import React from 'react';
import SideInfo from './SideInfo';
import ButtonPrimary from '../../components/Buttons/ButtonPrimary';
import { IconPosition, IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import InputPrimary from '../../components/Inputs/InputPrimary';
interface LoginProps {

}

const texts = {
  label: 'INTERNXT',
  title: 'Privacy security and flexible',
  subtitle: 'Drive cloud storage is part of the ecosystem of solutions developed by Internxt to protect the security and privacy of companies and individuals',
  link: 'internxt.com',
  href: 'https://internxt.com'
};

const Login = ({ }: LoginProps): JSX.Element => {
  return (
    <div className='flex h-full'>
      <SideInfo texts={texts} />

      <div className='flex w-full items-center justify-center'>
        <div className='flex flex-col w-56'>
          <img src={getIcon(IconTypes.InternxtLongLogo)} width='110' alt="" />
          <span className='text-xs text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

          <div className='relative'>
            <InputPrimary type='text' placeholder='Email' icon={IconTypes.MailGray} />
            <div className='absolute right-3.5 bottom-6 flex items-center justify-center'>
              <img src={getIcon(IconTypes.MailGray)} alt="" />
            </div>
          </div>

          <div className='relative'>
            <InputPrimary type='password' placeholder='Password' icon={IconTypes.LockGray} />
            <div className='absolute right-3.5 bottom-6 flex items-center justify-center'>
              <img src={getIcon(IconTypes.LockGray)} alt="" />
            </div>
          </div>

          <InputPrimary type='checkbox' />

          <ButtonPrimary text='Sign in' width='w-full' />
        </div>
      </div>
    </div>
  );
};

export default Login;

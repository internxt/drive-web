import React from 'react';
import SideInfo from './SideInfo';
import { IconTypes } from '../../models/enums';
import { getIcon } from '../../services/getIcon';
import { SubmitHandler, useForm } from 'react-hook-form';
interface LoginProps {

}

export interface ILoginFormValues {
  email: string,
  password: string,
  remember: boolean
}

const texts = {
  label: 'INTERNXT',
  title: 'Privacy security and flexible',
  subtitle: 'Drive cloud storage is part of the ecosystem of solutions developed by Internxt to protect the security and privacy of companies and individuals',
  link: 'internxt.com',
  href: 'https://internxt.com'
};
const validateEmailPatter = /^((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*"))@((?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))$/;

const Login = ({ }: LoginProps): JSX.Element => {
  const { register, formState: { errors }, handleSubmit } = useForm<ILoginFormValues>({ mode: 'onChange' });

  const onSubmit: SubmitHandler<ILoginFormValues> = data => {
    alert(JSON.stringify(data));
  };

  return (
    <div className='flex h-full'>
      <SideInfo texts={texts} />

      <div className='flex w-full items-center justify-center'>

        <form className='flex flex-col w-56' onSubmit={handleSubmit(onSubmit)}>
          <img src={getIcon(IconTypes.InternxtLongLogo)} width='110' alt="" />
          <span className='text-xs text-neutral-500 mt-1.5 mb-6'>Cloud Storage</span>

          <div className='relative'>
            <input type="email" placeholder="Email" {...register('email', { required: true, pattern: validateEmailPatter })}
              className={`w-full transform duration-200 ${errors.email ? 'error' : ''}`} />
            <div className='absolute right-3.5 bottom-6 flex items-center justify-center'>
              <img src={getIcon(IconTypes.MailGray)} alt="" />
            </div>
          </div>

          <div className='relative'>
            <input type="password" placeholder="Password" {...register('password', { required: true, maxLength: 40 })}
              className={`w-full transform duration-200 ${errors.password ? 'error' : ''}`} />
            <div className='absolute right-3.5 bottom-6 flex items-center justify-center'>
              <img src={getIcon(IconTypes.LockGray)} alt="" />
            </div>
          </div>

          <label className='flex items-center mt-2 mb-3.5 cursor-pointer'>
            <input type="checkbox" placeholder="Remember me" {...register('remember')} />
            <span className='text-xs text-neutral-500 ml-3'>Remember me</span>
          </label>

          <button type='submit' className='flex items-center justify-center bg-blue-60 py-2 rounded text-white text-sm'>
            <span>Sign in</span>
          </button>

          <a href="" className='text-xs text-blue-60 mt-3.5'>Forgot your password?</a>
        </form>
      </div>
    </div>
  );
};

export default Login;

/*import { Fragment, useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';

import ExclamationTriangle from '@iconscout/react-unicons/icons/uil-exclamation-triangle';
import { Link } from 'react-router-dom';
import {CaretLeft} from 'phosphor-react';
import userService from '../../services/user.service';

import { IFormValues } from 'app/core/types';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import i18n from 'app/i18n/services/i18n.service';
import TextInput from '../../components/TextInput/TextInput';
import Button from '../../components/Button/Button';*/
import bigLogo from 'assets/icons/big-logo.svg';
import { Link } from 'react-router-dom';
import ForgotPassword from '../../components/ForgotPassword/ForgotPassword';

function RemoveAccount(): JSX.Element {

  return (
      <div className="flex h-full w-full bg-gray-5 justify-center">
     
      <img src={bigLogo} width="150" alt="" className='absolute top-10 left-20'/> 
      <div className='mt-auto mb-auto'>
        <ForgotPassword/>

      </div>
      <div className='flex justify-center absolute left-auto right-auto bottom-2'>
        <Link to='/legal' className='no-underline text-gray-80 text-base font-regular mr-4 mt-6'>
          Terms and conditions
        </Link>
        <Link to='/help' className='no-underline text-gray-80 text-base font-regular ml-4 mt-6'>
          Need help?
        </Link>
      </div>
      
    </div>
  );
};

export default RemoveAccount;

import { useAppDispatch } from 'app/store/hooks';
import { useSignUp } from '../../components/SignUp/useSignUp';
import { useState } from 'react';

import { IFormValues } from 'app/core/types';
import { WarningCircle } from 'phosphor-react';
import TextInput from 'app/auth/components/TextInput/TextInput';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import { useForm } from 'react-hook-form';
import signup from './signup';

const SignupAuth = () => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  const [error, setError] = useState('');

  // FILTER MESSAGES
  const { doRegister } = useSignUp('activate');

  const {
    register,
    formState: { errors },
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  return (
    <div className="flex w-full max-w-lg flex-col items-center space-y-2 pt-10 md:w-max md:items-start md:pt-0">
      <div className="flex w-full flex-col space-y-3 md:flex-row md:space-y-0 md:space-x-3">
        <div className="flex w-full">
          <TextInput
            placeholder={'Correo'}
            label="email"
            type="email"
            className={'w-full'}
            register={register}
            minLength={{ value: 1, message: 'El correo no puede estar vacío' }}
            error={errors.email}
          />
        </div>

        <div className="flex w-full">
          <PasswordInput
            placeholder={'Contraseña'}
            label="password"
            className={'w-full'}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'La contraseña no puede estar vacía' }}
            error={errors.password}
          />
        </div>
      </div>

      {error && (
        <div className="flex w-full flex-row items-start justify-center md:justify-start">
          <div className="flex h-5 flex-row items-center">
            <WarningCircle weight="fill" className="text-red mr-1 h-4" />
          </div>
          <span className="text-sm text-red-std">{error}</span>
        </div>
      )}

      <div className="flex w-full flex-col items-center space-y-3 md:flex-row md:space-y-0 md:space-x-3">
        <div className="w-full">
          <button
            type="submit"
            disabled={loading}
            onClick={() => {
              signup(
                {
                  email: localStorage.getItem('email'),
                  password: localStorage.getItem('password'),
                },
                dispatch,
                doRegister,
                setLoading,
                setError,
              );
            }}
            className={
              'focus:outline-none shadow-xm relative flex h-11 w-full flex-row items-center justify-center space-x-4 whitespace-nowrap rounded-lg px-0 py-2.5 text-lg text-white transition duration-100 focus-visible:bg-orange-dark active:bg-orange-dark disabled:cursor-not-allowed disabled:text-white/75 sm:text-base'
            }
            style={{
              backgroundColor: '#F26122',
            }}
          >
            {loading ? (
              <svg
                className="absolute mx-auto animate-spin"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 6.10352e-05C9.3688 6.10515e-05 10.7147 0.35127 11.909 1.02009C13.1032 1.68892 14.1059 2.65298 14.8211 3.82007C15.5363 4.98716 15.9401 6.31824 15.9938 7.68598C16.0476 9.05372 15.7495 10.4124 15.1281 11.632C14.5066 12.8516 13.5827 13.8914 12.4446 14.6518C11.3064 15.4123 9.99225 15.868 8.62767 15.9754C7.2631 16.0828 5.89379 15.8383 4.65072 15.2652C3.40766 14.6921 2.33242 13.8097 1.52787 12.7023L3.1459 11.5268C3.74932 12.3573 4.55575 13.0191 5.48804 13.4489C6.42034 13.8787 7.44732 14.0621 8.47076 13.9816C9.49419 13.901 10.4798 13.5592 11.3334 12.9889C12.187 12.4185 12.88 11.6387 13.346 10.724C13.8121 9.8093 14.0357 8.79031 13.9954 7.7645C13.9551 6.7387 13.6522 5.74039 13.1158 4.86507C12.5794 3.98975 11.8274 3.2667 10.9317 2.76508C10.036 2.26347 9.0266 2.00006 8 2.00006V6.10352e-05Z"
                  fill="#FFFFFF"
                />
              </svg>
            ) : (
              <div className="flex flex-row items-center space-x-1.5 rounded-lg text-white">
                <span>Obtén la oferta</span>
              </div>
            )}
          </button>
        </div>

        <span className="w-full text-xs text-gray-50 sm:text-left">
          <span>Al crear una cuenta aceptas</span>{' '}
          <a
            href="https://internxt.com/legal"
            target="_blank"
            className="hover:text-gray-60 hover:underline active:text-gray-80"
          >
            los términos de servicio y la política de privacidad.
          </a>
          <span>{'.'}</span>
        </span>
      </div>
    </div>
  );
};

export default function Auth(): JSX.Element {
  return (
    <div className="flex  flex-col items-center justify-center py-3 px-5 md:py-16 md:px-40">
      <div className="flex h-full w-full flex-col justify-center space-y-7 px-5 md:flex-row md:space-y-0 md:space-x-48">
        <div className="flex w-full max-w-md flex-col justify-between space-y-3 md:space-y-10">
          <div>
            <p
              className="text-center text-5xl font-bold md:text-left md:text-6xl"
              style={{
                color: '#13094F',
              }}
            >
              Almacena tus archivos con total privacidad
            </p>
          </div>
          <SignupAuth />
        </div>
        <div
          className="flex h-full flex-col items-center space-y-6 rounded-lg py-9 px-6"
          style={{
            backgroundColor: '#13094F',
          }}
        >
          <div
            className="flex rounded-full p-1 px-3"
            style={{
              backgroundColor: '#F26122',
            }}
          >
            <p className="text-lg font-bold text-white">Plan de 2TB</p>
          </div>
          <div className="items-center">
            <p className="text-lg font-bold text-white">Gratis durante los primeros 30 días</p>
          </div>
          <div
            className="flex flex-row"
            style={{
              color: '#F26122',
            }}
          >
            <span className="text-8xl font-bold">0.00</span>
            <sup className={'mt-6 text-3xl font-bold'}>€</sup>
          </div>
          <div className="text-center text-white">
            <p className="text-sm font-bold">50% de descuento si decides renovar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useAppDispatch } from 'app/store/hooks';
import { useSignUp } from '../../components/SignUp/useSignUp';
import { useState } from 'react';

import { IFormValues } from 'app/core/types';
import { WarningCircle } from '@phosphor-icons/react';
import TextInput from 'app/auth/components/TextInput/TextInput';
import PasswordInput from 'app/auth/components/PasswordInput/PasswordInput';
import { useForm } from 'react-hook-form';
import signup from './signup';

const textContent = {
  email: 'Correo',
  passwordLabel: 'Contraseña',
  emailEmpty: 'El correo no puede estar vacío',
  passwordLabelEmpty: 'La contraseña no puede estar vacía',
  buttonText: 'Obtén la oferta',
  legal: {
    line1: 'Al crear una cuenta aceptas',
    line2: 'los términos de servicio y la política de privacidad',
  },
};

export const SignupComponent = ({
  buttonColor,
  textContent,
  appRedirect = false,
}: {
  buttonColor?: string;
  textContent: any;
  appRedirect?: boolean;
}): JSX.Element => {
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();

  const [error, setError] = useState('');

  const { doRegister } = useSignUp('activate');

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (e) => {
        await signup(e, dispatch, doRegister, setLoading, appRedirect, setError);
      })}
    >
      <div className="flex w-full max-w-lg flex-col items-center space-y-2 pt-10 lg:w-max lg:items-start lg:pt-0">
        <div className="flex w-full flex-col space-y-3 lg:flex-row lg:space-x-3 lg:space-y-0">
          <div className="flex w-full">
            <TextInput
              placeholder={textContent.email}
              label="email"
              type="email"
              className={'w-full rounded-lg bg-white'}
              register={register}
              autoComplete="off"
              minLength={{ value: 1, message: textContent.emailEmpty }}
              error={errors.email}
            />
          </div>

          <div className="flex w-full">
            <PasswordInput
              placeholder={textContent.passwordLabel}
              label="password"
              className={'w-full rounded-lg bg-white'}
              register={register}
              autoComplete="new-password"
              required={true}
              minLength={{ value: 1, message: textContent.passwordLabelEmpty }}
              error={errors.password}
            />
          </div>
        </div>

        {error && (
          <div className="flex w-full flex-row items-start justify-center lg:justify-start">
            <div className="flex h-5 flex-row items-center">
              <WarningCircle weight="fill" className="mr-1 h-4 text-red" />
            </div>
            <span className="text-sm text-red">{error}</span>
          </div>
        )}

        <div className="flex w-full flex-col items-center space-y-3 lg:flex-row lg:space-x-3 lg:space-y-0">
          <div className="w-full">
            <button
              type="submit"
              disabled={loading}
              className={`shadow-xm relative flex h-11 w-full flex-row items-center justify-center space-x-4 whitespace-nowrap rounded-lg focus:outline-none ${
                buttonColor ?? 'bg-pcComponentes-orange focus-visible:bg-orange-dark active:bg-orange-dark'
              }  px-0 py-2.5 text-lg text-white transition duration-100  disabled:cursor-not-allowed disabled:text-white/75 sm:text-base`}
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
                  <span>{textContent.buttonText}</span>
                </div>
              )}
            </button>
          </div>

          <span className="hidden w-full text-xs text-gray-50 sm:text-left md:flex">
            <span>{textContent.legal.line1}</span>{' '}
            <a
              href="https://internxt.com/legal"
              target="_blank"
              className="hover:text-gray-60 hover:underline active:text-gray-80"
            >
              {textContent.legal.line2}
            </a>
            <span>{'.'}</span>
          </span>
        </div>
      </div>
    </form>
  );
};

export default function Auth(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-3 lg:px-40 lg:py-16">
      <div className="flex h-full w-full flex-col items-center justify-center space-y-7 px-5 lg:flex-row lg:space-x-48 lg:space-y-0">
        <div className="flex w-full max-w-md flex-col justify-between space-y-3 lg:space-y-10">
          <div>
            <p
              className="text-center text-5xl font-bold lg:text-left lg:text-6xl"
              style={{
                color: '#13094F',
              }}
            >
              Almacena tus archivos con total privacidad
            </p>
          </div>
          <SignupComponent textContent={textContent} />
        </div>
        <div
          className="flex h-full flex-col items-center space-y-6 rounded-lg px-6 py-9 text-center"
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
            <p className="text-sm font-bold">50% de descuento los tres siguientes meses si decides renovar</p>
          </div>
        </div>
      </div>
    </div>
  );
}

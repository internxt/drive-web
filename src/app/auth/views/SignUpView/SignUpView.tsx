import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import * as bip39 from 'bip39';
import queryString from 'query-string';
import { aes, auth } from '@internxt/lib';
import { Link } from 'react-router-dom';
import UilLock from '@iconscout/react-unicons/icons/uil-lock';
import UilEyeSlash from '@iconscout/react-unicons/icons/uil-eye-slash';
import UilEye from '@iconscout/react-unicons/icons/uil-eye';
import UilUser from '@iconscout/react-unicons/icons/uil-user';
import UilEnvelope from '@iconscout/react-unicons/icons/uil-envelope';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';
import { isValidPasswordRegex } from '@internxt/lib/dist/src/auth/isValidPassword';
import { Auth, Keys, RegisterDetails } from '@internxt/sdk';

import { readReferalCookie } from '../../services/auth.service';
import AuthSideInfo from '../../components/AuthSideInfo/AuthSideInfo';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';
import BaseInput from 'app/shared/components/forms/inputs/BaseInput';
import BaseCheckbox from 'app/shared/components/forms/BaseCheckbox/BaseCheckbox';
import AuthButton from 'app/shared/components/AuthButton';
import { useAppDispatch } from 'app/store/hooks';
import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from 'app/crypto/services/utils';
import { userActions, userThunks } from 'app/store/slices/user';
import { generateNewKeys } from 'app/crypto/services/pgp.service';
import { planThunks } from 'app/store/slices/plan';
import { getAesInitFromEnv } from 'app/crypto/services/keys.service';
import errorService from 'app/core/services/error.service';
import navigationService from 'app/core/services/navigation.service';
import { productsThunks } from 'app/store/slices/products';
import httpService from 'app/core/services/http.service';
import { AppView, IFormValues } from 'app/core/types';
import { UserSettings } from '../../types';
import { referralsThunks } from 'app/store/slices/referrals';
import packageJson from '../../../../../package.json';

export interface SignUpViewProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

const SignUpView = (props: SignUpViewProps): JSX.Element => {
  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;
  const tokenParam = qs.token;
  const hasReferrer = !!qs.ref;
  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    control,
  } = useForm<IFormValues>({
    mode: 'onChange',
    defaultValues: {
      email: hasEmailParam ? (qs.email as string) : '',
    },
  });
  const dispatch = useAppDispatch();

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  useEffect(() => {
    const isAppSumo = navigationService.getCurrentView()?.id === AppView.AppSumo;

    if (isAppSumo && tokenParam && typeof tokenParam === 'string') {
      localStorageService.clear();
      localStorageService.set('xToken', tokenParam);
    }
  }, []);

  const updateInfo = (name: string, lastname: string, email: string, password: string) => {
    // Setup hash and salt
    const hashObj = passToHash({ password: password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);

    // Setup mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    // Body
    const body = {
      name: name,
      lastname: lastname,
      email: email,
      password: encPass,
      mnemonic: encMnemonic,
      salt: encSalt,
      referral: readReferalCookie(),
    };

    const fetchHandler = async (res: Response) => {
      const body = await res.text();

      try {
        const bodyJson = JSON.parse(body);

        return { res: res, body: bodyJson };
      } catch {
        return { res: res, body: body };
      }
    };
    const activate = qs.register === 'activate' ? 'activate' : 'appsumo';
    return fetch(`${process.env.REACT_APP_API_URL}/api/${activate}/update`, {
      method: 'POST',
      headers: httpService.getHeaders(true, false),
      body: JSON.stringify(body),
    })
      .then(fetchHandler)
      .then(({ res, body }) => {
        if (res.status !== 200) {
          throw Error(body.error || 'Internal Server Error');
        } else {
          return body;
        }
      })
      .then((res) => {
        const xToken = res.token;
        const xUser = res.user;

        xUser.mnemonic = mnemonic;
        dispatch(userActions.setUser(xUser));
        analyticsService.trackSignUp({
          userId: xUser.uuid,
          properties: {
            email: xUser.email,
            signup_source: signupCampaignSource(window.location.search),
          },
          traits: {
            email: xUser.email,
            first_name: name,
            last_name: lastname,
            usage: 0,
            createdAt: new Date().toISOString(),
            signup_device_source: signupDevicesource(window.navigator.userAgent),
            acquisition_channel: signupCampaignSource(window.location.search),
          },
        });

        return dispatch(userThunks.initializeUserThunk()).then(() => {
          localStorageService.set('xToken', xToken);
          localStorageService.set('xMnemonic', mnemonic);
        });
      });
  };

  const doRegister = async (name: string, lastname: string, email: string, password: string, captcha: string) => {
    const hashObj = passToHash({ password: password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    const {
      privateKeyArmored,
      publicKeyArmored,
      revocationCertificate,
    } = await generateNewKeys();
    const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

    const authClient = Auth.client(process.env.REACT_APP_API_URL, packageJson.name, packageJson.version);

    const keys: Keys = {
      privateKeyEncrypted: encPrivateKey,
      publicKey: publicKeyArmored,
      revocationCertificate: revocationCertificate
    };
    const registerDetails: RegisterDetails = {
      name: name,
      lastname: lastname,
      email: email,
      password: encPass,
      salt: encSalt,
      mnemonic: encMnemonic,
      keys: keys,
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: hasReferrer ? String(qs.ref) : undefined,
    };

    return authClient.register(registerDetails)
      .then((data) => {
        const token = data.token;
        const user: UserSettings = {
          ...data.user,
          bucket: ''
        };
        const uuid = data.uuid;

        user.privateKey = Buffer.from(aes.decrypt(user.privateKey, password)).toString('base64');

        analyticsService.trackSignUp({
          userId: uuid,
          properties: {
            signup_source: signupCampaignSource(window.location.search),
            email: email,
          },
          traits: {
            member_tier: 'free',
            email: email,
            first_name: name,
            last_name: lastname,
            usage: 0,
            createdAt: new Date().toISOString(),
            signup_device_source: signupDevicesource(window.navigator.userAgent),
            acquisition_channel: signupCampaignSource(window.location.search),
          },
        });

        // adtrack script
        window._adftrack = Array.isArray(window._adftrack)
          ? window._adftrack
          : window._adftrack
            ? [window._adftrack]
            : [];
        window._adftrack.push({
          HttpHost: 'track.adform.net',
          pm: 2370627,
          divider: encodeURIComponent('|'),
          pagename: encodeURIComponent('New'),
        });

        localStorageService.set('xToken', token);
        user.mnemonic = decryptTextWithKey(user.mnemonic, password);
        dispatch(userActions.setUser({ ...user }));
        localStorageService.set('xMnemonic', user.mnemonic);

        dispatch(productsThunks.initializeThunk());
        dispatch(planThunks.initializeThunk());
        dispatch(referralsThunks.initializeThunk());
        dispatch(userThunks.initializeUserThunk()).then(() => {
          navigationService.push(AppView.Drive);
        });
      })
      .catch((err) => {
        console.error('Register error', err);
        setSignupError(err.message || err);
        setShowError(true);
      });
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    setIsLoading(true);
    try {
      const { name, lastname, email, password, confirmPassword, token } = formData;

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!props.isNewUser) {
        await updateInfo(name, lastname, email, password)
          .then(() => {
            dispatch(productsThunks.initializeThunk());
            dispatch(planThunks.initializeThunk());
            navigationService.push(AppView.Drive);
          })
          .catch((err) => {
            console.log('ERR', err);
            throw new Error(err.message + ', please contact us');
          });
      } else {
        await doRegister(name, lastname, email, password, token);
      }
    } catch (err: unknown) {
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
      setIsLoading(false);
    }
  };

  async function getReCaptcha(formValues: IFormValues) {
    const grecaptcha = window.grecaptcha;

    grecaptcha.ready(() => {
      grecaptcha.execute(process.env.REACT_APP_RECAPTCHA_V3, { action: 'register' }).then((token) => {
        // Can't wait or token will expire
        formValues.token = token;
        onSubmit(formValues);
      });
    });
  }

  return (
    <div className="flex h-full w-full">
      <AuthSideInfo title="" subtitle="" />

      <div className="flex flex-col items-center justify-center w-full">
        <form className="flex flex-col w-72" onSubmit={handleSubmit(getReCaptcha)}>
          <span className="text-base font-semibold text-neutral-900 mt-1.5 mb-6">Create an Internxt account</span>

          <BaseInput
            className="mb-2.5"
            placeholder="Name"
            label="name"
            type="text"
            icon={<UilUser className="w-4" />}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Name must not be empty' }}
            error={errors.name}
          />

          <BaseInput
            className="mb-2.5"
            placeholder="Lastname"
            label="lastname"
            type="text"
            icon={<UilUser className="w-4" />}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Lastname must not be empty' }}
            error={errors.lastname}
          />

          <BaseInput
            className="mb-2.5"
            placeholder="Email"
            label="email"
            type="email"
            disabled={hasEmailParam}
            icon={<UilEnvelope className="w-4" />}
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Email must not be empty' }}
            pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
            error={errors.email}
          />

          <BaseInput
            className="mb-2.5"
            placeholder="Password"
            label="password"
            type={showPassword ? 'text' : 'password'}
            icon={
              password ? (
                showPassword ? (
                  <UilEyeSlash className="w-4" onClick={() => setShowPassword(false)} />
                ) : (
                  <UilEye className="w-4" onClick={() => setShowPassword(true)} />
                )
              ) : (
                <UilLock className="w-4" />
              )
            }
            register={register}
            required={true}
            minLength={{ value: 8, message: 'The password must be at least 8 characters long' }}
            error={errors.password}
            pattern={{
              value: isValidPasswordRegex,
              message: 'The password must contain lowercase/uppercase letters and at least a number',
            }}
          />

          <BaseInput
            className="mb-2.5"
            placeholder="Confirm new password"
            label="confirmPassword"
            type={showConfirmPassword ? 'text' : 'password'}
            icon={
              confirmPassword ? (
                showConfirmPassword ? (
                  <UilEyeSlash className="w-4" onClick={() => setShowConfirmPassword(false)} />
                ) : (
                  <UilEye className="w-4" onClick={() => setShowConfirmPassword(true)} />
                )
              ) : (
                <UilLock className="w-4" />
              )
            }
            register={register}
            required={true}
            minLength={{ value: 1, message: 'Password must not be empty' }}
            error={errors.confirmPassword}
          />

          <div className="mt-1 mb-2">
            <span className="text-red-60 text-sm font-medium">{bottomInfoError}</span>
          </div>

          <span className="text-xs font-normal text-neutral-500 text-justify mb-3">
            Internxt uses your password to encrypt and decrypt your files. Due to the secure nature of Internxt, we
            don't know your password. That means that if you forget it, your files will be gone. With us, you're the
            only owner of your files.
          </span>

          <BaseCheckbox
            label="acceptTerms"
            text="Accept terms, conditions and privacy policy"
            required={true}
            register={register}
            additionalStyling="mt-2 -mb-0"
          />

          <div className="mt-3" />
          <AuthButton
            isDisabled={isLoading || !isValid}
            text="Create an account"
            textWhenDisabled={isValid ? 'Encrypting...' : 'Create an account'}
          />
        </form>

        <div className="flex justify-center items-center w-full mt-2">
          <span className="text-sm text-neutral-500 ml-3 select-none mr-2">Already registered?</span>
          <Link to="/login">Log in </Link>
        </div>
      </div>
    </div>
  );
};

export default SignUpView;

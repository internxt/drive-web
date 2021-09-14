import { useState } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import * as bip39 from 'bip39';
import queryString from 'query-string';

import SideInfo from '../Authentication/SideInfo';
import { IFormValues, UserSettings } from '../../models/interfaces';
import localStorageService from '../../services/local-storage.service';
import analyticsService, { signupDevicesource, signupCampaignSource } from '../../services/analytics.service';
import { readReferalCookie } from '../../services/auth.service';
import BaseInput from '../../components/Inputs/BaseInput';
import CheckboxPrimary from '../../components/Checkboxes/CheckboxPrimary';
import AuthButton from '../../components/Buttons/AuthButton';
import { useAppDispatch } from '../../store/hooks';
import { decryptTextWithKey, encryptText, encryptTextWithKey, passToHash } from '../../lib/utils';
import { setUser, userActions, userThunks } from '../../store/slices/user';
import { getHeaders } from '../../lib/auth';
import { generateNewKeys } from '../../services/pgp.service';
import { UilLock, UilEyeSlash, UilEye, UilEnvelope, UilUser } from '@iconscout/react-unicons';
import { Link } from 'react-router-dom';
import { planThunks } from '../../store/slices/plan';
import { getAesInitFromEnv } from '../../services/keys.service';
import { aes, auth } from '@internxt/lib';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';
import { isValidPasswordRegex } from '@internxt/lib/dist/src/auth/isValidPassword';
import errorService from '../../services/error.service';
import { AppView } from '../../models/enums';
import navigationService from '../../services/navigation.service';

interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
}

const SignUp = (props: SignUpProps): JSX.Element => {
  const qs = queryString.parse(navigationService.history.location.search);
  const hasEmailParam = (qs.email && auth.isValidEmail(qs.email as string)) || false;
  const hasTokenParam = qs.token;
  // const hasReferrerParam = (qs.referrer && qs.referrer.toString()) || undefined;
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
  const [referrer] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [reCaptchaToken, setRecaptchaToken] = useState('');

  const formInputError = Object.values(errors)[0];

  let bottomInfoError: null | string = null;

  if (formInputError?.message) {
    bottomInfoError = formInputError.message;
  } else if (showError && signupError) {
    bottomInfoError = signupError.toString();
  }

  if (hasTokenParam && typeof hasTokenParam === 'string') {
    localStorageService.clear();
    localStorageService.set('xToken', hasTokenParam);
  }

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

    return fetch(`${process.env.REACT_APP_API_URL}/api/appsumo/update`, {
      method: 'POST',
      headers: getHeaders(true, false),
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
            signup_source: signupCampaignSource(window.location.search),
          },
          traits: {
            email: xUser.uuid,
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
          dispatch(setUser(xUser));
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
      publicKeyArmored: codpublicKey,
      revocationCertificate: codrevocationKey,
    } = await generateNewKeys();

    const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

    return fetch(`${process.env.REACT_APP_API_URL}/api/register`, {
      method: 'post',
      headers: getHeaders(true, true),
      body: JSON.stringify({
        name: name,
        lastname: lastname,
        email: email,
        password: encPass,
        mnemonic: encMnemonic,
        salt: encSalt,
        referral: readReferalCookie(),
        privateKey: encPrivateKey,
        publicKey: codpublicKey,
        revocationKey: codrevocationKey,
        referrer: referrer,
        captcha: captcha,
      }),
    })
      .then(async (response) => {
        if (response.status === 200) {
          const body = await response.json();
          const { token, uuid } = body;
          const user: UserSettings = body.user;

          user.privateKey = Buffer.from(aes.decrypt(user.privateKey, password)).toString('base64');

          analyticsService.trackSignUp({
            userId: uuid,
            properties: {
              signup_source: signupCampaignSource(window.location.search),
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
          dispatch(setUser({ ...user }));
          localStorageService.set('xMnemonic', user.mnemonic);

          dispatch(planThunks.initializeThunk());
          dispatch(userThunks.initializeUserThunk()).then(() => {
            navigationService.push(AppView.Drive);
          });
        } else {
          return response.json().then((body) => {
            if (body.error) {
              throw new Error(body.error);
            } else {
              throw new Error('Internal Server Error');
            }
          });
        }
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
      const { name, lastname, email, password, confirmPassword } = formData;

      if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (!props.isNewUser) {
        await updateInfo(name, lastname, email, password)
          .then(() => {
            navigationService.push(AppView.Login);
          })
          .catch((err) => {
            console.log('ERR', err);
            throw new Error(err.message + ', please contact us');
          });
      } else {
        await doRegister(name, lastname, email, password, reCaptchaToken);
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
      grecaptcha
        .execute(process.env.REACT_APP_RECAPTCHA_V3, {
          action: 'register',
        })
        .then((token) => {
          setRecaptchaToken(token);
          onSubmit(formValues);
        });
    });
  }

  return (
    <div className="flex h-full w-full">
      <SideInfo title="" subtitle="" />

      <div className="flex flex-col items-center justify-center w-full">
        <form className="flex flex-col w-72" onSubmit={handleSubmit(getReCaptcha)}>
          <span className="text-base font-semibold text-neutral-900 mt-1.5 mb-6">Create an Internxt account</span>

          <BaseInput
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

          <CheckboxPrimary
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

export default SignUp;

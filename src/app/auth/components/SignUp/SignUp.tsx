import { useState, useEffect } from 'react';
import { SubmitHandler, useForm, useWatch } from 'react-hook-form';
import * as bip39 from 'bip39';
import queryString from 'query-string';
import { aes, auth } from '@internxt/lib';
import { Link } from 'react-router-dom';

import {Eye, EyeSlash,} from 'phosphor-react';
import { emailRegexPattern } from '@internxt/lib/dist/src/auth/isValidEmail';
import { isValidPasswordRegex } from '@internxt/lib/dist/src/auth/isValidPassword';
import { Keys, RegisterDetails } from '@internxt/sdk/dist/auth';
import { readReferalCookie } from '../../services/auth.service';
import localStorageService from 'app/core/services/local-storage.service';
import analyticsService, { signupDevicesource, signupCampaignSource } from 'app/analytics/services/analytics.service';

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
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { referralsThunks } from 'app/store/slices/referrals';
import { SdkFactory } from '../../../core/factory/sdk';
import TextInput from '../../components/TextInput/TextInput';
import PasswordInput from '../../components/PasswordInput/PasswordInput';
import Button from '../../components/Button/Button';
//import bigLogo from 'assets/icons/big-logo.svg';
import testPasswordStrength from '@internxt/lib/dist/src/auth/testPasswordStrength';
import PasswordStrengthIndicator from 'app/shared/components/PasswordStrengthIndicator';

export interface SignUpProps {
  location: {
    search: string;
  };
  isNewUser: boolean;
  //onChange: (payload: { valid: boolean; password: string }) => void;
}

function SignUp(props: SignUpProps): JSX.Element {
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
  //const confirmPassword = useWatch({ control, name: 'confirmPassword', defaultValue: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState<Error | string>();
  const [showError, setShowError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  //const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordState, setPasswordState] = useState<{ tag: 'error' | 'warning' | 'success'; label: string } | null>(null);

  const [showPasswordIndicator, setShowPasswordIndicator] = useState(false);

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

  useEffect(() => {
    if(password.length>0) onChangeHandler(password);
    
  },[password]);

  function onChangeHandler(input: string) {
    const result = testPasswordStrength(input, (qs.email as string) === undefined? '' : (qs.email as string));
    if (!result.valid) {
      setPasswordState({
        tag: 'error',
        label:
          result.reason === 'NOT_COMPLEX_ENOUGH'
            ? 'Password is not complex enough'
            : 'Password has to be at least 8 characters long',
      });
    } else if (result.strength === 'medium') {
      setPasswordState({ tag: 'warning', label: 'Password is weak' });
    } else {
      setPasswordState({ tag: 'success', label: 'Password is strong' });
    }

    console.log(password);
   // props.onChange({ valid: result.valid, password: input });
  }

  const updateInfo = (email: string, password: string) => {
    // Setup hash and salt
    const hashObj = passToHash({ password: password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);

    // Setup mnemonic
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    // Body
    const body = {
      //name: name,
      //lastname: lastname,
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
            first_name: 'user',
            last_name: 'lastname',
            usage: 0,
            createdAt: new Date().toISOString(),
            signup_device_source: signupDevicesource(window.navigator.userAgent),
            acquisition_channel: signupCampaignSource(window.location.search),
          },
        });

        if (activate === 'activate') {
          analyticsService.trackPaymentConversion();
        }
        return dispatch(userThunks.initializeUserThunk()).then(() => {
          localStorageService.set('xToken', xToken);
          localStorageService.set('xMnemonic', mnemonic);
        });
      });
  };

  const doRegister = async (email: string, password: string, captcha: string) => {
    const hashObj = passToHash({ password: password });
    const encPass = encryptText(hashObj.hash);
    const encSalt = encryptText(hashObj.salt);
    const mnemonic = bip39.generateMnemonic(256);
    const encMnemonic = encryptTextWithKey(mnemonic, password);

    const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();
    const encPrivateKey = aes.encrypt(privateKeyArmored, password, getAesInitFromEnv());

    const authClient = SdkFactory.getInstance().createAuthClient();

    const keys: Keys = {
      privateKeyEncrypted: encPrivateKey,
      publicKey: publicKeyArmored,
      revocationCertificate: revocationCertificate,
    };
    const registerDetails: RegisterDetails = {
      name: 'user',
      lastname: 'lastname',
      email: email,
      password: encPass,
      salt: encSalt,
      mnemonic: encMnemonic,
      keys: keys,
      captcha: captcha,
      referral: readReferalCookie(),
      referrer: hasReferrer ? String(qs.ref) : undefined,
    };

    authClient
      .register(registerDetails)
      .then((data) => {
        const token = data.token;
        const user: UserSettings = {
          ...data.user,
          bucket: '',
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
            first_name: 'user',
            last_name: 'lastname',
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
        setIsLoading(false);
      });
  };

  const onSubmit: SubmitHandler<IFormValues> = async (formData) => {
    setIsLoading(true);
    try {
      const { email, password, token } = formData;

      /*if (password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }*/

      if (!props.isNewUser) {
        await updateInfo(email, password)
          .then(() => {
            dispatch(productsThunks.initializeThunk());
            dispatch(planThunks.initializeThunk());
            navigationService.push(AppView.Drive);
          })
          .catch((err) => {
            setIsLoading(false);
            console.log('ERR', err);
            throw new Error(err.message + ', please contact us');
          });
      } else {
        await doRegister(email, password, token);
      }
    } catch (err: unknown) {
      setIsLoading(false);
      const castedError = errorService.castError(err);
      setSignupError(castedError.message);
    } finally {
      setShowError(true);
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
    
        <div className="flex flex-col items-center justify-center w-96 h-fit rounded-2xl bg-white shadow-md">
          <form className="flex flex-col w-80" onSubmit={handleSubmit(getReCaptcha)}>
            <span className="text-2xl font-medium mt-10 mb-6">Create account</span>

            {/*<BaseInput
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
            />*/}
            <span className='mb-0.5'>  
              Email
            </span>
            <TextInput
              placeholder="Your email address"
              label="email"
              type="email"
              disabled={hasEmailParam}
              register={register}
              required={true}
              minLength={{ value: 1, message: 'Email must not be empty' }}
              pattern={{ value: emailRegexPattern, message: 'Email not valid' }}
              error={errors.email}
            />

            <span className='mb-0.5'>
              Password
            </span>

            <PasswordInput
              className = {passwordState? passwordState.tag : ''}
              placeholder="Password"
              label="password"
              type={showPassword ? 'text' : 'password'}
              icon={
               
                  showPassword ? (
                    <Eye className="w-6 h-6 font-medium" onClick={() => setShowPassword(false)} />
                  ) : (
                    <EyeSlash className="w-6 h-6 font-medium" onClick={() => setShowPassword(true)} />
                  )
                
              }
              register={register}
              onChange={onChangeHandler}
              onFocus={() => setShowPasswordIndicator(true)}
              onBlur={() => setShowPasswordIndicator(false)}
              required={true}
              //minLength={{ value: 8, message: 'The password must be at least 8 characters long' }}
              error={errors.password}
              /*pattern={{
                value: isValidPasswordRegex,
                message: 'The password must contain lowercase/uppercase letters and at least a number',
              }}*/
            />

             {showPasswordIndicator && passwordState && (
            <PasswordStrengthIndicator className="mt-2" strength={passwordState.tag} label={passwordState.label} />
             )}
            {/*<BaseInput
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
            />*/}
            

            <div className="mt-1 mb-2">
              <span className="text-red-60 text-sm font-medium">{bottomInfoError}</span>
            </div>

            {/*<span className="text-xs font-normal text-neutral-500 text-justify mb-3">
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
            />*/}

            <div className="mt-3" />
            <Button
              disabled={isLoading}
              text="Create account"
              disabledText={isValid ? 'Encrypting...' : 'Create account'}
              loading={isLoading}
              type="primary"
            />
          </form>
          <div className="flex justify-center items-center w-full mt-2 mb-6">
            <span className='text-gray-50 text-xs mr-1'>
              By creating an account you accept the 
            </span>
            <Link to="/legal" className='text-gray-50 text-xs'>
              terms and conditions
            </Link>
          </div>

          <div className="flex justify-center items-center w-full mt-2 mb-10">
            <span className="text-sm text-neutral-500 ml-3 select-none mr-2">Already have an account?</span>
            <Link to="/login" className='cursor-pointer text-sm text-center no-underline font-medium text-blue-60 hover:text-blue-80 appearance-none'>Log in </Link>
          </div>
        </div>
    
  );
};

export default SignUp;

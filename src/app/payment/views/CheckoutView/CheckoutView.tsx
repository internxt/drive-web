import { ProductFeaturesComponent } from './components/ProductCardComponent';
import { HeaderComponent } from './components/Header';
import { DisplayPrice } from '@internxt/sdk/dist/drive/payments/types';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import Button from 'app/shared/components/Button/Button';
import { SubmitHandler, useForm } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import { useSignUp } from 'app/auth/components/SignUp/useSignUp';
import { useAppDispatch, useAppSelector } from 'app/store/hooks';
import paymentService from 'app/payment/services/payment.service';
import { AuthMethodTypes, PAYMENT_ELEMENT_OPTIONS, PasswordStateProps } from './types';
import { UserAuthComponent } from './components/UserAuthComponent';
import { useEffect, useState } from 'react';
import authCheckoutService from './services/auth-checkout.service';
import { getDatabaseProfileAvatar } from 'app/drive/services/database.service';
import notificationsService, { ToastType } from 'app/notifications/services/notifications.service';
import databaseService from 'app/database/services/database.service';
import localStorageService from 'app/core/services/local-storage.service';
import RealtimeService from 'app/core/services/socket.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import checkoutService from './services/checkout.service';

interface CheckoutViewProps {
  isLoading: boolean;
  selectedPlan: DisplayPrice | null;
  passwordState: PasswordStateProps | null;
  onShowPasswordIndicator: (showPwdIndicator: boolean) => void;
  showPasswordIndicator: boolean;
}

const CheckoutView = ({
  isLoading,
  selectedPlan,
  passwordState,
  showPasswordIndicator,
  onShowPasswordIndicator,
}: CheckoutViewProps) => {
  let type: string;
  let clientSecret: string;

  const { translate } = useTranslationContext();

  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useAppSelector((state) => state.user.user);
  const fullName = `${user?.name} ${user?.lastname}`;
  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);

  const {
    register,
    formState: { errors },
    handleSubmit,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  const userData = {
    name: fullName,
    avatar: avatarBlob,
  };

  useEffect(() => {
    if (isAuthenticated) {
      setAuthMethod('userIsSignedIn');
      getDatabaseProfileAvatar().then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null));
    }
  }, [user]);

  const stripe = useStripe();
  const elements = useElements();
  const [authMethod, setAuthMethod] = useState<AuthMethodTypes>('signUp');

  const { doRegister } = useSignUp('activate');

  function onAuthMethodToggled(authMethod: AuthMethodTypes) {
    setAuthMethod(authMethod);
  }

  const handleError = (error) => {
    notificationsService.show({
      text: error,
      type: ToastType.Error,
    });
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signIn');
  };

  const handleCheckout: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();

    let userData;

    // Sign up for the user
    const { email, password, token } = formData;

    if (user) {
      userData = {
        name: fullName,
        email: user.email,
      };
    } else {
      userData = {
        name: 'My Internxt',
        email: email,
      };
    }

    try {
      if (authMethod === 'signIn') {
        console.log('signin');
        authCheckoutService.logIn(email, password, '', dispatch);
      } else if (authMethod === 'signUp') {
        console.log('signup');
        authCheckoutService.signUp(doRegister, email, password, token, dispatch);
      }

      // Call the payments Service to:
      if (!stripe || !elements) {
        // Stripe.js hasn't yet loaded.
        // Make sure to disable form submission until Stripe.js has loaded.
        return;
      }

      // Get customer or create one
      const { customerId } = await paymentService.getCustomerId(userData.fullName, userData.email);

      // Trigger form validation and wallet collection before the creation of the subscription or PI (Payment Intent)
      const { error: submitError } = await elements.submit();
      if (submitError) {
        handleError(submitError);
        console.error('ERROR GETTING WALLET INFO AND VALIDATING FORM', submitError);
        return;
      }
      // Create the subscription or paymentIntent and get the clientSecret for both cases
      if (selectedPlan?.interval === 'lifetime') {
        const { clientSecretType, client_secret } = await checkoutService.getClientSecretForPaymentIntent(
          customerId,
          selectedPlan.amount,
          selectedPlan.id,
        );

        type = clientSecretType;
        clientSecret = client_secret;
      } else {
        const { clientSecretType, client_secret } = await checkoutService.getClientSecretForSubscriptionIntent(
          customerId,
          selectedPlan?.id as string,
        );

        type = clientSecretType;
        clientSecret = client_secret;
      }

      // Confirm payment method using the Stripe SDK
      // 1. Use the correct confirm method (Payment/Setup)
      const confirmIntent = type === 'setup' ? stripe.confirmSetup : stripe.confirmPayment;

      // 2. Confirm payment with the necessary data
      const { error } = await confirmIntent({
        elements,
        clientSecret,
        confirmParams: {
          return_url: 'http://localhost:3000/checkout/success',
        },
      });

      // 3. Handle Error
      if (error) {
        console.log('ERROR IN PAYMENT INTENT CONFIRMATION: ', error);
      } else {
        console.log('PAYMENT IS DONE!');
      }
    } catch (err) {
      const error = err as Error;

      console.log('ERROR CREATING SUB: ', error.stack ?? error.message);
    }
  };

  return (
    <div className="flex h-full overflow-y-scroll bg-gray-1 px-16 py-10 lg:w-screen">
      <div className="mx-auto flex w-full max-w-screen-xl">
        <div className="flex w-full flex-col space-y-16">
          {/* Header */}
          <div className="flex flex-col space-y-16">
            <HeaderComponent />
            <p className="text-3xl font-bold text-gray-100">{translate('checkout.title')}</p>
          </div>
          {!isLoading && selectedPlan ? (
            <div className="relative flex flex-row justify-between">
              <div className="flex w-full max-w-xl flex-col space-y-14">
                <UserAuthComponent
                  errors={errors}
                  passwordState={passwordState}
                  register={register}
                  setShowPasswordIndicator={onShowPasswordIndicator}
                  showPasswordIndicator={showPasswordIndicator}
                  authMethod={authMethod}
                  onAuthMethodToggled={onAuthMethodToggled}
                  userData={userData}
                  onLogOut={onLogOut}
                />

                {/* PAYMENT SECTION */}
                <form className="flex flex-col space-y-8 pb-20" onSubmit={handleSubmit(handleCheckout)}>
                  <p className="text-2xl font-semibold text-gray-100">2. {translate('checkout.paymentTitle')}</p>
                  <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
                  <Button type="submit" id="submit">
                    {translate('checkout.pay')}
                  </Button>
                </form>
              </div>

              <div className="flex w-full max-w-lg flex-col space-y-5">
                <ProductFeaturesComponent selectedPlan={selectedPlan} />
              </div>
            </div>
          ) : (
            <LoadingPulse />
          )}
        </div>
      </div>
    </div>
  );
};

export default CheckoutView;

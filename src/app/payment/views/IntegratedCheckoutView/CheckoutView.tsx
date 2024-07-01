import { ProductFeaturesComponent } from '../../components/checkout/ProductCardComponent';
import { HeaderComponent } from '../../components/checkout/Header';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import Button from 'app/shared/components/Button/Button';
import { SubmitHandler, useForm } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import { useAppSelector } from 'app/store/hooks';
import paymentService from 'app/payment/services/payment.service';
import {
  AuthMethodTypes,
  CouponCodeData,
  PartialErrorState,
  ErrorType,
  PAYMENT_ELEMENT_OPTIONS,
  CurrentPlanSelected,
} from '../../types';
import { UserAuthComponent } from '../../components/checkout/UserAuthComponent';
import { useEffect, useState } from 'react';
import { getDatabaseProfileAvatar } from 'app/drive/services/database.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import checkoutService from '../../services/checkout.service';
import { useSelector } from 'react-redux';
import { RootState } from 'app/store';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

interface CheckoutViewProps {
  selectedPlan: CurrentPlanSelected | null;
  authMethod: AuthMethodTypes;
  error?: PartialErrorState;
  couponCodeData?: CouponCodeData;
  upsellManager: {
    isUpsellSwitchActivated: boolean;
    showUpsellSwitch: boolean;
    onUpsellSwitchButtonClicked: () => void;
    amountSaved: number | undefined;
    amount: number | undefined;
  };
  onCouponInputChange: (promoCode: string) => void;
  authenticateUser: (email: string, password: string, token: string) => Promise<void>;
  onLogOut: () => Promise<void>;
  handleError: (type: ErrorType, error: string) => void;
  handleAuthMethod: (method: AuthMethodTypes) => void;
}

const CheckoutView = ({
  selectedPlan,
  couponCodeData,
  authMethod,
  error,
  upsellManager,
  onCouponInputChange,
  authenticateUser,
  onLogOut,
  handleError,
  handleAuthMethod,
}: CheckoutViewProps) => {
  let type: string;
  let clientSecret: string;

  const { translate } = useTranslationContext();

  const stripe = useStripe();
  const elements = useElements();
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useSelector<RootState, UserSettings>((state) => state.user.user!);

  const [avatarBlob, setAvatarBlob] = useState<Blob | null>(null);
  const [isExecutingPaymentAndAuth, setIsExecutingPaymentAndAuth] = useState<boolean>(false);

  const fullName = `${user?.name} ${user?.lastname}`;

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  const userData = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email,
  };

  useEffect(() => {
    if (isAuthenticated) {
      handleAuthMethod('userIsSignedIn');
      getDatabaseProfileAvatar()
        .then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null))
        .catch((err) => {
          //
        });
    }
  }, [user]);

  function onAuthMethodToggled(authMethod: AuthMethodTypes) {
    handleAuthMethod(authMethod);
    reset(undefined, { keepErrors: false, keepValues: false });
  }

  const handleCheckout: SubmitHandler<IFormValues> = async (formData, event) => {
    event?.preventDefault();
    setIsExecutingPaymentAndAuth(true);

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

    await authenticateUser(email, password, token);

    try {
      if (!stripe || !elements) {
        handleError('stripe', 'Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const { customerId } = await paymentService.getCustomerId(userData.name, userData.email);

      const { error: submitError } = await elements.submit();

      if (submitError) {
        handleError('stripe', submitError.message as string);
        console.error('Error getting wallet info and validating form', submitError.message);
        return;
      }

      if (selectedPlan?.interval === 'lifetime') {
        const { clientSecretType, client_secret } = await checkoutService.getClientSecretForPaymentIntent(
          customerId,
          selectedPlan.amount,
          selectedPlan.id,
          couponCodeData?.codeId,
        );

        type = clientSecretType;
        clientSecret = client_secret;
      } else {
        const { clientSecretType, client_secret } = await checkoutService.getClientSecretForSubscriptionIntent(
          customerId,
          selectedPlan?.id as string,
          couponCodeData?.codeId,
        );
        type = clientSecretType;
        clientSecret = client_secret;
      }

      const confirmIntent = type === 'setup' ? stripe.confirmSetup : stripe.confirmPayment;

      const { error } = await confirmIntent({
        elements,
        clientSecret,
        confirmParams: {
          return_url: 'http://localhost:3000/checkout/success',
        },
      });

      if (error) {
        handleError('stripe', 'Something went wrong while confirming payment. Try again.');
        console.error('Error in payment intent confirmation: ', error.message);
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error creating subscription: ', error.stack ?? error.message);
    } finally {
      setIsExecutingPaymentAndAuth(false);
    }
  };

  return (
    <form
      className="flex h-full overflow-y-scroll bg-gray-1 lg:w-screen lg:px-16"
      onSubmit={handleSubmit(handleCheckout)}
    >
      <div className="mx-auto flex w-full max-w-screen-xl px-5 py-10">
        <div className="flex w-full flex-col space-y-8 lg:space-y-16">
          <HeaderComponent />
          <p className="text-xl font-bold text-gray-100 md:text-center lg:text-left lg:text-3xl">
            {translate('checkout.title')}
          </p>
          {selectedPlan ? (
            <div className="flex flex-col items-center justify-center lg:flex-row lg:items-start lg:justify-between">
              <div className="flex w-full max-w-xl flex-col space-y-14">
                <UserAuthComponent
                  errors={errors}
                  authError={error?.auth}
                  register={register}
                  authMethod={authMethod}
                  onAuthMethodToggled={onAuthMethodToggled}
                  userData={userData}
                  onLogOut={onLogOut}
                />
                <div className="flex flex-col space-y-8 pb-20">
                  <p className="text-2xl font-semibold text-gray-100">2. {translate('checkout.paymentTitle')}</p>
                  <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
                  {error?.stripe && <div className="text-red-dark">{error.stripe}</div>}
                  <Button type="submit" id="submit" className="hidden lg:flex">
                    {isExecutingPaymentAndAuth && isValid ? 'Paying...' : translate('checkout.pay')}
                  </Button>
                </div>
              </div>
              <div className="flex w-full max-w-lg flex-col space-y-5">
                <ProductFeaturesComponent
                  selectedPlan={selectedPlan}
                  couponCodeData={couponCodeData}
                  couponError={error?.coupon}
                  onCouponInputChange={onCouponInputChange}
                  upsellManager={upsellManager}
                />
                <Button type="submit" id="submit" className="flex lg:hidden">
                  {isExecutingPaymentAndAuth && isValid ? 'Paying...' : translate('checkout.pay')}
                </Button>
              </div>
            </div>
          ) : (
            <LoadingPulse />
          )}
        </div>
      </div>
    </form>
  );
};

export default CheckoutView;

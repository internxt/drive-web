import { BaseSyntheticEvent, useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { useSelector } from 'react-redux';
import { Stripe, StripeElements, StripeElementsOptions, StripeElementsOptionsMode } from '@stripe/stripe-js';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DisplayPrice, UserType } from '@internxt/sdk/dist/drive/payments/types';

import { useCheckout } from 'hooks/checkout/useCheckout';
import { useSignUp } from '../../../auth/components/SignUp/useSignUp';
import envService from '../../../core/services/env.service';
import errorService from '../../../core/services/error.service';
import localStorageService from '../../../core/services/local-storage.service';
import navigationService from '../../../core/services/navigation.service';
import RealtimeService from '../../../core/services/socket.service';
import { AppView, IFormValues } from '../../../core/types';
import databaseService from '../../../database/services/database.service';
import { getDatabaseProfileAvatar } from '../../../drive/services/database.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import notificationsService, { ToastType } from '../../../notifications/services/notifications.service';
import checkoutService from '../../../payment/services/checkout.service';
import paymentService from '../../../payment/services/payment.service';
import LoadingPulse from '../../../shared/components/LoadingPulse/LoadingPulse';
import { RootState } from '../../../store';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { planThunks } from '../../../store/slices/plan';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { getProductAmount } from '../../components/checkout/ProductCardComponent';
import authCheckoutService from '../../services/auth-checkout.service';
import { checkoutReducer, initialStateForCheckout } from '../../store/checkoutReducer';
import { AuthMethodTypes, CouponCodeData, RequestedPlanData } from '../../types';
import CheckoutView from './CheckoutView';
import ChangePlanDialog from '../../../newSettings/Sections/Account/Plans/components/ChangePlanDialog';
import { fetchPlanPrices, getStripe } from '../../../newSettings/Sections/Account/Plans/api/plansApi';

export const THEME_STYLES = {
  dark: {
    backgroundColor: 'rgb(17 17 17)',
    textColor: 'rgb(255 255 255)',
    borderColor: 'rgb(58, 58, 59)',
    borderInputColor: 'rgb(142, 142, 148)',
    labelTextColor: 'rgb(229 229 235)',
  },
  light: {
    backgroundColor: 'rgb(255 255 255)',
    textColor: 'rgb(17 17 17)',
    borderColor: 'rgb(229, 229, 235)',
    borderInputColor: 'rgb(174, 174, 179)',
    labelTextColor: 'rgb(58 58 59)',
  },
};

const BORDER_SHADOW = 'rgb(0 102 255)';

export type UpsellManagerProps = {
  isUpsellSwitchActivated: boolean;
  showUpsellSwitch: boolean;
  onUpsellSwitchButtonClicked: () => void;
  amountSaved: number | undefined;
  amount: number | undefined;
};

export interface UserInfoProps {
  avatar: Blob | null;
  name: string;
  email: string;
}

export interface CheckoutViewManager {
  onCouponInputChange: (coupon: string) => void;
  onLogOut: () => Promise<void>;
  onCountryChange: (country: string) => void;
  onCheckoutButtonClicked: (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => Promise<void>;
  onRemoveAppliedCouponCode: () => void;
  handleAuthMethodChange: (method: AuthMethodTypes) => void;
  onUserNameFromAddressElementChange: (userName: string) => void;
}

const ONE_YEAR_IN_MONTHS = 12;

const IS_PRODUCTION = envService.isProduction();

const RETURN_URL_DOMAIN = IS_PRODUCTION ? process.env.REACT_APP_HOSTNAME : 'http://localhost:3000';

let stripe;

function savePaymentDataInLocalStorage(
  subscriptionId: string | undefined,
  paymentIntentId: string | undefined,
  selectedPlan: RequestedPlanData | undefined,
  users: number,
  couponCodeData: CouponCodeData | undefined,
) {
  if (subscriptionId) localStorageService.set('subscriptionId', subscriptionId);
  if (paymentIntentId) localStorageService.set('paymentIntentId', paymentIntentId);
  if (selectedPlan) {
    const amountToPay = getProductAmount(selectedPlan.decimalAmount, users, couponCodeData)?.toFixed(2);
    localStorageService.set('amountPaid', amountToPay);
  }
}

const CheckoutViewWrapper = () => {
  const dispatch = useAppDispatch();
  const { translate } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [state, dispatchReducer] = useReducer(checkoutReducer, initialStateForCheckout);
  const isAuthenticated = useAppSelector((state) => state.user.isAuthenticated);
  const user = useSelector<RootState, UserSettings | undefined>((state) => state.user.user);
  const { doRegister } = useSignUp('activate');
  const userAuthComponentRef = useRef<HTMLDivElement>(null);

  const fullName = `${user?.name} ${user?.lastname}`;
  const isUserAuthenticated = !!user;
  const thereIsAnyError = state.error?.coupon || state.error?.auth || state.error?.stripe;

  const {
    onRemoveAppliedCouponCode,
    setAuthMethod,
    setAvatarBlob,
    setCouponCodeName,
    setError,
    setIsUserPaying,
    setPlan,
    setPromoCodeData,
    setSelectedPlan,
    setStripeElementsOptions,
    setUserNameFromElementAddress,
    setSeatsForBusinessSubscription,
  } = useCheckout(dispatchReducer);

  const [isUpsellSwitchActivated, setIsUpsellSwitchActivated] = useState<boolean>(false);
  const [isCheckoutReadyToRender, setIsCheckoutReadyToRender] = useState<boolean>(false);
  const [isUpdateSubscriptionDialogOpen, setIsUpdateSubscriptionDialogOpen] = useState<boolean>(false);
  const [isUpdatingSubscription, setIsUpdatingSubscription] = useState<boolean>(false);
  const [prices, setPrices] = useState<DisplayPrice[]>();
  const [country, setCountry] = useState<string>('');
  const {
    authMethod,
    currentSelectedPlan,
    plan,
    avatarBlob,
    userNameFromAddressElement,
    couponCodeData,
    elementsOptions,
    promoCodeName,
    seatsForBusinessSubscription,
  } = state;
  const canChangePlanDialogBeOpened = prices && currentSelectedPlan && isUpdateSubscriptionDialogOpen;

  const userInfo: UserInfoProps = {
    name: fullName,
    avatar: avatarBlob,
    email: user?.email ?? '',
  };

  const upsellManager = {
    onUpsellSwitchButtonClicked: () => {
      setIsUpsellSwitchActivated(!isUpsellSwitchActivated);
      const planType = isUpsellSwitchActivated ? 'selectedPlan' : 'upsellPlan';
      const stripeElementsOptions = {
        ...(elementsOptions as StripeElementsOptionsMode),
        amount: plan![planType].amount,
      };
      setSelectedPlan(plan![planType]);
      setStripeElementsOptions(stripeElementsOptions);
    },
    isUpsellSwitchActivated,
    showUpsellSwitch: !!plan?.upsellPlan,
    amountSaved: plan?.upsellPlan
      ? (plan?.selectedPlan.amount * ONE_YEAR_IN_MONTHS - plan?.upsellPlan.amount) / 100
      : undefined,
    amount: plan?.upsellPlan?.decimalAmount,
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('planId');
    const promotionCode = params.get('couponCode');
    const currency = params.get('currency');

    const currencyValue = currency ?? 'eur';

    if (!planId) {
      navigationService.push(AppView.Drive);
      return;
    }

    handleFetchSelectedPlan(planId, currencyValue)
      .then((plan) => {
        if (checkoutTheme && plan) {
          if (promotionCode) {
            handleFetchPromotionCode(plan.selectedPlan.id, promotionCode).catch((err) => {
              const showPromoCodeErrorNotification = true;
              handlePromoCodeError(err, showPromoCodeErrorNotification);
            });
          }

          checkoutService.loadStripeElements(THEME_STYLES[checkoutTheme as string], onLoadElements, plan);
          getStripe(stripe).then((stripePromise) => (stripe = stripePromise));
          fetchPrices(plan.selectedPlan.type)
            .then(setPrices)
            .catch((error) => {
              const errorCasted = errorService.castError(error);
              errorService.reportError(errorCasted);
            });
          setIsCheckoutReadyToRender(true);
        }
      })
      .catch((error) => {
        errorService.reportError(error);
        if (user) {
          navigationService.push(AppView.Drive);
        } else {
          navigationService.push(AppView.Signup);
        }
      });
  }, [checkoutTheme]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setAuthMethod('userIsSignedIn');
      getDatabaseProfileAvatar()
        .then((avatarData) => setAvatarBlob(avatarData?.avatarBlob ?? null))
        .catch(() => {
          //
        });
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (promoCodeName && currentSelectedPlan) {
      handleFetchPromotionCode(currentSelectedPlan?.id, promoCodeName).catch(handlePromoCodeError);
    }
  }, [promoCodeName]);

  useEffect(() => {
    if (thereIsAnyError) {
      setTimeout(() => {
        setError('auth', undefined);
        setError('stripe', undefined);
        setError('coupon', undefined);
      }, 8000);
    }
  }, [state.error]);

  const onLoadElements = (stripeElementsOptions: StripeElementsOptions) => {
    setStripeElementsOptions(stripeElementsOptions);
  };

  const onChangePlanClicked = async (priceId: string, currency: string) => {
    setIsUpdatingSubscription(true);
    await handleSubscriptionPayment(priceId);
    setIsUpdateSubscriptionDialogOpen(false);
    setIsUpdatingSubscription(false);
    navigationService.push(AppView.Drive);
  };

  const showSuccessSubscriptionNotification = useCallback(
    () => notificationsService.show({ text: 'Subscription updated successfully', type: ToastType.Success }),
    [translate],
  );

  const showCancelSubscriptionErrorNotification = useCallback(
    () =>
      notificationsService.show({
        text: translate('notificationMessages.errorCancelSubscription'),
        type: ToastType.Error,
      }),
    [translate],
  );

  const handlePaymentSuccess = () => {
    showSuccessSubscriptionNotification();
    dispatch(planThunks.initializeThunk()).unwrap();
  };

  const handleSubscriptionPayment = async (priceId: string) => {
    try {
      stripe = await getStripe(stripe);
      const updatedSubscription = await paymentService.updateSubscriptionPrice(priceId);
      if (updatedSubscription.request3DSecure) {
        stripe
          .confirmCardPayment(updatedSubscription.clientSecret)
          .then(async (result) => {
            if (result.error) {
              notificationsService.show({
                type: ToastType.Error,
                text: result.error.message as string,
              });
            } else {
              handlePaymentSuccess();
            }
          })
          .catch((err) => {
            const error = errorService.castError(err);
            errorService.reportError(error);
            showCancelSubscriptionErrorNotification();
          });
      } else {
        handlePaymentSuccess();
      }
    } catch (err) {
      const error = errorService.castError(err);
      errorService.reportError(error);
      showCancelSubscriptionErrorNotification();
    }
  };

  const fetchPrices = useCallback(async (userType: UserType) => {
    const individualPrices = await fetchPlanPrices(userType);

    return individualPrices;
  }, []);

  const onCheckoutButtonClicked = async (
    formData: IFormValues,
    event: BaseSyntheticEvent<object, any, any> | undefined,
    stripeSDK: Stripe | null,
    elements: StripeElements | null,
  ) => {
    event?.preventDefault();

    setIsUserPaying(true);

    const { email, password, companyName, companyVatId } = formData;
    const userData = getUserInfo(email, userNameFromAddressElement, fullName, user);
    const isStripeNotLoaded = !stripeSDK || !elements;
    const customerName = companyName ?? userData.name;

    try {
      await authCheckoutService.authenticateUser(email, password, authMethod, dispatch, doRegister);
    } catch (err) {
      const error = err as Error;
      setError('auth', error.message);
      (userAuthComponentRef.current as any).scrollIntoView();
      errorService.reportError(error);
      setIsUserPaying(false);
      return;
    }

    try {
      if (isStripeNotLoaded) {
        console.error('Stripe.js has not loaded yet. Please try again later.');
        return;
      }

      const { error: elementsError } = await elements.submit();

      if (elementsError) {
        throw new Error(elementsError.message);
      }

      const { customerId, token } = await paymentService.getCustomerId(
        customerName,
        userData.email,
        country,
        companyVatId,
      );

      const { clientSecret, type, subscriptionId, paymentIntentId } = await checkoutService.getClientSecret(
        currentSelectedPlan as RequestedPlanData,
        token,
        customerId,
        couponCodeData?.codeId,
        seatsForBusinessSubscription,
      );

      // TEMPORARY HOT FIX
      // Store subscriptionId, paymentIntendId, and amountPaid to send to IMPACT API
      // need to check all rest of needed values to add it to analytics in trackPaymentConversion function
      savePaymentDataInLocalStorage(
        subscriptionId,
        paymentIntentId,
        plan?.selectedPlan,
        seatsForBusinessSubscription,
        couponCodeData,
      );

      const confirmIntent = type === 'setup' ? stripeSDK.confirmSetup : stripeSDK.confirmPayment;

      const { error } = await confirmIntent({
        elements,
        clientSecret,
        confirmParams: {
          return_url: `${RETURN_URL_DOMAIN}/checkout/success`,
        },
      });

      if (error) {
        setError('stripe', error.message as string);
      }
    } catch (err) {
      if (!(err as any).status) {
        notificationsService.show({
          text: translate('notificationMessages.errorCreatingSubscription'),
          type: ToastType.Error,
        });
        errorService.reportError(err);
      }

      if ((err as any).status === 409) {
        setIsUpdateSubscriptionDialogOpen(true);
      } else if ((err as any).status === 422) {
        notificationsService.show({
          text: translate('notificationMessages.couponIsNotValidForUserError'),
          type: ToastType.Error,
        });
      }
    } finally {
      setIsUserPaying(false);
    }
  };

  const handleFetchSelectedPlan = async (planId: string, currency?: string) => {
    const plan = await checkoutService.fetchPlanById(planId, currency);
    setPlan(plan);
    setSelectedPlan(plan.selectedPlan);
    if (plan.selectedPlan.minimumSeats) {
      setSeatsForBusinessSubscription(plan.selectedPlan.minimumSeats);
    }

    return plan;
  };

  const handleFetchPromotionCode = async (priceId: string, promotionCode: string) => {
    const promoCodeData = await checkoutService.fetchPromotionCodeByName(priceId, promotionCode);
    const promoCode = {
      codeId: promoCodeData.codeId,
      codeName: promotionCode,
      amountOff: promoCodeData.amountOff,
      percentOff: promoCodeData.percentOff,
    };
    setPromoCodeData(promoCode);
  };

  const onLogOut = async () => {
    await databaseService.clear();
    localStorageService.clear();
    RealtimeService.getInstance().stop();
    setAuthMethod('signUp');
  };

  const getUserInfo = (email: string, userNameFromAddressElement: string, fullName: string, user?: UserSettings) => {
    let userData;

    if (user) {
      userData = {
        name: fullName,
        email: user.email,
      };
    } else {
      userData = {
        name: userNameFromAddressElement,
        email: email,
      };
    }

    return userData;
  };

  const handlePromoCodeError = (err: unknown, showNotification?: boolean) => {
    const error = err as Error;
    const errorMessage = error.message.includes('Promotion code with an id')
      ? error.message
      : 'Something went wrong, try again later';
    setError('coupon', errorMessage);
    errorService.reportError(error);
    setPromoCodeData(undefined);

    if (showNotification) {
      notificationsService.show({
        text: errorMessage,
        type: ToastType.Error,
      });
    }
  };

  const onCountryChange = (country: string) => {
    setCountry(country);
  };

  const onSeatsChange = (seats: number) => {
    const minSeats = currentSelectedPlan?.minimumSeats;
    const maxSeats = currentSelectedPlan?.maximumSeats;

    if (maxSeats && seats > maxSeats) {
      setSeatsForBusinessSubscription(maxSeats);
    } else if (minSeats && seats < minSeats) {
      setSeatsForBusinessSubscription(minSeats);
    } else {
      setSeatsForBusinessSubscription(seats);
    }
  };

  const checkoutViewManager: CheckoutViewManager = {
    onCouponInputChange: setCouponCodeName,
    onLogOut,
    onCheckoutButtonClicked,
    onRemoveAppliedCouponCode,
    onCountryChange,
    handleAuthMethodChange: setAuthMethod,
    onUserNameFromAddressElementChange: setUserNameFromElementAddress,
  };

  return (
    <>
      {isCheckoutReadyToRender && elementsOptions && stripe ? (
        <Elements stripe={stripe} options={elementsOptions}>
          <CheckoutView
            checkoutViewVariables={state}
            userAuthComponentRef={userAuthComponentRef}
            userInfo={userInfo}
            isUserAuthenticated={isUserAuthenticated}
            upsellManager={upsellManager}
            authMethod={authMethod}
            checkoutViewManager={checkoutViewManager}
            onUsersChange={onSeatsChange}
          />
          {canChangePlanDialogBeOpened ? (
            <ChangePlanDialog
              prices={prices}
              isDialogOpen={isUpdateSubscriptionDialogOpen}
              setIsDialogOpen={setIsUpdateSubscriptionDialogOpen}
              onPlanClick={onChangePlanClicked}
              priceIdSelected={currentSelectedPlan.id}
              isUpdatingSubscription={isUpdatingSubscription}
              subscriptionSelected={UserType.Individual}
            />
          ) : undefined}
        </Elements>
      ) : (
        <LoadingPulse />
      )}
    </>
  );
};

export default CheckoutViewWrapper;

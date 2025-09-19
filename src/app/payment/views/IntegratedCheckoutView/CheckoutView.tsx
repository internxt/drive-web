import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { Button, Loader } from '@internxt/ui';
import { AddressElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { OptionalB2BDropdown } from 'app/payment/components/checkout/OptionalB2BDropdown';
import { State } from 'app/payment/store/types';
import { LegacyRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckoutProductCard } from '../../components/checkout/CheckoutProductCard';
import { CheckoutUserAuth } from '../../components/checkout/CheckoutUserAuth';
import { HeaderComponent } from '../../components/checkout/Header';
import { AuthMethodTypes, PaymentType } from '../../types';
import { CheckoutViewManager, UserInfoProps } from './types/checkout.types';
import { CryptoCurrency } from '@internxt/sdk/dist/payments/types';
import { AvailableCryptoCurrenciesDropdown } from 'app/payment/components/checkout/AvailableCryptoCurrenciesDropdown';

export const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  wallets: {
    applePay: 'auto',
    googlePay: 'auto',
  },
  layout: {
    type: 'accordion',
    defaultCollapsed: true,
    radios: false,
    spacedAccordionItems: true,
  },
};

interface CheckoutViewProps {
  userInfo: UserInfoProps;
  isUserAuthenticated: boolean;
  showHardcodedRenewal?: string;
  showCouponCode: boolean;
  userAuthComponentRef: LegacyRef<HTMLDivElement>;
  checkoutViewVariables: State & {
    selectedCurrency: string;
  };
  checkoutViewManager: CheckoutViewManager;
  availableCryptoCurrencies?: CryptoCurrency[];
  onCurrencyTypeChanges: (currency: PaymentType) => void;
}

const AUTH_METHOD_VALUES = {
  IS_SIGNED_IN: 'userIsSignedIn',
};

const CheckoutView = ({
  userInfo,
  isUserAuthenticated,
  showCouponCode,
  showHardcodedRenewal,
  userAuthComponentRef,
  checkoutViewVariables,
  checkoutViewManager,
  availableCryptoCurrencies,
  onCurrencyTypeChanges,
}: CheckoutViewProps) => {
  const { translate } = useTranslationContext();
  // Those custom hooks should be here.
  // They cannot be moved to the Parent, because it must be wrapped by <Elements> component.
  const stripeSDK = useStripe();
  const elements = useElements();
  const [isCryptoDropdownOpen, setIsCryptoDropdownOpen] = useState<boolean>(false);

  const onCryptoDropdownToggle = () => {
    if (!isCryptoDropdownOpen) {
      elements?.getElement('payment')?.collapse();
    }

    onCurrencyTypeChanges(PaymentType['CRYPTO']);
    setIsCryptoDropdownOpen(!isCryptoDropdownOpen);
  };

  const onStripePaymentExpanded = () => {
    onCurrencyTypeChanges(PaymentType['FIAT']);
    setIsCryptoDropdownOpen(false);
  };

  const {
    isPaying,
    error,
    authMethod,
    couponCodeData,
    seatsForBusinessSubscription,
    currentSelectedPlan,
    selectedCurrency,
  } = checkoutViewVariables;

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  if (!currentSelectedPlan || !currentSelectedPlan.price || !currentSelectedPlan.taxes) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-1">
        <Loader type="pulse" />
      </div>
    );
  }

  const isButtonDisabled = authMethod === AUTH_METHOD_VALUES.IS_SIGNED_IN ? isPaying : isPaying && isValid;

  function onAuthMethodToggled(authMethod: AuthMethodTypes) {
    reset({
      email: '',
      password: '',
    });
    checkoutViewManager.handleAuthMethodChange(authMethod);
  }

  const handleFormSubmit = (formData: IFormValues, event: any) => {
    event.preventDefault();
    checkoutViewManager.onCheckoutButtonClicked(formData, event, stripeSDK, elements);
  };

  const isBusinessPlan = currentSelectedPlan.price.type === UserType.Business;

  return (
    <form
      className="flex h-full overflow-y-scroll bg-gray-1 lg:w-screen xl:px-16"
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <div className="mx-auto flex w-full max-w-screen-xl px-5 py-10">
        <div className="flex w-full flex-col space-y-8 lg:space-y-16">
          <HeaderComponent isUserAuthenticated={isUserAuthenticated} />
          <p className="text-xl font-bold text-gray-100 md:text-center lg:text-left lg:text-3xl">
            {translate('checkout.title')}
          </p>
          <div className="flex flex-col items-center justify-center gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex w-full max-w-xl flex-col space-y-14" ref={userAuthComponentRef}>
              <CheckoutUserAuth
                errors={errors}
                authError={error?.auth}
                register={register}
                authMethod={authMethod}
                onAuthMethodToggled={onAuthMethodToggled}
                userData={userInfo}
                onLogOut={checkoutViewManager.onLogOut}
              />
              <div className="flex flex-col space-y-8 pb-20">
                <p className="text-2xl font-semibold text-gray-100">2. {translate('checkout.addressBillingTitle')}</p>
                <div className="flex w-full flex-col items-center gap-10">
                  <div className="flex w-full flex-col rounded-2xl border border-gray-10 bg-surface p-5">
                    <AddressElement
                      onChange={(e) => {
                        checkoutViewManager.onUserNameFromAddressElementChange(e.value.name);
                        checkoutViewManager.onCountryChange(e.value.address.country);
                        checkoutViewManager.onPostalCodeChange(e.value.address.postal_code);
                      }}
                      options={{
                        mode: 'billing',
                        autocomplete: {
                          mode: 'automatic',
                        },
                      }}
                    />
                  </div>
                  {isBusinessPlan ? (
                    <OptionalB2BDropdown errors={errors} register={register} translate={translate} />
                  ) : undefined}
                </div>
                <p className="text-2xl font-semibold text-gray-100">3. {translate('checkout.paymentTitle')}</p>
                <div className="flex flex-col w-full gap-2">
                  <PaymentElement
                    options={PAYMENT_ELEMENT_OPTIONS}
                    onChange={(event) => {
                      if (!event.collapsed) {
                        onStripePaymentExpanded();
                      }
                    }}
                  />
                  {availableCryptoCurrencies && (
                    <AvailableCryptoCurrenciesDropdown
                      availableCryptoCurrencies={availableCryptoCurrencies}
                      selectedCurrency={selectedCurrency}
                      isDropdownOpen={isCryptoDropdownOpen}
                      onDropdownClicked={onCryptoDropdownToggle}
                      onCryptoChanges={checkoutViewManager.onCurrencyChange}
                    />
                  )}
                </div>
                {error?.stripe && (
                  <div id="stripeError" className="text-red-dark">
                    {error.stripe}
                  </div>
                )}
                <Button type="submit" id="submit-create-account" className="hidden lg:flex" disabled={isButtonDisabled}>
                  {isButtonDisabled ? translate('checkout.processing') : translate('checkout.pay')}
                </Button>
              </div>
            </div>
            <div className="top-5 flex w-full max-w-xl flex-col gap-5 pb-10 lg:sticky lg:max-w-lg">
              <CheckoutProductCard
                selectedPlan={currentSelectedPlan}
                couponCodeData={couponCodeData}
                showHardcodedRenewal={showHardcodedRenewal}
                showCouponCode={showCouponCode}
                couponError={error?.coupon}
                seatsForBusinessSubscription={seatsForBusinessSubscription}
                onSeatsChange={checkoutViewManager.onSeatsChange}
                onCouponInputChange={checkoutViewManager.onCouponInputChange}
                onRemoveAppliedCouponCode={checkoutViewManager.onRemoveAppliedCouponCode}
              />
              <Button type="submit" id="submit" className="flex lg:hidden" disabled={isButtonDisabled}>
                {isButtonDisabled ? translate('checkout.processing') : translate('checkout.pay')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CheckoutView;

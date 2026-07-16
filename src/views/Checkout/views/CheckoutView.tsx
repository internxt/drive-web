import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { Loader } from '@internxt/ui';
import { AddressElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { LegacyRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import TextInput from 'components/TextInput';
import { CheckoutProductCard } from '../components/CheckoutProductCard';
import { CheckoutUserAuth } from '../components/CheckoutUserAuth';
import { HeaderComponent } from '../components/Header';
import { AuthMethodTypes, PaymentType } from '../types';
import { CheckoutViewManager, UserInfoProps } from '../types/checkout.types';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { AvailableCryptoCurrenciesDropdown } from '../components/AvailableCryptoCurrenciesDropdown';

export const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  wallets: {
    applePay: 'auto',
    googlePay: 'auto',
  },
  layout: {
    type: 'accordion',
    radios: false,
    spacedAccordionItems: true,
  },
};

interface CheckoutViewProps {
  userInfo: UserInfoProps;
  isUserAuthenticated: boolean;
  showCouponCode: boolean;
  userAuthComponentRef: LegacyRef<HTMLDivElement>;
  checkoutViewVariables: {
    isPaying: boolean;
    authMethod: AuthMethodTypes;
    authError?: string;
    couponCodeError?: string;
    couponCodeData?: CouponCodeData;
    currentSelectedPlan: PriceWithTax | null;
    selectedCurrency: string;
  };
  checkoutViewManager: CheckoutViewManager;
  availableCryptoCurrencies?: CryptoCurrency[];
  onCurrencyTypeChanges: (currency: PaymentType) => void;
  isPostalCodeRequired?: boolean;
}

const AUTH_METHOD_VALUES = {
  IS_SIGNED_IN: 'userIsSignedIn',
};

const CheckoutView = ({
  userInfo,
  isUserAuthenticated,
  showCouponCode,
  userAuthComponentRef,
  checkoutViewVariables,
  checkoutViewManager,
  availableCryptoCurrencies,
  onCurrencyTypeChanges,
  isPostalCodeRequired,
}: CheckoutViewProps) => {
  const { translate } = useTranslationContext();
  // Those custom hooks should be here.
  // They cannot be moved to the Parent, because it must be wrapped by <Elements> component.
  const stripeSDK = useStripe();
  const elements = useElements();
  const [isCryptoDropdownOpen, setIsCryptoDropdownOpen] = useState<boolean>(false);
  const [postalCode, setPostalCode] = useState<string>('');
  const { isPaying, couponCodeError, authError, authMethod, couponCodeData, currentSelectedPlan, selectedCurrency } =
    checkoutViewVariables;

  const onCryptoDropdownToggle = () => {
    if (!isCryptoDropdownOpen) {
      elements?.getElement('payment')?.collapse();
    }

    onCurrencyTypeChanges(PaymentType['CRYPTO']);
    setIsCryptoDropdownOpen(!isCryptoDropdownOpen);
  };

  const onStripePaymentExpanded = () => {
    onCurrencyTypeChanges(PaymentType['FIAT']);
    checkoutViewManager.onCurrencyChange(currentSelectedPlan?.price.currency ?? 'eur');
    setIsCryptoDropdownOpen(false);
  };

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  if (!currentSelectedPlan?.price || !currentSelectedPlan?.taxes) {
    return (
      <div className="flex h-full items-center justify-center bg-gray-1">
        <Loader type="pulse" />
      </div>
    );
  }

  const isPaymentProcessing = authMethod === AUTH_METHOD_VALUES.IS_SIGNED_IN ? isPaying : isPaying && isValid;

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

  return (
    <form
      className="flex h-full overflow-y-scroll bg-gray-1 lg:w-screen xl:px-16"
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <div className="mx-auto flex w-full max-w-screen-xl px-5 py-10">
        <div className="flex w-full flex-col space-y-8 lg:space-y-16">
          <HeaderComponent isUserAuthenticated={isUserAuthenticated} />
          <div className="flex flex-col items-center justify-center lg:flex-row lg:items-start lg:justify-between">
            <div className="flex w-full max-w-xl flex-col space-y-14" ref={userAuthComponentRef}>
              <CheckoutUserAuth
                errors={errors}
                register={register}
                authMethod={authMethod}
                authError={authError}
                onAuthMethodToggled={onAuthMethodToggled}
                userData={userInfo}
                onLogOut={checkoutViewManager.onLogOut}
              />
              <div className="flex flex-col space-y-8 pb-14 lg:pb-20">
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
                  {isPostalCodeRequired && !isCryptoDropdownOpen && (
                    <div className="flex w-full flex-col gap-1 pt-2">
                      <p className="text-sm text-gray-80">{translate('checkout.postalCode.title')}</p>
                      <TextInput
                        placeholder={translate('checkout.postalCode.placeholder')}
                        autoComplete="postal-code"
                        value={postalCode}
                        onChange={(e) => {
                          setPostalCode(e.target.value);
                          checkoutViewManager.onPostalCodeChanges(e.target.value);
                        }}
                      />
                    </div>
                  )}
                  {isCryptoDropdownOpen && (
                    <div className="mt-2 flex w-full flex-col space-y-4 rounded-2xl border border-gray-10 bg-surface p-5">
                      <p className="font-medium text-gray-100">{translate('checkout.addressBillingTitle')}</p>
                      <AddressElement
                        onChange={(e) => {
                          checkoutViewManager.onUserNameChanges(e.value.name);
                          checkoutViewManager.onUserAddressChanges(e.value.address);
                        }}
                        options={{
                          mode: 'billing',
                          autocomplete: {
                            mode: 'automatic',
                          },
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="lg:top-5 flex w-full max-w-xl flex-col gap-5 pb-10 lg:sticky lg:max-w-lg">
              <CheckoutProductCard
                selectedPlan={currentSelectedPlan}
                couponCodeData={couponCodeData}
                showCouponCode={showCouponCode}
                couponError={couponCodeError}
                onCouponInputChange={checkoutViewManager.onCouponInputChange}
                onRemoveAppliedCouponCode={checkoutViewManager.onRemoveAppliedCouponCode}
                isPaymentProcessing={isPaymentProcessing}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default CheckoutView;

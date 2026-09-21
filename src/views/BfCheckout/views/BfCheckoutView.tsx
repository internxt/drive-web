import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { CryptoCurrency, PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { useElements, useStripe } from '@stripe/react-stripe-js';
import { IFormValues } from 'app/core/types';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { BaseSyntheticEvent, LegacyRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CheckoutLoader } from 'views/Checkout/components/CheckoutLoader';
import { AuthMethodTypes, PaymentType } from 'views/Checkout/types';
import { CheckoutViewManager, UserInfoProps } from 'views/Checkout/types/checkout.types';
import { BfCheckoutAccountFields } from '../components/BfCheckoutAccountFields';
import { BfCheckoutHeader } from '../components/BfCheckoutHeader';
import { BfCheckoutHero } from '../components/BfCheckoutHero';
import { BfCheckoutOrderSummary } from '../components/BfCheckoutOrderSummary';
import { BfCheckoutPaymentSection } from '../components/BfCheckoutPaymentSection';
import { OfferCountdownCard } from '../components/OfferCountdownCard';
import { BF_CHECKOUT_CARD_CLASSNAME, BF_CHECKOUT_VARIANT_IMAGE, BfCheckoutVariant } from '../constants';
import { getBfCheckoutPlanSummary } from '../utils/getBfCheckoutPlanSummary';

const AUTH_METHOD_VALUES = {
  IS_SIGNED_IN: 'userIsSignedIn',
};

const PAGE_BACKGROUND_STYLE = {
  backgroundImage:
    'radial-gradient(120% 80% at 80% 0%, rgba(20, 114, 255, 0.18) 0%, rgba(6, 11, 20, 0) 60%), ' +
    'linear-gradient(180deg, #070D19 0%, #050910 100%)',
};

interface BfCheckoutViewProps {
  userInfo: UserInfoProps;
  variant: BfCheckoutVariant;
  userAuthComponentRef: LegacyRef<HTMLDivElement>;
  checkoutViewVariables: {
    isPaying: boolean;
    authMethod: AuthMethodTypes;
    authError?: string;
    couponCodeData?: CouponCodeData;
    currentSelectedPlan: PriceWithTax | null;
    selectedCurrency: string;
  };
  checkoutViewManager: CheckoutViewManager;
  availableCryptoCurrencies?: CryptoCurrency[];
  onCurrencyTypeChanges: (currency: PaymentType) => void;
}

const BfCheckoutView = ({
  userInfo,
  variant,
  userAuthComponentRef,
  checkoutViewVariables,
  checkoutViewManager,
  availableCryptoCurrencies,
  onCurrencyTypeChanges,
}: BfCheckoutViewProps): JSX.Element => {
  const stripeSDK = useStripe();
  const elements = useElements();
  const { translate } = useTranslationContext();
  const [isCryptoDropdownOpen, setIsCryptoDropdownOpen] = useState<boolean>(false);
  const { isPaying, authError, authMethod, couponCodeData, currentSelectedPlan, selectedCurrency } =
    checkoutViewVariables;

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  if (!currentSelectedPlan?.price || !currentSelectedPlan?.taxes) {
    return <CheckoutLoader />;
  }

  const planSummary = getBfCheckoutPlanSummary(currentSelectedPlan, translate, couponCodeData);
  const priceLabel = `${planSummary.currencySymbol}${planSummary.discountedAmount}`;
  const isPaymentProcessing = authMethod === AUTH_METHOD_VALUES.IS_SIGNED_IN ? isPaying : isPaying && isValid;

  const onAuthMethodToggled = (newAuthMethod: AuthMethodTypes) => {
    reset({
      email: '',
      password: '',
    });
    checkoutViewManager.handleAuthMethodChange(newAuthMethod);
  };

  const onStripePaymentExpanded = () => {
    onCurrencyTypeChanges(PaymentType['FIAT']);
    checkoutViewManager.onCurrencyChange(currentSelectedPlan.price.currency);
    setIsCryptoDropdownOpen(false);
  };

  const onCryptoDropdownToggle = () => {
    if (!isCryptoDropdownOpen) {
      elements?.getElement('payment')?.collapse();
    }

    onCurrencyTypeChanges(PaymentType['CRYPTO']);
    setIsCryptoDropdownOpen(!isCryptoDropdownOpen);
  };

  const handleFormSubmit = (formData: IFormValues, event?: BaseSyntheticEvent) => {
    event?.preventDefault();
    checkoutViewManager.onCheckoutButtonClicked(formData, event, stripeSDK, elements);
  };

  return (
    <form
      className="h-full min-h-screen w-full overflow-y-auto"
      style={PAGE_BACKGROUND_STYLE}
      onSubmit={handleSubmit(handleFormSubmit)}
    >
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-10 px-5 py-8 sm:px-8">
        <BfCheckoutHeader />
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          <div className="w-full lg:w-1/2">
            <BfCheckoutHero planSummary={planSummary} creativeImage={BF_CHECKOUT_VARIANT_IMAGE[variant]} />
          </div>
          <div className="flex w-full flex-col gap-5 pb-10 lg:sticky lg:top-8 lg:w-1/2" ref={userAuthComponentRef}>
            <OfferCountdownCard
              storage={planSummary.storage}
              priceLabel={priceLabel}
              discountPercent={planSummary.discountPercent}
            />
            <div className={`flex flex-col gap-5 p-5 ${BF_CHECKOUT_CARD_CLASSNAME}`}>
              <BfCheckoutOrderSummary planSummary={planSummary} />
              <BfCheckoutAccountFields
                authMethod={authMethod}
                authError={authError}
                errors={errors}
                register={register}
                userData={userInfo}
                onAuthMethodToggled={onAuthMethodToggled}
                onLogOut={checkoutViewManager.onLogOut}
              />
              <BfCheckoutPaymentSection
                planSummary={planSummary}
                isPaymentProcessing={isPaymentProcessing}
                selectedCurrency={selectedCurrency}
                isCryptoDropdownOpen={isCryptoDropdownOpen}
                onPaymentExpanded={onStripePaymentExpanded}
                onCryptoDropdownToggle={onCryptoDropdownToggle}
                onCryptoChanges={checkoutViewManager.onCurrencyChange}
                onUserAddressChanges={checkoutViewManager.onUserAddressChanges}
                onUserNameChanges={checkoutViewManager.onUserNameChanges}
                availableCryptoCurrencies={availableCryptoCurrencies}
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default BfCheckoutView;

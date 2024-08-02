import { ProductFeaturesComponent } from '../../components/checkout/ProductCardComponent';
import { HeaderComponent } from '../../components/checkout/Header';
import LoadingPulse from 'app/shared/components/LoadingPulse/LoadingPulse';
import { AddressElement, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import Button from 'app/shared/components/Button/Button';
import { useForm } from 'react-hook-form';
import { IFormValues } from 'app/core/types';
import { AuthMethodTypes } from '../../types';
import { UserAuthComponent } from '../../components/checkout/UserAuthComponent';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import { StripePaymentElementOptions } from '@stripe/stripe-js';
import { CheckoutViewManager, CheckoutViewVariables } from './CheckoutViewWrapper';

export const PAYMENT_ELEMENT_OPTIONS: StripePaymentElementOptions = {
  wallets: {
    applePay: 'auto',
    googlePay: 'auto',
  },
  layout: {
    type: 'accordion',
    defaultCollapsed: false,
    radios: false,
    spacedAccordionItems: true,
  },
};

interface CheckoutViewProps {
  authMethod: AuthMethodTypes;
  checkoutViewVariables: CheckoutViewVariables;
  checkoutViewManager: CheckoutViewManager;
}

const CheckoutView = ({ authMethod, checkoutViewVariables, checkoutViewManager }: CheckoutViewProps) => {
  const { translate } = useTranslationContext();
  // This custom hooks should be here. They cannot be moved to the Parent, because it must be wrapped by <Elements> component.
  const stripeSDK = useStripe();
  const elements = useElements();

  const { isPaying, error, userInfo, couponCodeData, currentSelectedPlan, upsellManager } = checkoutViewVariables;

  const {
    register,
    formState: { errors, isValid },
    handleSubmit,
    reset,
  } = useForm<IFormValues>({
    mode: 'onChange',
  });

  function onAuthMethodToggled(authMethod: AuthMethodTypes) {
    checkoutViewManager.handleAuthMethodChange(authMethod);
    reset(undefined, { keepErrors: false, keepValues: false });
  }

  return (
    <form
      className="flex h-full overflow-y-scroll bg-gray-1 lg:w-screen xl:px-16"
      onSubmit={handleSubmit((formData, event) =>
        checkoutViewManager.onCheckoutButtonClicked(formData, event, stripeSDK, elements),
      )}
    >
      <div className="mx-auto flex w-full max-w-screen-xl px-5 py-10">
        <div className="flex w-full flex-col space-y-8 lg:space-y-16">
          <HeaderComponent />
          <p className="text-xl font-bold text-gray-100 md:text-center lg:text-left lg:text-3xl">
            {translate('checkout.title')}
          </p>
          {currentSelectedPlan ? (
            <div className="flex flex-col items-center justify-center gap-10 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex w-full max-w-xl flex-col space-y-14">
                <UserAuthComponent
                  errors={errors}
                  authError={error?.auth}
                  register={register}
                  authMethod={authMethod}
                  onAuthMethodToggled={onAuthMethodToggled}
                  userData={userInfo}
                  onLogOut={checkoutViewManager.onLogOut}
                />
                <div className="flex flex-col space-y-8 pb-20">
                  <p className="text-2xl font-semibold text-gray-100">2. {translate('checkout.paymentTitle')}</p>
                  <AddressElement
                    onChange={(e) => {
                      checkoutViewManager.onUserNameFromAddressElementChange(e.value.name as string);
                    }}
                    options={{
                      mode: 'billing',
                      autocomplete: {
                        mode: 'automatic',
                      },
                    }}
                  />
                  <PaymentElement options={PAYMENT_ELEMENT_OPTIONS} />
                  {error?.stripe && <div className="text-red-dark">{error.stripe}</div>}
                  <Button type="submit" id="submit" className="hidden lg:flex" disabled={isPaying && isValid}>
                    {isPaying && isValid ? translate('checkout.paying') : translate('checkout.pay')}
                  </Button>
                </div>
              </div>
              <div className="top-5 flex w-full max-w-xl flex-col gap-5 pb-10 lg:sticky lg:max-w-lg lg:pb-0">
                <ProductFeaturesComponent
                  selectedPlan={currentSelectedPlan}
                  couponCodeData={couponCodeData}
                  couponError={error?.coupon}
                  onCouponInputChange={checkoutViewManager.onCouponInputChange}
                  upsellManager={upsellManager}
                  onRemoveAppliedCouponCode={checkoutViewManager.onRemoveAppliedCouponCode}
                />
                <Button type="submit" id="submit" className="flex lg:hidden" disabled={isPaying && isValid}>
                  {isPaying && isValid ? translate('checkout.paying') : translate('checkout.pay')}
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

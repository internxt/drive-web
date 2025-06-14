import { useMemo, useState } from 'react';
import { Switch, Transition } from '@headlessui/react';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { Check, SealPercent, X } from '@phosphor-icons/react';

import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import TextInput from '../../../share/components/ShareItemDialog/components/TextInput';
import { Button } from '@internxt/ui';
import { useThemeContext } from '../../../theme/ThemeProvider';
import GuaranteeDarkDays from 'assets/icons/checkout/guarantee-dark.svg?react';
import GuaranteeWhiteDays from 'assets/icons/checkout/guarantee-white.svg?react';
import { CouponCodeData, Currency } from '../../types';
import { SelectSeatsComponent } from './SelectSeatsComponent';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { UpsellManagerProps } from 'app/payment/views/IntegratedCheckoutView/CheckoutViewWrapper';
import { formatPrice } from 'app/payment/utils/formatPrice';

interface CheckoutProductCardProps {
  selectedPlan: PriceWithTax;
  seatsForBusinessSubscription: number;
  showCouponCode: boolean;
  showHardcodedRenewal?: string;
  upsellManager: UpsellManagerProps;
  onSeatsChange: (users: number) => void;
  onRemoveAppliedCouponCode: () => void;
  onCouponInputChange: (promoCode: string) => void;
  couponCodeData?: CouponCodeData;
  couponError?: string;
}

const Separator = () => <div className="border border-gray-10" />;

export const CheckoutProductCard = ({
  selectedPlan,
  couponCodeData,
  showCouponCode,
  showHardcodedRenewal,
  couponError,
  seatsForBusinessSubscription,
  upsellManager,
  onSeatsChange,
  onRemoveAppliedCouponCode,
  onCouponInputChange,
}: CheckoutProductCardProps) => {
  const { translate, translateList } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [couponName, setCouponName] = useState<string>('');
  const [openCouponCodeDropdown, setOpenCouponCodeDropdown] = useState<boolean>(false);
  const bytes = bytesToString(selectedPlan.price.bytes);
  const currencySymbol = Currency[selectedPlan.price.currency];
  const normalPriceAmount = selectedPlan.price.decimalAmount;

  const { isUpsellSwitchActivated, showUpsellSwitch, onUpsellSwitchButtonClicked } = upsellManager;
  const isBusiness = selectedPlan.price.type === UserType.Business;
  const perUserLabel = isBusiness ? translate('checkout.productCard.perUser') : undefined;
  const totalLabel = isBusiness
    ? translate('checkout.productCard.totalForBusiness', {
        N: seatsForBusinessSubscription,
      })
    : translate('checkout.productCard.total');
  const renewalPeriodLabel = `${translate('checkout.productCard.renewalPeriod.renewsAt')}
          ${currencySymbol}${normalPriceAmount}/${translate(
            `checkout.productCard.renewalPeriod.${selectedPlan.price.interval}`,
          )}`;

  const planAmountWithoutTaxes = getProductAmount(selectedPlan.price.decimalAmount, 1, couponCodeData);
  const upsellPlanAmount =
    upsellManager.amount && getProductAmount(upsellManager.amount, seatsForBusinessSubscription, couponCodeData);
  const discountPercentage =
    couponCodeData?.amountOff && couponCodeData?.amountOff < selectedPlan.taxes.amountWithTax
      ? ((couponCodeData?.amountOff / selectedPlan.taxes.amountWithTax) * 100).toFixed(2)
      : undefined;

  const planType = isBusiness ? 'businessPlanFeaturesList' : 'planFeaturesList';

  const productLabel = translate(`preferences.account.plans.${planType}.${bytes}.title`) ?? bytes;
  const featureKeys =
    translateList(`preferences.account.plans.${planType}.${bytes ?? 'freeFeatures'}.features`, {
      returnObjects: true,
    }) ?? translateList('preferences.account.plans.planFeaturesList.1GB.features');

  const comingSoonFeatureKeys = useMemo(() => {
    const result = translateList(`preferences.account.plans.${planType}.${bytes}.comingSoonFeatures`);
    return Array.isArray(result) ? result : [];
  }, [planType, bytes, translateList]);

  return (
    <div className="flex w-full flex-col space-y-4 overflow-y-auto">
      <div className="flex w-full flex-row items-center justify-between space-x-4">
        <p className="text-2xl font-semibold text-gray-100">{translate('checkout.productCard.title')}</p>
        <div className="flex flex-row space-x-2">
          {checkoutTheme === 'dark' ? <GuaranteeWhiteDays className="h-12" /> : <GuaranteeDarkDays className="h-12" />}
        </div>
      </div>
      <div className="flex w-full rounded-2xl border border-gray-10 bg-surface p-5">
        <div className="flex w-full flex-col space-y-5">
          <p>{translate('checkout.productCard.selectedPlan')}</p>
          <p className="text-2xl font-bold text-gray-100">
            {productLabel + ' - ' + translate(`checkout.productCard.renewalTitle.${selectedPlan.price.interval}`)}
          </p>
          {isBusiness && selectedPlan.price?.maximumSeats && selectedPlan.price?.minimumSeats ? (
            <>
              <p className="text-lg font-medium">
                {translate('checkout.productCard.numberOfUsers', {
                  seats: seatsForBusinessSubscription,
                })}
              </p>
              <SelectSeatsComponent
                maxSeats={selectedPlan.price?.maximumSeats}
                minSeats={selectedPlan.price?.minimumSeats}
                seats={seatsForBusinessSubscription}
                onSeatsChange={onSeatsChange}
              />
            </>
          ) : undefined}
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">
              {translate(`checkout.productCard.billed.${selectedPlan.price.interval}`)}
              {perUserLabel}
            </p>
            <p className="font-semibold">
              {currencySymbol}
              {planAmountWithoutTaxes}
            </p>
          </div>

          {selectedPlan.taxes.decimalTax > 0 && (
            <div className="flex flex-row items-center justify-between text-gray-100">
              <p className="font-medium">{translate('checkout.productCard.taxes')}</p>
              <p className="font-semibold">
                {currencySymbol}
                {selectedPlan.taxes.decimalTax}
              </p>
            </div>
          )}
          {couponCodeData && (
            <div className="flex flex-row items-center justify-between font-semibold">
              <div className="flex flex-row items-center space-x-2 text-green-dark">
                <SealPercent weight="fill" size={24} />
                <p>
                  {translate('checkout.productCard.saving', {
                    percent: couponCodeData?.percentOff ?? discountPercentage,
                  })}
                </p>
              </div>
              <p className="text-gray-50 line-through">
                {currencySymbol}
                {normalPriceAmount}
              </p>
            </div>
          )}
          <Separator />
          <div className="flex flex-col space-y-5">
            <p className="font-medium text-gray-100">{translate('checkout.productCard.planDetails')}</p>
            <div className="flex flex-col space-y-4">
              {featureKeys.map((feature) => (
                <div key={feature} className="flex flex-row items-center space-x-2">
                  <Check className="text-green-dark" size={16} weight="bold" />
                  <p className="text-gray-100">{feature}</p>
                </div>
              ))}

              {comingSoonFeatureKeys.length > 0 &&
                comingSoonFeatureKeys?.map((feature) => (
                  <div key={feature} className="flex flex-row items-center space-x-2">
                    <Check className="text-green-dark" size={16} weight="bold" />
                    <p className="text-gray-100">{feature}</p>

                    <span className="rounded-md bg-orange/10 px-1 text-center text-orange">
                      {translate('preferences.account.plans.planFeaturesList.comingSoon')}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          <Separator />
          <div className="flex flex-row items-center justify-between text-2xl font-semibold text-gray-100">
            <p>{totalLabel}</p>
            <p>
              {currencySymbol}
              {formatPrice(selectedPlan.taxes.decimalAmountWithTax * seatsForBusinessSubscription)}
            </p>
          </div>

          {showUpsellSwitch && upsellManager.amountSaved && (
            <>
              <div className="flex w-full flex-row items-center justify-between">
                <div className="flex flex-row items-center gap-4">
                  <Switch
                    checked={isUpsellSwitchActivated}
                    onChange={onUpsellSwitchButtonClicked}
                    className={`${
                      isUpsellSwitchActivated ? 'bg-green' : 'bg-gray-10'
                    } relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span
                      id="switchButton"
                      className={`${
                        isUpsellSwitchActivated ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </Switch>

                  <div className="flex h-full rounded-lg bg-green/10 px-3 py-1">
                    <p className="text-sm text-green">
                      {translate('checkout.productCard.amountSaved')}
                      {currencySymbol}
                      {upsellManager.amountSaved}
                    </p>
                  </div>
                  <p className="font-medium text-gray-80">{translate('checkout.productCard.withAnnualBilling')}</p>
                </div>
                <div className="flex flex-row items-center">
                  <p className="text-sm text-gray-80">
                    {currencySymbol}
                    {upsellPlanAmount}/{translate('views.account.tabs.account.view.subscription.yearly')}
                  </p>
                </div>
              </div>
              <Separator />
            </>
          )}
          {showCouponCode && (
            <>
              {couponCodeData?.codeName ? (
                <div className="flex w-full flex-row justify-between">
                  <p className={'font-medium text-gray-50'}>{translate('checkout.productCard.addCoupon.inputText')}</p>
                  <div className="flex flex-row items-center gap-2">
                    <p className="text-lg font-medium text-gray-50">{couponCodeData.codeName}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        onRemoveAppliedCouponCode();
                      }}
                    >
                      <X size={20} className="text-gray-50" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      setOpenCouponCodeDropdown(!openCouponCodeDropdown);
                    }}
                    className={'flex rounded-lg text-base transition-all duration-75 ease-in-out hover:underline'}
                  >
                    {translate('checkout.productCard.addCoupon.buttonTitle')}
                  </button>
                  <Transition
                    show={openCouponCodeDropdown}
                    className={'left-0'}
                    enter="transition duration-50 ease-out"
                    enterFrom="scale-98 opacity-0"
                    enterTo="scale-100 opacity-100"
                    leave="transition duration-50 ease-out"
                    leaveFrom="scale-98 opacity-100"
                    leaveTo="scale-100 opacity-0"
                  >
                    <div className="w-full items-center outline-none">
                      <div className="flex w-full flex-col items-start space-y-1">
                        <p className="text-sm text-gray-80">{translate('checkout.productCard.addCoupon.inputText')}</p>
                        <div className="flex w-full flex-row space-x-3">
                          <TextInput
                            value={couponName}
                            onChange={(e) => {
                              e.preventDefault();
                              setCouponName(e.target.value);
                            }}
                            placeholder={translate('checkout.productCard.addCoupon.inputText')}
                            min={0}
                            style={{
                              textTransform: 'uppercase',
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                e.stopPropagation();
                                onCouponInputChange(couponName.toUpperCase().trim());
                                setCouponName('');
                              }
                            }}
                            data-cy={'coupon-code-input'}
                            className={'inxt-input input-primary dark:bg-transparent'}
                          />
                          <Button
                            disabled={!couponName?.length}
                            onClick={() => {
                              if (couponName) onCouponInputChange(couponName.toUpperCase().trim());
                            }}
                          >
                            {translate('checkout.productCard.apply')}
                          </Button>
                        </div>
                        {couponError && <p className="text-red-dark">{couponError}</p>}
                      </div>
                    </div>
                  </Transition>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {couponCodeData && selectedPlan.price.interval !== 'lifetime' && (
        <p className="text-gray-60">{renewalPeriodLabel}</p>
      )}
      {showHardcodedRenewal && <p className="text-gray-60">{showHardcodedRenewal}</p>}
    </div>
  );
};

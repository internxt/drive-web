import { Transition } from '@headlessui/react';
import { CouponCodeData } from '@internxt/sdk/dist/drive/payments/types/types';
import { Check, SealPercent, X } from '@phosphor-icons/react';
import { useState } from 'react';

import { PriceWithTax } from '@internxt/sdk/dist/payments/types';
import { Button } from '@internxt/ui';
import { formatPrice } from '../utils/formatPrice';
import { getProductAmount } from '../utils/getProductAmount';
import GuaranteeDarkDays from 'assets/icons/checkout/guarantee-dark.svg?react';
import GuaranteeWhiteDays from 'assets/icons/checkout/guarantee-white.svg?react';
import { bytesToString } from 'app/drive/services/size.service';
import { useTranslationContext } from 'app/i18n/provider/TranslationProvider';
import TextInput from 'components/TextInput';
import { useThemeContext } from 'app/theme/ThemeProvider';
import { Currency } from '../types';

interface CheckoutProductCardProps {
  selectedPlan: PriceWithTax;
  showCouponCode: boolean;
  showHardcodedRenewal?: string;
  onRemoveAppliedCouponCode: () => void;
  onCouponInputChange: (promoCode?: string) => void;
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
  onRemoveAppliedCouponCode,
  onCouponInputChange,
}: CheckoutProductCardProps) => {
  const { translate, translateList } = useTranslationContext();
  const { checkoutTheme } = useThemeContext();
  const [couponName, setCouponName] = useState<string>('');
  const [openCouponCodeDropdown, setOpenCouponCodeDropdown] = useState<boolean>(false);

  if (!selectedPlan?.price || !selectedPlan?.taxes) {
    console.warn('CheckoutProductCard: selectedPlan is missing price or taxes data');
    return null;
  }

  const priceData = selectedPlan.price;
  const taxesData = selectedPlan.taxes;

  const bytes = bytesToString(priceData.bytes);
  const currencySymbol = Currency[priceData.currency];
  const normalPriceAmount = priceData.decimalAmount;

  const totalLabel = translate('checkout.productCard.total');

  const planAmountWithoutTaxes = getProductAmount(priceData.decimalAmount, 1, couponCodeData);
  const totalAmountFormatted = formatPrice(taxesData.decimalAmountWithTax);
  const derivedTax = Math.max(0, Number(totalAmountFormatted) - Number(planAmountWithoutTaxes));
  const derivedTaxFormatted = formatPrice(derivedTax);

  const isHiddenCoupon = couponCodeData?.codeName === 'SPECIAL';

  const discountPercentage =
    couponCodeData?.amountOff && couponCodeData?.amountOff < taxesData.amountWithTax
      ? ((couponCodeData?.amountOff / taxesData.amountWithTax) * 100).toFixed(2)
      : undefined;

  const planType = 'planFeaturesList';

  const specificTitleKey = `preferences.account.plans.${planType}.${bytes}.title`;
  const specificTransalatedKey = translate(specificTitleKey);
  const productLabel =
    specificTransalatedKey === specificTitleKey
      ? translate('preferences.account.plans.planFeaturesList.default.bytesTitle', { bytes })
      : specificTransalatedKey;

  const specificFeatures = translateList(`preferences.account.plans.${planType}.${bytes}.features`, {
    returnObjects: true,
  });
  const featureKeys = Array.isArray(specificFeatures)
    ? specificFeatures
    : translateList('preferences.account.plans.planFeaturesList.default.features', { bytes, returnObjects: true });

  const featuresList = Array.isArray(
    translateList(`preferences.account.plans.${planType}.${bytes}.comingSoonFeatures`),
  );
  const comingSoonFeatureKeys = Array.isArray(featuresList) ? featuresList : [];

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
            {productLabel + ' - ' + translate(`checkout.productCard.renewalTitle.${priceData.interval}`)}
          </p>
          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">{translate(`checkout.productCard.billed.${priceData.interval}`)}</p>
            <p className="font-semibold">
              {currencySymbol}
              {planAmountWithoutTaxes}
            </p>
          </div>

          {Number(derivedTaxFormatted) > 0 && (
            <div className="flex flex-row items-center justify-between text-gray-100">
              <p className="font-medium">{translate('checkout.productCard.taxes')}</p>
              <p className="font-semibold">
                {currencySymbol}
                {derivedTaxFormatted}
              </p>
            </div>
          )}
          {couponCodeData && !isHiddenCoupon && (
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
              {totalAmountFormatted}
            </p>
          </div>

          {showCouponCode && !isHiddenCoupon && (
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
                        onCouponInputChange();
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
                            className={'flex-1'}
                            inputClassName={
                              'dark:bg-transparent placeholder:text-[16px] border-gray-30 text-[16px] dark:text-white pl-3'
                            }
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
      {priceData.interval === 'month' && (
        <p className="text-gray-60">
          {translate('checkout.productCard.annualBillingTemplate', {
            priceNow: totalAmountFormatted,
            price: normalPriceAmount,
            currency: currencySymbol,
          })}
        </p>
      )}
    </div>
  );
};

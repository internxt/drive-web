import { useState } from 'react';
import { Transition } from '@headlessui/react';
import { UserType } from '@internxt/sdk/dist/drive/payments/types/types';
import { Check, SealPercent, X } from '@phosphor-icons/react';

import { bytesToString } from '../../../drive/services/size.service';
import { useTranslationContext } from '../../../i18n/provider/TranslationProvider';
import TextInput from '../../../share/components/ShareItemDialog/components/TextInput';
import { Button } from '@internxt/ui';
import { useThemeContext } from '../../../theme/ThemeProvider';
import { ReactComponent as GuaranteeDarkDays } from 'assets/icons/checkout/guarantee-dark.svg';
import { ReactComponent as GuaranteeWhiteDays } from 'assets/icons/checkout/guarantee-white.svg';
import { CouponCodeData, Currency } from '../../types';
import { SelectSeatsComponent } from './SelectSeatsComponent';
import { getProductAmount } from 'app/payment/utils/getProductAmount';
import { PriceWithTax } from '@internxt/sdk/dist/payments/types';

interface CheckoutProductCardProps {
  selectedPlan: PriceWithTax;
  seatsForBusinessSubscription: number;
  showCouponCode: boolean;
  showHardcodedRenewal?: string;
  onSeatsChange: (users: number) => void;
  onRemoveAppliedCouponCode: () => void;
  onCouponInputChange: (promoCode: string) => void;
  couponCodeData?: CouponCodeData;
  couponError?: string;
}

const Separator = () => <div className="border border-gray-10" />;

const getTextContent = (
  users: number,
  isBusiness: boolean,
  bytes: string,
  selectedPlan: PriceWithTax,
  translate: (key: string, props?: Record<string, unknown>) => string,
  translateList: (key: string, props?: Record<string, unknown>) => string[],
) => {
  const perUserLabel = isBusiness ? translate('checkout.productCard.perUser') : undefined;
  const totalLabel = isBusiness
    ? translate('checkout.productCard.totalForBusiness', {
        N: users,
      })
    : translate('checkout.productCard.total');
  const features = translateList(
    `checkout.productCard.planDetails.features.${selectedPlan.price.type ?? UserType.Individual}`,
    {
      spaceToUpgrade: bytes,
      minimumSeats: selectedPlan.price?.minimumSeats,
      maximumSeats: selectedPlan.price?.maximumSeats,
    },
  );

  return {
    perUserLabel,
    totalLabel,
    features,
  };
};

export const CheckoutProductCard = ({
  selectedPlan,
  couponCodeData,
  showCouponCode,
  showHardcodedRenewal,
  couponError,
  seatsForBusinessSubscription,
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

  const isBusiness = selectedPlan.price.type === UserType.Business;
  const textContent = getTextContent(
    seatsForBusinessSubscription,
    isBusiness,
    bytes,
    selectedPlan,
    translate,
    translateList,
  );
  const renewalPeriodLabel = `${translate('checkout.productCard.renewalPeriod.renewsAt')}
          ${currencySymbol}${normalPriceAmount}/${translate(
            `checkout.productCard.renewalPeriod.${selectedPlan.price.interval}`,
          )}`;

  const planAmountWithoutTaxes = getProductAmount(selectedPlan.price.decimalAmount, 1, couponCodeData);
  const totalAmountWithTaxes = getProductAmount(
    selectedPlan.taxes.decimalAmountWithTax,
    seatsForBusinessSubscription,
    couponCodeData,
  );

  const discountPercentage =
    couponCodeData?.amountOff && couponCodeData?.amountOff < selectedPlan.taxes.amountWithTax
      ? ((couponCodeData?.amountOff / selectedPlan.taxes.amountWithTax) * 100).toFixed(2)
      : undefined;

  const COMING_SOON_FEATURE_KEYS = ['feature10', 'feature11'];

  const getPlanTypeLabels = () => ({
    FREE: translate('preferences.account.plans.types.free'),
    ESSENTIAL: translate('preferences.account.plans.types.essential'),
    STANDARD: translate('preferences.account.plans.types.standard'),
    PRO: translate('preferences.account.plans.types.pro'),
    PREMIUM: translate('preferences.account.plans.types.premium'),
    ULTIMATE: translate('preferences.account.plans.types.ultimate'),
  });

  const getCheckoutFeatures = () => ({
    ESSENTIAL: translate('checkout.productCard.planDetails.features.individuals.1TB', { returnObjects: true }),
    STANDARD: translate('checkout.productCard.planDetails.features.business.1TB', { returnObjects: true }),
    PRO: translate('checkout.productCard.planDetails.features.business.2TB', { returnObjects: true }),
    PREMIUM: translate('checkout.productCard.planDetails.features.individuals.3TB', { returnObjects: true }),
    ULTIMATE: translate('checkout.productCard.planDetails.features.individuals.5TB', { returnObjects: true }),
  });

  const getPlanByBytes = (map: any) => {
    if (bytes === '1TB') {
      return isBusiness ? map.STANDARD : map.ESSENTIAL;
    }

    const capacityToKey = {
      '2TB': 'PRO',
      '3TB': 'PREMIUM',
      '5TB': 'ULTIMATE',
    };

    return map[capacityToKey[bytes]] || map.FREE;
  };

  console.log('selectedPlan', { selectedPlan });

  const getPlanLabelFeaturePath = () => {
    if (couponCodeData?.codeName === 'PCCOMPONENTES') {
      return bytes;
    }

    const planLabels = getPlanTypeLabels();
    return getPlanByBytes(planLabels);
  };

  const getPlanFeaturesPath = () => {
    const featureMap = getCheckoutFeatures();
    return getPlanByBytes(featureMap);
  };

  const planFeatures = getPlanFeaturesPath();

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
            {getPlanLabelFeaturePath() +
              ' - ' +
              translate(`checkout.productCard.renewalTitle.${selectedPlan.price.interval}`)}
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
              {textContent.perUserLabel}
            </p>
            <p className="font-semibold">
              {currencySymbol}
              {planAmountWithoutTaxes}
            </p>
          </div>

          <div className="flex flex-row items-center justify-between text-gray-100">
            <p className="font-medium">Taxes</p>
            <p className="font-semibold">
              {currencySymbol}
              {selectedPlan.taxes.decimalTax}
            </p>
          </div>
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
            <p className="font-medium text-gray-100">{translate('checkout.productCard.planDetails.title')}</p>
            <div className="flex flex-col space-y-4">
              {Object.keys(planFeatures).map((key) => {
                const shouldShowComingSoon = !isBusiness && COMING_SOON_FEATURE_KEYS.includes(key);
                const featureText = planFeatures[key];
                return (
                  <div key={key} className="flex flex-row items-center space-x-2">
                    <Check className="text-green-dark" size={16} weight="bold" />
                    <p className="text-gray-100">{featureText}</p>
                    {shouldShowComingSoon && (
                      <span className="rounded-md bg-orange/10 px-1 text-center text-orange">
                        {translate('checkout.productCard.planDetails.commingSoon')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <Separator />
          <div className="flex flex-row items-center justify-between text-2xl font-semibold text-gray-100">
            <p>{textContent.totalLabel}</p>
            <p>
              {currencySymbol}
              {totalAmountWithTaxes}
            </p>
          </div>

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
